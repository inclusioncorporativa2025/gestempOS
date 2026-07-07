const { formatDateDMY, formatDateTimeDMY } = require('./dateFormat');

const formatDemoDateTimeLegible = (dateStr, timeStr) => (
  formatDateTimeDMY(dateStr, timeStr)
);
const mapDemoFormToLead = ({
  nombre = '',
  apellidos = '',
  email = '',
  telefono = '',
  tipo_negocio = '',
  num_empleados = '',
  fecha_demo = '',
  hora_demo = '',
  mensaje = '',
  utm = {},
  ip = '',
  userAgent = '',
  consentimiento_rgpd = true,
}) => {
  const fullName = [nombre, apellidos].filter(Boolean).join(' ').trim();

  return {
    fecha_registro: new Date().toISOString(),
    fecha_demo: fecha_demo || '',
    hora_demo: String(hora_demo).trim(),
    fecha_demo_legible: formatDemoDateTimeLegible(fecha_demo, hora_demo),
    demo_zona_horaria: 'Europe/Madrid',
    nombre: fullName,
    email: String(email).trim(),
    telefono: String(telefono).trim(),
    empresa: String(tipo_negocio).trim(),
    num_empleados: String(num_empleados).trim(),
    mensaje: String(mensaje).trim(),
    utm_source: utm.utm_source || '',
    utm_medium: utm.utm_medium || '',
    utm_campaign: utm.utm_campaign || '',
    consentimiento_rgpd: Boolean(consentimiento_rgpd),
    ip: ip || '',
    user_agent: userAgent || '',
  };
};

module.exports = {
  mapDemoFormToLead,
};
