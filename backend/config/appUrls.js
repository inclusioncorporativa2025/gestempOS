/**
 * Dominios de producción:
 * - LANDING_URL → https://fichaeneltrabajo.es (web comercial)
 * - FRONTEND_URL / APP_URL → https://app.fichaeneltrabajo.es (aplicación React, rutas en /)
 */
const normalizeUrl = (url) => String(url || '').replace(/\/$/, '');

const LANDING_URL = normalizeUrl(
  process.env.LANDING_URL || 'https://fichaeneltrabajo.es',
);

const APP_URL = normalizeUrl(
  process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000',
);

module.exports = {
  LANDING_URL,
  APP_URL,
  /** Alias histórico en .env */
  FRONTEND_URL: APP_URL,
};
