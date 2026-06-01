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
