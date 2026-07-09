const MS_DIA = 24 * 60 * 60 * 1000;

const toDateOnly = (value) => {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

/** Día de aniversario en un mes (p. ej. 31 → último día en febrero). */
const anchorInMonth = (year, monthIndex, anchorDay) => {
  const day = Math.min(anchorDay, daysInMonth(year, monthIndex));
  return new Date(year, monthIndex, day, 0, 0, 0, 0);
};

const addMonthsClamped = (date, months) => {
  const base = toDateOnly(date);
  if (!base) return null;
  const anchorDay = base.getDate();
  const d = new Date(base);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(anchorDay, daysInMonth(d.getFullYear(), d.getMonth())));
  return d;
};

const addYearsClamped = (date, years, anchorDay) => {
  const base = toDateOnly(date);
  if (!base) return null;
  const day = anchorDay ?? base.getDate();
  const d = new Date(base);
  d.setFullYear(d.getFullYear() + years);
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
  return d;
};

/**
 * Periodo legacy anclado a m_empresas.fecha_alta.
 * - anual: aniversario (mismo mes/día que el alta)
 * - mensual: mismo día de cada mes
 */
const calcularPeriodoLegacy = (
  fechaAlta,
  ciclo = 'anual',
  referencia = new Date(),
) => {
  const alta = toDateOnly(fechaAlta);
  const ref = toDateOnly(referencia);
  if (!alta || !ref) {
    return { start: null, end: null, anchorDay: null };
  }

  const anchorDay = alta.getDate();
  const anchorMonth = alta.getMonth();

  if (ciclo === 'anual') {
    let year = ref.getFullYear();
    let start = anchorInMonth(year, anchorMonth, anchorDay);
    if (start > ref) {
      start = anchorInMonth(year - 1, anchorMonth, anchorDay);
    }
    const end = anchorInMonth(start.getFullYear() + 1, anchorMonth, anchorDay);
    return { start, end, anchorDay };
  }

  let year = ref.getFullYear();
  let month = ref.getMonth();

  let start = anchorInMonth(year, month, anchorDay);
  if (start > ref) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    start = anchorInMonth(year, month, anchorDay);
  }

  const end = addMonthsClamped(start, 1);
  return { start, end, anchorDay };
};

const periodoLegacyVigente = (periodStart, periodEnd, referencia = new Date()) => {
  const start = toDateOnly(periodStart);
  const end = toDateOnly(periodEnd);
  const ref = toDateOnly(referencia);
  if (!start || !end || !ref) return false;
  return ref.getTime() >= start.getTime() && ref.getTime() < end.getTime();
};

/** Días restantes en el periodo (para prorrateos). */
const diasRestantesPeriodo = (periodEnd, referencia = new Date()) => {
  const end = toDateOnly(periodEnd);
  const ref = toDateOnly(referencia);
  if (!end || !ref) return 0;
  return Math.max(0, Math.ceil((end.getTime() - ref.getTime()) / MS_DIA));
};

const duracionPeriodoDias = (periodStart, periodEnd) => {
  const start = toDateOnly(periodStart);
  const end = toDateOnly(periodEnd);
  if (!start || !end) return 0;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_DIA));
};

module.exports = {
  calcularPeriodoLegacy,
  periodoLegacyVigente,
  diasRestantesPeriodo,
  duracionPeriodoDias,
};
