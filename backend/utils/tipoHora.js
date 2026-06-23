const TIPOS_HORA = {
  EXTRA: 1,
  COMPLEMENTARIA: 2,
  BOLSA: 3,
};

const etiquetaTipoHora = (tipoHora) => {
  const n = Number(tipoHora);
  if (n === TIPOS_HORA.EXTRA) return 'Extra';
  if (n === TIPOS_HORA.COMPLEMENTARIA) return 'Complementaria';
  if (n === TIPOS_HORA.BOLSA) return 'Bolsa de horas';
  return 'Sin configurar';
};

/** null | '' | 'inherit' | 0 → heredar de jornada */
const normalizarTipoHoraInput = (value) => {
  if (value == null || value === '' || value === 'inherit' || value === 0 || value === '0') {
    return null;
  }
  const n = Number(value);
  if ([TIPOS_HORA.EXTRA, TIPOS_HORA.COMPLEMENTARIA, TIPOS_HORA.BOLSA].includes(n)) {
    return n;
  }
  return null;
};

const formatearMinutos = (minutos) => {
  const total = Math.max(0, Math.round(Number(minutos) || 0));
  const horas = Math.floor(total / 60);
  const mins = total % 60;
  return {
    minutos: total,
    texto: `${horas}h ${mins}m`,
  };
};

const formatearMinutosConSigno = (minutos) => {
  const n = Math.round(Number(minutos) || 0);
  const signo = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const horas = Math.floor(abs / 60);
  const mins = abs % 60;
  return `${signo}${horas}h ${mins}m`;
};

module.exports = {
  TIPOS_HORA,
  etiquetaTipoHora,
  normalizarTipoHoraInput,
  formatearMinutos,
  formatearMinutosConSigno,
};
