import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Instante actual (el servidor normaliza a hora de pared Madrid al guardar) */
export function getFechaEuropeMadrid() {
    return dayjs().tz('Europe/Madrid').toDate();
}
