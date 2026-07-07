const { buildLeadPayload } = require('../utils/leadPayload');
const { mapDemoFormToLead } = require('../utils/demoFormMapper');
const {
  mapCalendlyBookingToLead,
  mapCalendlyWebhookPayloadToLead,
} = require('../utils/calendlyLeadMapper');
const { isConfigured, sendLeadToMake } = require('../services/makeLeadService');
const { isConfigured: isBrevoConfigured, syncDemoLeadToBrevo } = require('../services/brevoLeadService');
const {
  isConfigured: isCalendlyApiConfigured,
  resolveBookingFromUris,
} = require('../services/calendlyApiService');

const isFormLeadRequest = (body = {}) => {
  const {
    invitee,
    nombre,
    apellidos,
    email,
    telefono,
    fecha_demo,
    hora_demo,
    consentimiento_rgpd,
    consent,
  } = body;
  const hasConsent = consentimiento_rgpd === true || consent === true;
  return Boolean(
    nombre
    && apellidos
    && email
    && telefono
    && fecha_demo
    && hora_demo
    && hasConsent
    && !invitee?.uri
    && !invitee?.email,
  );
};

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
    brevo: isBrevoConfigured(),
    calendlyApi: isCalendlyApiConfigured(),
    endpoints: {
      demoLead: 'POST /api/landing/demo-lead',
      calendlyWebhook: 'POST /api/landing/calendly-webhook',
    },
  });
};

const resolverDatosReserva = async (invitee, event) => {
  if (invitee?.email) {
    return { invitee, event: event || {} };
  }

  const inviteeUri = invitee?.uri || '';
  const eventUri = event?.uri || '';

  if (!inviteeUri && !eventUri) {
    const error = new Error('Faltan datos de la reserva');
    error.code = 'LEAD_SIN_DATOS';
    throw error;
  }

  if (!isCalendlyApiConfigured()) {
    const error = new Error('CALENDLY_API_TOKEN no configurada');
    error.code = 'CALENDLY_NO_CONFIGURADO';
    throw error;
  }

  const resolved = await resolveBookingFromUris({ inviteeUri, eventUri });
  return {
    invitee: { ...invitee, ...resolved.invitee },
    event: { ...event, ...resolved.event },
  };
};

const registrarDemoLead = async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Integración Make no configurada' });
  }

  const { invitee, event, tracking, origen, evento, utm, ...formFields } = req.body || {};

  const looksLikeForm = Object.prototype.hasOwnProperty.call(req.body || {}, 'nombre')
    || Object.prototype.hasOwnProperty.call(req.body || {}, 'fecha_demo');

  if (looksLikeForm && !isFormLeadRequest(req.body)) {
    return res.status(400).json({
      message: 'Faltan campos obligatorios: nombre, apellidos, email, teléfono, día, hora o consentimiento',
    });
  }

  if (
    !isFormLeadRequest(req.body)
    && !invitee?.email
    && !req.body?.email
    && !invitee?.uri
    && !event?.uri
  ) {
    return res.status(400).json({ message: 'Faltan datos de la reserva' });
  }

  try {
    let lead;
    let brevoContext = { utm: utm || {} };

    if (isFormLeadRequest(req.body)) {
      const rawLead = mapDemoFormToLead({
        ...formFields,
        utm: utm || {},
        origen: origen || 'landing_timecor',
        evento: evento || 'demo_solicitada',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
      });

      lead = buildLeadPayload(rawLead);
      brevoContext = {
        nombre: formFields.nombre,
        apellidos: formFields.apellidos,
        utm: utm || {},
        rawLead,
      };
    } else {
      const resolved = (invitee?.email || req.body?.email)
        ? {
          invitee: invitee?.email
            ? invitee
            : {
              ...invitee,
              email: req.body.email,
              name: req.body.nombre || req.body.name || invitee?.name || '',
            },
          event: event || req.body.event || {},
        }
        : await resolverDatosReserva(invitee, event);

      const rawLead = mapCalendlyBookingToLead({
        invitee: resolved.invitee,
        event: resolved.event,
        tracking: { ...(tracking || {}), ...(utm || {}) },
        origen: origen || 'landing_timecor',
        evento: evento || 'demo_solicitada',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
      });

      lead = buildLeadPayload(rawLead);
      brevoContext = {
        utm: utm || {},
        rawLead,
      };
    }

    await enviarLeadIntegraciones(lead, 'demo-lead', brevoContext);
    return res.status(200).json({ message: 'Lead enviado a Make', lead });
  } catch (error) {
    console.error('[landing/demo-lead]', error.message);

    if (error.code === 'LEAD_SIN_DATOS' || error.code === 'LEAD_SIN_EMAIL') {
      return res.status(400).json({ message: error.message || 'Faltan datos de la reserva' });
    }

    if (error.code === 'CALENDLY_NO_CONFIGURADO') {
      return res.status(503).json({
        message: 'Embed Calendly requiere CALENDLY_API_TOKEN en el servidor',
      });
    }

    if (error.code === 'CALENDLY_API_FAILED' || error.code === 'CALENDLY_SIN_EMAIL') {
      return res.status(502).json({ message: 'No se pudo obtener la reserva desde Calendly' });
    }

    return res.status(502).json({ message: 'No se pudo registrar el lead en Make' });
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

  const rawLead = mapCalendlyWebhookPayloadToLead(req.body, {
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'calendly-webhook',
  });

  const lead = buildLeadPayload(rawLead);

  if (!lead.email) {
    console.warn('[landing/calendly-webhook] Payload sin email:', JSON.stringify(req.body)?.slice(0, 500));
    return res.status(400).json({ message: 'Payload Calendly sin email' });
  }

  try {
    await enviarLeadIntegraciones(lead, 'calendly-webhook', { rawLead });
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
