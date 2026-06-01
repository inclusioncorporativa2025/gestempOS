/** Public marketing site (landing). */
export const LANDING_ROUTES = {
  home: '/',
};

/** Authenticated app + auth screens. */
export const APP_ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  home: '/home',
  timeLogs: '/time-logs',
  users: '/users',
  usersAdd: '/users/add',
  calendar: '/calendar',
  settings: '/settings',
  companies: '/companies',
  notifications: '/notifications',
};

/** @deprecated Prefer APP_ROUTES or LANDING_ROUTES */
export const ROUTES = APP_ROUTES;
