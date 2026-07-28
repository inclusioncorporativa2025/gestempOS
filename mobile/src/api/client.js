import { getApiBaseUrl } from '../config/env';
import { getAuthToken } from '../auth/session';

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.supportEmail = options.supportEmail;
    this.checkoutUrl = options.checkoutUrl;
    this.detail = options.detail;
  }
}

const buildUrl = (path) => {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${normalizedPath}`;
};

/**
 * Cliente HTTP hacia el backend gestempOS.
 * @param {string} path - Ruta relativa (ej. auth/login)
 * @param {{ method?: string, body?: object, auth?: boolean }} options
 */
export const apiFetch = async (path, { method = 'POST', body, auth = false } = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Client': 'timecor-mobile',
  };

  if (auth) {
    const token = await getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || `Error HTTP ${response.status}`, {
      status: response.status,
      code: data.code,
      supportEmail: data.supportEmail,
      checkoutUrl: data.checkoutUrl,
      detail: data.detail,
    });
  }

  return data;
};
