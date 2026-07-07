const formatDateDMY = (value, timeZone = 'Europe/Madrid') => {
  if (!value) return '';

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    const parts = new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone,
    }).formatToParts(date);

    const get = (type) => parts.find((part) => part.type === type)?.value || '';
    return `${get('day')}/${get('month')}/${get('year')}`;
  } catch {
    return String(value);
  }
};

const formatDateTimeDMY = (dateStr, timeStr = '') => {
  if (!dateStr) return '';

  const cleanDate = String(dateStr).split('T')[0];
  const isoMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const time = String(timeStr || '').trim();

  if (isoMatch && time) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year} ${time}`;
  }

  const formattedDate = formatDateDMY(dateStr);
  return time ? `${formattedDate} ${time}` : formattedDate;
};

module.exports = {
  formatDateDMY,
  formatDateTimeDMY,
};
