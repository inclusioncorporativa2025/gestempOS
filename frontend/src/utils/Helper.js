import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Instante UTC correcto al fichar (compatible con Sequelize timezone +02:00) */
export function getFechaEuropeMadrid() {
  return dayjs().tz('Europe/Madrid').toDate();
}
