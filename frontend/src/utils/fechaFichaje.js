import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const ZONA = 'Europe/Madrid';
const FORMAT = 'YYYY-MM-DD HH:mm:ss';

const NAIVE_MYSQL_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;

function parseComoMadrid(fecha) {
  if (fecha == null || fecha === '') return null;

  if (typeof fecha === 'string') {
    const trimmed = fecha.trim();
    if (NAIVE_MYSQL_RE.test(trimmed)) {
      const d = dayjs.tz(trimmed.slice(0, 19), FORMAT, ZONA);
      return d.isValid() ? d : null;
    }
  }

  const d = dayjs(fecha);
  if (!d.isValid()) return null;
  return d.tz(ZONA);
}

/** Instante del fichaje (cronómetros, duraciones) */
export function parseInstanteFichaje(fecha) {
  return parseComoMadrid(fecha);
}

/** Hora de pared del fichaje (listados, igual que MySQL) */
export function parseFechaFichaje(fecha) {
  return parseComoMadrid(fecha);
}

export function formatHoraFichaje(fecha) {
  const d = parseFechaFichaje(fecha);
  return d ? d.format('HH:mm') : '';
}

export function formatFechaFichaje(fecha) {
  const d = parseFechaFichaje(fecha);
  return d ? d.format('DD/MM/YYYY') : '';
}
