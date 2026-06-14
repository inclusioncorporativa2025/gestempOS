/** Public marketing site (landing). */
export const LANDING_ROUTES = {
  home: '/',
  /** Anclas en la página de inicio */
  features: '/#funcionalidades',
  plans: '/#planes',
  /** Páginas legales (contenido pendiente de publicar) */
  legalNotice: '/aviso-legal',
  privacy: '/politica-privacidad',
  cookies: '/politica-cookies',
  terms: '/terminos-condiciones',
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
  settingsUsuario: '/settings/usuario',
  settingsEmpresa: '/settings/empresa',
  settingsJornada: '/settings/jornada',
  companies: '/companies',
  notifications: '/notifications',
};

/** @deprecated Prefer APP_ROUTES or LANDING_ROUTES */
export const ROUTES = APP_ROUTES;
