import { planIncluyeFeature } from './plans';

export const TIPO_AUSENCIA_VACACIONES = 'Vacaciones';

export const TIPOS_AUSENCIA_BASE = [
  'Baja médica / IT',
  'Accidente laboral',
  'Maternidad / Paternidad / Cuidado',
  'Permiso retribuido',
  'Permiso no retribuido',
  'Formación',
  'Otros',
];

export const TIPOS_AUSENCIA_TAG = {
  [TIPO_AUSENCIA_VACACIONES]: { label: TIPO_AUSENCIA_VACACIONES, color: 'blue' },
  'Baja médica / IT': { label: 'Baja médica / IT', color: 'red' },
  'Accidente laboral': { label: 'Accidente laboral', color: 'volcano' },
  'Maternidad / Paternidad / Cuidado': {
    label: 'Maternidad / Paternidad / Cuidado',
    color: 'magenta',
  },
  'Permiso retribuido': { label: 'Permiso retribuido', color: 'cyan' },
  'Permiso no retribuido': { label: 'Permiso no retribuido', color: 'orange' },
  Formación: { label: 'Formación', color: 'geekblue' },
  Otros: { label: 'Otros', color: 'default' },
};

export const getTiposAusenciaSeleccionables = (planId) => {
  if (planIncluyeFeature(planId, 'vacaciones')) {
    return [TIPO_AUSENCIA_VACACIONES, ...TIPOS_AUSENCIA_BASE];
  }
  return [...TIPOS_AUSENCIA_BASE];
};

export const getTiposAusenciaPermitidos = (planId) => getTiposAusenciaSeleccionables(planId);

export const normalizarClaveTipoAusencia = (tipo) =>
  String(tipo || '').trim().toLowerCase();

export const esTipoVacaciones = (tipo) =>
  normalizarClaveTipoAusencia(tipo) === 'vacaciones';

export const esTipoAusenciaPermitido = (tipo, planId) => {
  const valor = String(tipo || '').trim();
  return getTiposAusenciaPermitidos(planId).includes(valor);
};

export const requiereComentarioAusencia = (tipo) =>
  normalizarClaveTipoAusencia(tipo) === 'otros';

/** Vacaciones no exigen justificante para aprobar. */
export const requiereJustificanteParaAprobar = (tipo) =>
  !esTipoVacaciones(tipo);

export const getConfigTipoAusenciaTag = (tipo) => {
  const valor = String(tipo || '').trim();
  return TIPOS_AUSENCIA_TAG[valor] || { label: valor || 'Ausencia', color: 'default' };
};

export const getOpcionesFiltroAusencias = (planId) =>
  getTiposAusenciaSeleccionables(planId).map((value) => ({ value, label: value }));

const ETIQUETAS_CALENDARIO = {
  [TIPO_AUSENCIA_VACACIONES]: 'vacaciones',
  'Baja médica / IT': 'baja médica',
  'Accidente laboral': 'accidente laboral',
  'Maternidad / Paternidad / Cuidado': 'permiso parental',
  'Permiso retribuido': 'permiso retribuido',
  'Permiso no retribuido': 'permiso no retribuido',
  Formación: 'formación',
  Otros: 'ausencia',
};

export const etiquetaAusenciaCalendario = (tipo) => {
  const valor = String(tipo || '').trim();
  return ETIQUETAS_CALENDARIO[valor] || 'ausencia';
};
