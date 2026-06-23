export const TIPO_HORA_INHERIT = 'inherit';
export const TIPO_HORA_BOLSA = 3;

export const etiquetaTipoHora = (tipoHora) => {
  const n = Number(tipoHora);
  if (n === 1) return 'Extra';
  if (n === 2) return 'Complementaria';
  if (n === 3) return 'Bolsa de horas';
  return 'Heredar de la jornada';
};

export const opcionesTipoHora = [
  { value: TIPO_HORA_INHERIT, label: 'Heredar de la jornada' },
  { value: '1', label: 'Extra' },
  { value: '2', label: 'Complementaria' },
  { value: '3', label: 'Bolsa de horas' },
];

export const tipoHoraFormValue = (tipoHora) => {
  if (tipoHora == null || tipoHora === '') return TIPO_HORA_INHERIT;
  return String(tipoHora);
};
