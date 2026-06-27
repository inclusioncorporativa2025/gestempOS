import { APP_URL, LANDING_URL } from '../constants/urls';
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

/**
 * URL al login: en producción (timecor.es) siempre app.timecor.es/login.
 * En localhost, ruta relativa /login (misma SPA de desarrollo).
 */
export const getAppLoginHref = () => {
  if (typeof window === 'undefined') {
    return `${APP_URL}${APP_ROUTES.login}`;
  }
  if (isAppSubdomain() || !isLandingHost()) {
    return APP_ROUTES.login;
  }
  return `${APP_URL}${APP_ROUTES.login}`;
};

/**
 * Ruta o URL absoluta según dominio (register, etc.).
 */
const buildAppPath = (path) => {
  if (typeof window === 'undefined') {
    return `${APP_URL}${path}`;
  }
  if (isAppSubdomain() || !isLandingHost()) {
    return path;
  }
  return `${APP_URL}${path}`;
};

export const getAppRegisterHref = () => buildAppPath(APP_ROUTES.register);

export const isAuthAppPath = (pathname) =>
  [
    APP_ROUTES.login,
    APP_ROUTES.register,
    APP_ROUTES.forgotPassword,
    APP_ROUTES.resetPassword,
  ].includes(pathname);

/**
 * Tras cerrar sesión: en app.* → landing (timecor.es); en local, /.
 */
export const redirectAfterLogout = () => {
  if (typeof window === 'undefined') return;

  if (isAppSubdomain()) {
    window.location.replace(LANDING_URL);
    return;
  }

  window.location.replace('/');
};
