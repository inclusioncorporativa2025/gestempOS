const NodeCache = require('node-cache');

const holidaysCache = new NodeCache({ stdTTL: 86400 });

const NAGER_BASE = 'https://date.nager.at/api/v3';

/**
 * Festivos públicos desde Nager.Date (nacionales + autonómicos).
 * @param {number|string} year
 * @param {string} [countryCode]
 * @param {string|null} [regionCode] Código ISO CCAA (p. ej. ES-MD)
 */
const getPublicHolidays = async (year, countryCode = 'ES', regionCode = null) => {
  if (!year || !countryCode) {
    throw new Error('Debe indicar year y countryCode');
  }

  const cacheKey = `${year}:${countryCode}:${regionCode || 'all'}`;
  const cached = holidaysCache.get(cacheKey);
  if (cached) return cached;

  const url = `${NAGER_BASE}/PublicHolidays/${year}/${countryCode}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Nager.Date respondió ${response.status}`);
  }

  const allHolidays = await response.json();

  const filtered = !regionCode
    ? allHolidays
    : allHolidays.filter((holiday) => {
        if (!holiday.counties || holiday.counties.length === 0) return true;
        return holiday.counties.includes(regionCode);
      });

  holidaysCache.set(cacheKey, filtered);
  return filtered;
};

module.exports = { getPublicHolidays };
