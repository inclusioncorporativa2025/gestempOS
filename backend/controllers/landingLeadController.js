const { buildLeadPayload } = require('../utils/leadPayload');
const {
  mapCalendlyBookingToLead,
  mapCalendlyWebhookPayloadToLead,
} = require('../utils/calendlyLeadMapper');
const { isConfigured, sendLeadToMake } = require('../services/makeLeadService');

const getClientIp = (req) => (
  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  || req.socket?.remoteAddress
  || ''
);

const enviarLeadAMake = async (lead, source) => {
  if (!lead.email) {
    const error = new Error('El email es obligatorio');
    error.code = 'LEAD_SIN_EMAIL';
    throw error;
  }

  await sendLeadToMake(lead);
  console.log(`[landing/${source}] Lead enviado a Make:`, lead.email, lead.fecha_demo_legible || lead.fecha_demo);
};

const landingStatus = (req, res) => {
  res.status(200).json({
    ok: true,
    make: isConfigured(),
    endpoints: {
      demoLead: 'POST /api/landing/demo-lead',
      calendlyWebhook: 'POST /api/landing/calendly-webhook',
    },
  });
};

const registrarDemoLead = async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Integración Make no configurada' });
  }

  const { invitee, event, tracking, origen, evento, utm } = req.body || {};

  if (!invitee?.email && !req.body?.email) {
    return res.status(400).json({ message: 'Faltan datos de la reserva' });
  }

  const lead = buildLeadPayload(
    invitee?.email
      ? mapCalendlyBookingToLead({
        invitee,
        event: event || {},
        tracking: { ...(tracking || {}), ...(utm || {}) },
        origen: origen || 'landing_timecor',
        evento: evento || 'demo_solicitada',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
      })
      : req.body,
  );

  try {
    await enviarLeadAMake(lead, 'demo-lead');
    return res.status(200).json({ message: 'Lead enviado a Make', lead });
  } catch (error) {
    console.error('[landing/demo-lead]', error.message);
    return res.status(error.code === 'LEAD_SIN_EMAIL' ? 400 : 502).json({
      message: error.code === 'LEAD_SIN_EMAIL'
        ? 'El email es obligatorio'
        : 'No se pudo registrar el lead en Make',
    });
  }
};

const handleCalendlyWebhook = async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Integración Make no configurada' });
  }

  const eventType = req.body?.event;

  if (eventType === 'invitee.canceled') {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const lead = buildLeadPayload(mapCalendlyWebhookPayloadToLead(req.body, {
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'calendly-webhook',
  }));

  if (!lead.email) {
    console.warn('[landing/calendly-webhook] Payload sin email:', JSON.stringify(req.body)?.slice(0, 500));
    return res.status(400).json({ message: 'Payload Calendly sin email' });
  }

  try {
    await enviarLeadAMake(lead, 'calendly-webhook');
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[landing/calendly-webhook]', error.message);
    return res.status(502).json({ message: 'No se pudo enviar el lead a Make' });
  }
};

module.exports = {
  landingStatus,
  registrarDemoLead,
  handleCalendlyWebhook,
};
