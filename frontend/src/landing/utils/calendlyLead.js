export const getLandingApiBase = () => {
  const fromEnv = (
    import.meta.env.VITE_LANDING_API_BASE_URL
    || import.meta.env.VITE_API_BASE_URL
    || import.meta.env.REACT_APP_API_BASE_URL
    || ''
  );

  if (fromEnv) {
    return fromEnv.replace(/\/?$/, '/');
  }

  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:5000/api/';
  }

  return '/api/';
};
