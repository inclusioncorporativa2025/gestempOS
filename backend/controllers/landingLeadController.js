const { buildLeadPayload } = require('../utils/leadPayload');
const { mapCalendlyBookingToLead } = require('../utils/calendlyLeadMapper');
const { isConfigured, sendLeadToMake } = require('../services/makeLeadService');

const getClientIp = (req) => (
  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  || req.socket?.remoteAddress
  || ''
);

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

  if (!lead.email) {
    return res.status(400).json({ message: 'El email es obligatorio' });
  }

  try {
    await sendLeadToMake(lead);
    console.log('[landing/demo-lead] Lead enviado a Make:', lead.email, lead.fecha_demo_legible || lead.fecha_demo);
    return res.status(200).json({ message: 'Lead enviado a Make', lead });
  } catch (error) {
    console.error('Error enviando lead a Make:', error.message);
    return res.status(502).json({ message: 'No se pudo registrar el lead en Make' });
  }
};

module.exports = {
  registrarDemoLead,
};
