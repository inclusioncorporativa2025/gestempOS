import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const ZONA = 'Europe/Madrid';

/** Debe coincidir con `timezone` en backend/config/db.js (Sequelize + MySQL) */
const SEQUELIZE_MYSQL_OFFSET_H = 2;

/**
 * Convierte el ISO UTC que devuelve Sequelize a la hora de pared guardada en MySQL
 * (la misma que ves en SELECT fecha_entrada FROM fichajes).
 */
function parseDesdeIsoSequelize(value) {
  const enUtc = dayjs.utc(value);
  if (!enUtc.isValid()) return null;

  const pared = enUtc.add(SEQUELIZE_MYSQL_OFFSET_H, 'hour');
  return dayjs.tz(
    pared.format('YYYY-MM-DD HH:mm:ss'),
    'YYYY-MM-DD HH:mm:ss',
    ZONA,
  );
}

/** Fecha/hora de fichaje del API → hora de pared España (como en MySQL) */
export function parseFechaFichaje(fecha) {
  if (fecha == null || fecha === '') return null;

  if (typeof fecha === 'string') {
    const trimmed = fecha.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)) {
      const d = dayjs.tz(trimmed.slice(0, 19), 'YYYY-MM-DD HH:mm:ss', ZONA);
      return d.isValid() ? d : null;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return parseDesdeIsoSequelize(trimmed);
    }
  }

  if (fecha instanceof Date) {
    return parseDesdeIsoSequelize(fecha);
  }

  const d = dayjs(fecha).tz(ZONA);
  return d.isValid() ? d : null;
}

export function formatHoraFichaje(fecha) {
  const d = parseFechaFichaje(fecha);
  return d ? d.format('HH:mm') : '';
}

export function formatFechaFichaje(fecha) {
  const d = parseFechaFichaje(fecha);
  return d ? d.format('DD/MM/YYYY') : '';
}
