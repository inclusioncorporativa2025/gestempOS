import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const ZONA = 'Europe/Madrid';

/** Fecha/hora de fichaje del API interpretada en hora de España */
export function parseFechaFichaje(fecha) {
  if (!fecha) return null;

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
