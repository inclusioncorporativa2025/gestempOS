/**
 * Producción:
 * - LANDING_URL → https://timecor.es (web comercial)
 * - APP_URL → https://app.timecor.es (app: /login, /home, …)
 * - LANDING_URL → https://timecor.es (landing en /)
 */

import { isAppSubdomain } from '../utils/host';

const fromEnv = (key, fallback) => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim() ? value.replace(/\/$/, '') : fallback;
};

export const LANDING_URL = fromEnv('VITE_LANDING_URL', 'https://timecor.es');

export const APP_URL = fromEnv(
  'VITE_APP_URL',
  typeof window !== 'undefined'
    ? isAppSubdomain() || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? window.location.origin
      : 'https://app.timecor.es'
    : 'http://localhost:3000',
);
