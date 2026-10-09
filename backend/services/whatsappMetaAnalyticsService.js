const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

const { TZ } = require('../utils/registroHash');

dayjs.extend(utc);
dayjs.extend(timezone);

const graphVersion = () => process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
const cloudToken = () => process.env.WHATSAPP_CLOUD_TOKEN || '';
const wabaId = () => process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

const assertConfigured = () => {
  if (!cloudToken() || !wabaId()) {
    const error = new Error(
      'WhatsApp Meta no configurado (WHATSAPP_CLOUD_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID)',
    );
    error.status = 503;
    throw error;
  }
};

const parseDateParam = (raw, fallback) => {
  if (!raw) return fallback;
  const parsed = dayjs.tz(String(raw).trim(), 'YYYY-MM-DD', TZ);
  if (!parsed.isValid()) {
    const error = new Error('Fecha inválida; use YYYY-MM-DD');
    error.status = 400;
    throw error;
  }
  return parsed;
};

/** Rango [startUnix, endUnix] para Graph pricing_analytics (inclusive por día Meta). */
const resolvePeriod = ({ from, to } = {}) => {
  const now = dayjs().tz(TZ);
  const startDay = parseDateParam(from, now.startOf('month'));
  const endDay = parseDateParam(to, now.endOf('month').startOf('day'));

  if (endDay.isBefore(startDay, 'day')) {
    const error = new Error('La fecha "to" debe ser posterior o igual a "from"');
    error.status = 400;
    throw error;
  }

  const startUnix = startDay.startOf('day').unix();
  const endUnix = endDay.add(1, 'day').startOf('day').unix();

  return {
    from: startDay.format('YYYY-MM-DD'),
    to: endDay.format('YYYY-MM-DD'),
    startUnix,
    endUnix,
  };
};

const fetchPricingAnalyticsRaw = async ({ startUnix, endUnix }) => {
  assertConfigured();

  const fields = [
    'pricing_analytics',
    `.start(${startUnix})`,
    `.end(${endUnix})`,
    '.granularity(DAILY)',
    '.phone_numbers([])',
    '.dimensions(["PRICING_CATEGORY","PRICING_TYPE"])',
  ].join('');

  const url = `https://graph.facebook.com/${graphVersion()}/${wabaId()}?fields=${encodeURIComponent(fields)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${cloudToken()}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || `Graph API ${response.status}`;
    const error = new Error(message);
    error.status = response.status === 401 || response.status === 403 ? 502 : response.status;
    error.details = data?.error;
    throw error;
  }

  return data;
};

const roundCost = (n) => Math.round(Number(n) * 1_000_000) / 1_000_000;

const aggregatePricingAnalytics = (graphPayload) => {
  const blocks = graphPayload?.pricing_analytics?.data || [];
  const points = [];

  for (const block of blocks) {
    for (const pt of block?.data_points || []) {
      points.push(pt);
    }
  }

  let totalCost = 0;
  let totalVolume = 0;
  const breakdownMap = new Map();
  const dailyMap = new Map();

  for (const pt of points) {
    const cost = Number(pt.cost) || 0;
    const volume = Number(pt.volume) || 0;
    totalCost += cost;
    totalVolume += volume;

    const cat = pt.pricing_category || 'UNKNOWN';
    const typ = pt.pricing_type || 'UNKNOWN';
    const bk = `${cat}|${typ}`;
    const prev = breakdownMap.get(bk) || { pricing_category: cat, pricing_type: typ, volume: 0, cost: 0 };
    prev.volume += volume;
    prev.cost = roundCost(prev.cost + cost);
    breakdownMap.set(bk, prev);

    const dayKey = pt.start
      ? dayjs.unix(Number(pt.start)).tz(TZ).format('YYYY-MM-DD')
      : 'unknown';
    const dailyPrev = dailyMap.get(dayKey) || { date: dayKey, volume: 0, cost: 0 };
    dailyPrev.volume += volume;
    dailyPrev.cost = roundCost(dailyPrev.cost + cost);
    dailyMap.set(dayKey, dailyPrev);
  }

  const breakdown = [...breakdownMap.values()].sort((a, b) => b.cost - a.cost);
  const daily = [...dailyMap.values()]
    .filter((d) => d.date !== 'unknown')
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, cost: roundCost(d.cost) }));

  return {
    totalCost: roundCost(totalCost),
    totalVolume,
    breakdown,
    daily,
    dataPointCount: points.length,
  };
};

/**
 * Gasto WhatsApp (Meta pricing_analytics) para la WABA configurada.
 * @param {{ from?: string, to?: string }} query - YYYY-MM-DD en TZ empresa (Europe/Madrid)
 */
const getWhatsappMetaGasto = async (query = {}) => {
  const period = resolvePeriod(query);
  const graphPayload = await fetchPricingAnalyticsRaw({
    startUnix: period.startUnix,
    endUnix: period.endUnix,
  });

  const aggregated = aggregatePricingAnalytics(graphPayload);

  return {
    wabaId: wabaId(),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    period: {
      from: period.from,
      to: period.to,
      timezone: TZ,
    },
    /** Meta devuelve cost en USD en pricing_analytics (documentación Meta). */
    currency: 'USD',
    totalCost: aggregated.totalCost,
    totalVolume: aggregated.totalVolume,
    breakdown: aggregated.breakdown,
    daily: aggregated.daily,
    meta: {
      dataPointCount: aggregated.dataPointCount,
      source: 'pricing_analytics',
      disclaimer:
        'Importe orientativo según Meta pricing_analytics; puede diferir de la factura del Business Manager.',
    },
  };
};

module.exports = {
  getWhatsappMetaGasto,
  resolvePeriod,
};
