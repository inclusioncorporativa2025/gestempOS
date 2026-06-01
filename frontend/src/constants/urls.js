/**
 * Producción:
 * - LANDING_URL → https://fichaeneltrabajo.es (web comercial)
 * - APP_URL → https://app.fichaeneltrabajo.es (app: /login, /home, …)
 * - LANDING_URL → https://fichaeneltrabajo.es (landing en /)
 */

const fromEnv = (key, fallback) => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim() ? value.replace(/\/$/, '') : fallback;
};

export const LANDING_URL = fromEnv('VITE_LANDING_URL', 'https://fichaeneltrabajo.es');

export const APP_URL = fromEnv(
  'VITE_APP_URL',
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
);
