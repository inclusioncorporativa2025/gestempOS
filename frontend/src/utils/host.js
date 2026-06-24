/**
 * `app.*` → solo aplicación (login en /login).
 * Dominio raíz o localhost → landing en / y app en /login, /home, …
 */
export const isAppSubdomain = () => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return false;
  }
  return host.startsWith('app.');
};

/** Producción en dominio raíz (p. ej. timecor.es), sin subdominio app. */
export const isLandingHost = () => {
  const host = window.location.hostname;
  return host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('app.');
};
