import { APP_URL } from '../constants/urls';
import { APP_ROUTES } from '../constants/routes';
import { isAppSubdomain } from './host';

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
    host === 'localhost' || host === '127.0.0.1' || host === 'fichaeneltrabajo.es';
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
    host === 'localhost' || host === '127.0.0.1' || host === 'fichaeneltrabajo.es';
  if (sameSpa) {
    return path;
  }
  return `${APP_URL}${path}`;
};

export const getAppRegisterHref = () => buildAppPath(APP_ROUTES.register);
