import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const ZONA = 'Europe/Madrid';

/**
 * Convierte fechas de fichaje del API a hora local España.
 * MySQL guarda hora de pared; Sequelize usa offset fijo +02:00 y en CET (invierno)
 * el renderizado queda 1h por detrás si se interpreta como UTC puro.
 */
export function parseFechaFichaje(fecha) {
  if (!fecha) return null;

  const d = dayjs(fecha).tz(ZONA);
  if (!d.isValid()) return null;

  // CET = UTC+1 (60 min). Sequelize usa +02:00 fijo y desfasa 1h en invierno.
  if (d.utcOffset() === 60) {
    return d.add(1, 'hour');
  }

  return d;
}

export function formatHoraFichaje(fecha) {
  const d = parseFechaFichaje(fecha);
  return d ? d.format('HH:mm') : '';
}

export function formatFechaFichaje(fecha) {
  const d = parseFechaFichaje(fecha);
  return d ? d.format('DD/MM/YYYY') : '';
}
