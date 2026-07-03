const resolveUrl = (url) => String(url || '').replace(/\/?$/, '/');

const isLocalhostUrl = (url) => /localhost|127\.0\.0\.1/i.test(String(url || ''));

export const getLandingApiBase = () => {
  const landingApi = import.meta.env.VITE_LANDING_API_BASE_URL || '';
  const appApi = (
    import.meta.env.VITE_API_BASE_URL
    || import.meta.env.REACT_APP_API_BASE_URL
    || ''
  );

  if (import.meta.env.PROD) {
    if (landingApi && !isLocalhostUrl(landingApi)) return resolveUrl(landingApi);
    if (appApi && !isLocalhostUrl(appApi)) return resolveUrl(appApi);
    return resolveUrl('https://app.fichaeneltrabajo.es/api/');
  }

  if (landingApi) return resolveUrl(landingApi);
  if (appApi) return resolveUrl(appApi);
  return 'http://127.0.0.1:5000/api/';
};
