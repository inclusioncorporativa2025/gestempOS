const { formatDateDMY } = require('./dateFormat');

const LEAD_SHEET_COLUMNS = [
  'fecha_registro',
  'fecha_demo',
  'fecha_demo_legible',
  'fecha_demo_fin',
  'demo_zona_horaria',
  'demo_enlace_cancelar',
  'demo_enlace_reagendar',
  'nombre',
  'email',
  'telefono',
  'empresa',
  'cargo',
  'num_empleados',
  'interes',
  'mensaje',
  'origen',
  'evento',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'estado_lead',
  'consentimiento_rgpd',
  'ip',
  'user_agent',
  'make_execution_id',
];

const normalizeLeadField = (value) => {
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (value == null) return '';
  return String(value);
};

const buildLeadPayload = (lead = {}) => {
  const timeZone = lead.demo_zona_horaria || 'Europe/Madrid';

  const payload = {
    fecha_registro: formatDateDMY(lead.fecha_registro || new Date(), timeZone),
    fecha_demo: formatDateDMY(lead.fecha_demo, timeZone),
    fecha_demo_legible: lead.fecha_demo_legible || '',
    fecha_demo_fin: formatDateDMY(lead.fecha_demo_fin, timeZone),
    demo_zona_horaria: timeZone,
    demo_enlace_cancelar: lead.demo_enlace_cancelar || '',
    demo_enlace_reagendar: lead.demo_enlace_reagendar || '',
    nombre: lead.nombre || '',
    email: lead.email || '',
    telefono: lead.telefono || '',
    empresa: lead.empresa || '',
    cargo: lead.cargo || '',
    num_empleados: lead.num_empleados || '',
    interes: lead.interes || '',
    mensaje: lead.mensaje || '',
    origen: lead.origen || 'landing_timecor',
    evento: lead.evento || 'demo_solicitada',
    utm_source: lead.utm_source || '',
    utm_medium: lead.utm_medium || '',
    utm_campaign: lead.utm_campaign || '',
    estado_lead: lead.estado_lead || 'nuevo',
    consentimiento_rgpd: lead.consentimiento_rgpd ?? true,
    ip: lead.ip || '',
    user_agent: lead.user_agent || '',
    make_execution_id: lead.make_execution_id || '',
  };

  payload.sheet_row = LEAD_SHEET_COLUMNS.map((key) => normalizeLeadField(payload[key]));

  return payload;
};

module.exports = {
  LEAD_SHEET_COLUMNS,
  buildLeadPayload,
};
