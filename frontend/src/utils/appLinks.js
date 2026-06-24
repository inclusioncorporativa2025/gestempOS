import { APP_URL } from '../constants/urls';
import { APP_ROUTES } from '../constants/routes';
import { isAppSubdomain, isLandingHost } from './host';

const AUTH_HASH_KEY = 'auth';

/** URL absoluta en el subdominio de la app. */
export const getAppAbsoluteUrl = (path) => `${APP_URL}${path}`;

/**
 * En dominio raíz (timecor.es), redirige al subdominio app.* conservando la sesión en el hash.
 * @returns {boolean} true si se inició la redirección
 */
export const redirectToApp = (path, token) => {
  if (typeof window === 'undefined' || !isLandingHost()) {
    return false;
  }

  const hash = token ? `#${AUTH_HASH_KEY}=${encodeURIComponent(token)}` : '';
  window.location.replace(`${APP_URL}${path}${hash}`);
  return true;
};

/** URL o ruta al login según dominio (SPA local vs app en subdominio). */
export const getAppLoginHref = () => {
  if (typeof window === 'undefined') {
    return `${APP_URL}${APP_ROUTES.login}`;
  }
  if (isAppSubdomain()) {
    return APP_ROUTES.login;
  }
  const host = window.location.hostname;
  const sameSpa =
    host === 'localhost' || host === '127.0.0.1' || host === 'timecor.es';
  if (sameSpa) {
    return APP_ROUTES.login;
  }
  return `${APP_URL}${APP_ROUTES.login}`;
};

const buildAppPath = (path) => {
  if (typeof window === 'undefined') {
    return `${APP_URL}${path}`;
  }
  if (isAppSubdomain()) {
    return path;
  }
  const host = window.location.hostname;
  const sameSpa =
    host === 'localhost' || host === '127.0.0.1' || host === 'timecor.es';
  if (sameSpa) {
    return path;
  }
  return `${APP_URL}${path}`;
};

export const getAppRegisterHref = () => buildAppPath(APP_ROUTES.register);
