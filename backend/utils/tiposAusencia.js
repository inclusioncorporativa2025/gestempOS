const TIPO_AUSENCIA_VACACIONES = 'Vacaciones';

const TIPOS_AUSENCIA_BASE = [
  'Baja médica / IT',
  'Accidente laboral',
  'Maternidad / Paternidad / Cuidado',
  'Permiso retribuido',
  'Permiso no retribuido',
  'Formación',
  'Otros',
];

const TIPOS_AUSENCIA_TODOS = [TIPO_AUSENCIA_VACACIONES, ...TIPOS_AUSENCIA_BASE];

const normalizarClave = (tipo) => String(tipo || '').trim().toLowerCase();

const esVacaciones = (tipo) => normalizarClave(tipo) === 'vacaciones';

const tiposPermitidosParaEmpresa = (incluyeVacaciones) =>
  incluyeVacaciones ? TIPOS_AUSENCIA_TODOS : [...TIPOS_AUSENCIA_BASE];

const esTipoPermitido = (tipo, { incluyeVacaciones = true } = {}) => {
  const valor = String(tipo || '').trim();
  return tiposPermitidosParaEmpresa(incluyeVacaciones).includes(valor);
};

const requiereComentario = (tipo) => normalizarClave(tipo) === 'otros';

module.exports = {
  TIPO_AUSENCIA_VACACIONES,
  TIPOS_AUSENCIA_BASE,
  TIPOS_AUSENCIA_TODOS,
  esVacaciones,
  esTipoPermitido,
  requiereComentario,
  tiposPermitidosParaEmpresa,
};
