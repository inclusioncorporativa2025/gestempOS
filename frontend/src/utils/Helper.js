import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Instante actual (UTC correcto) al fichar; el backend lo persiste en hora España */
export function getFechaEuropeMadrid() {
  return dayjs().tz('Europe/Madrid').toDate();
}
