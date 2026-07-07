const { formatDateDMY, formatDateTimeDMY } = require('./dateFormat');

const LEAD_ORIGEN = 'Solitud_demo';
const LEAD_ESTADO = 'nuevo';

const LEAD_SHEET_COLUMNS = [
  'agente',
  'fecha_solicitud',
  'fecha_demo',
  'nombre',
  'email',
  'telefono',
  'empresa',
  'num_empleados',
  'origen',
  'estado_lead',
  'consentimiento_rgpd',
];

const normalizeLeadField = (value) => {
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (value == null) return '';
  return String(value);
};

const buildFechaDemoForSheet = (lead = {}) => {
  if (lead.fecha_demo_legible) return lead.fecha_demo_legible;
  if (lead.hora_demo) return formatDateTimeDMY(lead.fecha_demo, lead.hora_demo);
  return formatDateDMY(lead.fecha_demo, lead.demo_zona_horaria || 'Europe/Madrid');
};

const buildLeadPayload = (lead = {}) => {
  const timeZone = lead.demo_zona_horaria || 'Europe/Madrid';

  const payload = {
    agente: lead.agente || '',
    fecha_solicitud: formatDateDMY(lead.fecha_registro || new Date(), timeZone),
    fecha_demo: buildFechaDemoForSheet(lead),
    hora_demo: lead.hora_demo || '',
    nombre: lead.nombre || '',
    email: lead.email || '',
    telefono: lead.telefono || '',
    empresa: lead.empresa || '',
    num_empleados: lead.num_empleados || '',
    origen: LEAD_ORIGEN,
    estado_lead: LEAD_ESTADO,
    consentimiento_rgpd: lead.consentimiento_rgpd ?? true,
  };

  payload.sheet_row = LEAD_SHEET_COLUMNS.map((key) => normalizeLeadField(payload[key]));

  return payload;
};

module.exports = {
  LEAD_ORIGEN,
  LEAD_ESTADO,
  LEAD_SHEET_COLUMNS,
  buildLeadPayload,
};
