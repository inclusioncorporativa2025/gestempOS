const QA_PATTERNS = {
  telefono: [/tel[eé]fono/i, /m[oó]vil/i, /phone/i, /whatsapp/i],
  empresa: [/empresa/i, /organizaci[oó]n/i, /compa[nñ][ií]a/i],
  cargo: [/cargo/i, /puesto/i, /rol/i, /posici[oó]n/i],
  num_empleados: [/empleado/i, /plantilla/i, /trabajador/i, /n[uú]mero de/i, /tamano/i, /tamaño/i],
  mensaje: [/mensaje/i, /comentario/i, /nota/i, /informaci[oó]n adicional/i, /cu[eé]ntanos/i],
};

const findAnswer = (questionsAndAnswers, patterns) => {
  if (!Array.isArray(questionsAndAnswers)) return '';

  for (const item of questionsAndAnswers) {
    const question = String(item?.question || '').toLowerCase();
    if (patterns.some((pattern) => pattern.test(question))) {
      return String(item?.answer || '').trim();
    }
  }

  return '';
};

const formatCalendlyDateTime = (iso, timeZone = 'Europe/Madrid') => {
  if (!iso) return '';

  try {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
};

const mapCalendlyBookingToLead = ({
  invitee = {},
  event = {},
  tracking = {},
  origen = 'landing_timecor',
  evento = 'demo_solicitada',
  ip = '',
  userAgent = '',
  estadoLead = 'nuevo',
}) => {
  const qa = invitee.questions_and_answers || [];
  const utm = {
    ...tracking,
    ...(invitee.tracking || {}),
  };

  const telefono = invitee.text_reminder_number
    || findAnswer(qa, QA_PATTERNS.telefono);

  const demoTimeZone = invitee.timezone || 'Europe/Madrid';
  const fechaDemo = event.start_time || '';
  const fechaDemoFin = event.end_time || '';

  return {
    fecha_registro: invitee.created_at || new Date().toISOString(),
    fecha_demo: fechaDemo,
    fecha_demo_legible: formatCalendlyDateTime(fechaDemo, demoTimeZone),
    fecha_demo_fin: fechaDemoFin,
    demo_zona_horaria: demoTimeZone,
    demo_enlace_cancelar: invitee.cancel_url || '',
    demo_enlace_reagendar: invitee.reschedule_url || '',
    nombre: String(invitee.name || '').trim(),
    email: String(invitee.email || '').trim(),
    telefono,
    empresa: findAnswer(qa, QA_PATTERNS.empresa),
    cargo: findAnswer(qa, QA_PATTERNS.cargo),
    num_empleados: findAnswer(qa, QA_PATTERNS.num_empleados),
    interes: String(event.name || 'Demo Timecor').trim(),
    mensaje: findAnswer(qa, QA_PATTERNS.mensaje),
    origen,
    evento,
    utm_source: utm.utm_source || '',
    utm_medium: utm.utm_medium || '',
    utm_campaign: utm.utm_campaign || '',
    estado_lead: estadoLead,
    consentimiento_rgpd: true,
    ip: ip || '',
    user_agent: userAgent || '',
    make_execution_id: '',
  };
};

const mapCalendlyWebhookPayloadToLead = (body = {}, { ip = '', userAgent = '' } = {}) => {
  const payload = body.payload || body;
  const scheduled = payload.scheduled_event || {};

  return mapCalendlyBookingToLead({
    invitee: {
      email: payload.email,
      name: payload.name,
      created_at: payload.created_at,
      timezone: payload.timezone,
      text_reminder_number: payload.text_reminder_number,
      cancel_url: payload.cancel_url,
      reschedule_url: payload.reschedule_url,
      questions_and_answers: payload.questions_and_answers,
      tracking: payload.tracking,
    },
    event: {
      name: scheduled.name,
      start_time: scheduled.start_time,
      end_time: scheduled.end_time,
    },
    tracking: payload.tracking || {},
    origen: 'calendly_webhook',
    evento: 'demo_solicitada',
    ip,
    userAgent,
  });
};

module.exports = {
  mapCalendlyBookingToLead,
  mapCalendlyWebhookPayloadToLead,
};
