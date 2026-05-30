// Interceptor global de fetch.
//
// Los servicios del proyecto usan `fetch` directamente y no añadían el token.
// Como el backend ahora exige `Authorization: Bearer <jwt>` en todas las rutas
// `/api/*` (salvo las de `/auth`), parcheamos `window.fetch` una sola vez para:
//   1. Añadir automáticamente el token guardado en localStorage a las llamadas a la API.
//   2. Si la API responde 401 (token ausente/expirado), limpiar la sesión y volver al login.
//
// Así no hay que modificar cada uno de los servicios existentes.

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const originalFetch = window.fetch.bind(window);

const getUrl = (input) => {
  if (typeof input === 'string') return input;
  if (input instanceof Request) return input.url;
  if (input && typeof input.url === 'string') return input.url;
  return '';
};

const esLlamadaApi = (url) => Boolean(API_BASE_URL) && url.startsWith(API_BASE_URL);
const esLlamadaAuth = (url) => url.includes('/auth/');

window.fetch = async (input, init = {}) => {
  const url = getUrl(input);

  if (esLlamadaApi(url)) {
    const token = localStorage.getItem('authToken');

    if (token) {
      const headers = new Headers(init.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      init = { ...init, headers };
    }
  }

  const response = await originalFetch(input, init);

  // Sesión inválida/expirada: no aplica a los endpoints públicos de auth.
  if (response.status === 401 && esLlamadaApi(url) && !esLlamadaAuth(url)) {
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }

  return response;
};
