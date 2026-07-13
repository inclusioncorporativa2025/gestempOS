const { formatDateDMY, formatDateTimeDMY } = require('./dateFormat');

const LEAD_ORIGEN = 'Solitud_demo';
const LEAD_ESTADO = 'nuevo';

const LEAD_SHEET_COLUMNS = [
  'agente',
  'fecha_solicitud',
  'fecha_demo',
  'hora_demo',
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

/** Prefijo ' para que Google Sheets no convierta fechas/teléfonos a número serial. */
const asSheetText = (value) => {
  const text = normalizeLeadField(value);
  if (!text) return text;
  return text.startsWith("'") ? text : `'${text}`;
};

const buildFechaDemoForSheet = (lead = {}) => {
  if (lead.fecha_demo_legible) return lead.fecha_demo_legible;
  if (lead.hora_demo) return formatDateTimeDMY(lead.fecha_demo, lead.hora_demo);
  return formatDateDMY(lead.fecha_demo, lead.demo_zona_horaria || 'Europe/Madrid');
};

const resolveFechaHoraDemo = (lead = {}, timeZone = 'Europe/Madrid') => {
  let fechaRaw = lead.fecha_demo;
  let hora = String(lead.hora_demo || '').trim();

  if (fechaRaw && String(fechaRaw).includes('T') && !hora) {
    try {
      const date = new Date(fechaRaw);
      if (!Number.isNaN(date.getTime())) {
        hora = new Intl.DateTimeFormat('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: lead.demo_zona_horaria || timeZone,
        }).format(date);
        return {
          fecha: formatDateDMY(date, timeZone),
          hora,
        };
      }
    } catch {
      // noop
    }
  }

  return {
    fecha: formatDateDMY(fechaRaw, timeZone),
    hora,
  };
};

const buildLeadPayload = (lead = {}) => {
  const timeZone = lead.demo_zona_horaria || 'Europe/Madrid';
  const { fecha: fechaDemo, hora: horaDemo } = resolveFechaHoraDemo(lead, timeZone);

  const payload = {
    agente: lead.agente || '',
    fecha_solicitud: asSheetText(formatDateDMY(lead.fecha_registro || new Date(), timeZone)),
    fecha_demo: asSheetText(fechaDemo),
    hora_demo: horaDemo ? asSheetText(horaDemo) : '',
    nombre: lead.nombre || '',
    email: lead.email || '',
    telefono: asSheetText(lead.telefono || ''),
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
  buildFechaDemoForSheet,
  resolveFechaHoraDemo,
};
