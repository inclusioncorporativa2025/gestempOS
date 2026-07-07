const toBrevoDate = (value) => {
  if (!value) return undefined;

  const str = String(value).trim();
  const isoPart = str.split('T')[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) {
    return isoPart;
  }

  const dmyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month}-${day}`;
  }

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // noop
  }

  return undefined;
};

const splitFullName = (fullName = '') => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { nombre: '', apellidos: '' };
  }
  if (parts.length === 1) {
    return { nombre: parts[0], apellidos: '' };
  }
  return {
    nombre: parts[0],
    apellidos: parts.slice(1).join(' '),
  };
};

const resolveNameParts = ({ nombre, apellidos, leadNombre }) => {
  const cleanNombre = String(nombre || '').trim();
  const cleanApellidos = String(apellidos || '').trim();

  if (cleanNombre || cleanApellidos) {
    return { nombre: cleanNombre, apellidos: cleanApellidos };
  }

  return splitFullName(leadNombre);
};

const mapLeadToBrevoContact = (lead = {}, context = {}) => {
  const { nombre, apellidos } = resolveNameParts({
    nombre: context.nombre,
    apellidos: context.apellidos,
    leadNombre: lead.nombre,
  });

  const rawLead = context.rawLead || {};
  const utm = context.utm || {};

  const fechaDemo = toBrevoDate(rawLead.fecha_demo || lead.fecha_demo);
  const fechaSolicitud = toBrevoDate(rawLead.fecha_registro || lead.fecha_solicitud || new Date());

  const attributes = {
    NOMBRE: nombre,
    APELLIDOS: apellidos,
    SMS: lead.telefono || '',
    ORIGEN: lead.origen || 'Solitud_demo',
    TIME_TIPO_NEGOCIO: lead.empresa || '',
    TIME_NUM_EMPLEADOS: lead.num_empleados || '',
    TIME_HORA_DEMO: lead.hora_demo || rawLead.hora_demo || '',
    TIME_ESTADO_LEAD: lead.estado_lead || 'nuevo',
    TIME_CONSENT_RGPD: lead.consentimiento_rgpd === true ? 'true' : 'false',
  };

  if (fechaDemo) {
    attributes.TIME_FECHA_DEMO = fechaDemo;
  }

  if (fechaSolicitud) {
    attributes.TIME_FECHA_SOLICITUD = fechaSolicitud;
  }

  return {
    email: String(lead.email || '').trim().toLowerCase(),
    attributes: Object.fromEntries(
      Object.entries(attributes).filter(([, value]) => value !== ''),
    ),
  };
};

const mapLeadToDemoSolicitadaEvent = (lead = {}, context = {}) => {
  const utm = context.utm || {};

  return {
    fecha_demo: lead.fecha_demo || '',
    hora_demo: lead.hora_demo || '',
    tipo_negocio: lead.empresa || '',
    num_empleados: lead.num_empleados || '',
    origen: lead.origen || 'Solitud_demo',
    estado_lead: lead.estado_lead || 'nuevo',
    utm_source: utm.utm_source || '',
    utm_medium: utm.utm_medium || '',
    utm_campaign: utm.utm_campaign || '',
  };
};

module.exports = {
  mapLeadToBrevoContact,
  mapLeadToDemoSolicitadaEvent,
  toBrevoDate,
};
