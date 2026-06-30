/** Public marketing site (landing). */
export const LANDING_ROUTES = {
  home: '/',
  /** Anclas en la página de inicio */
  features: '/#funcionalidades',
  plans: '/#planes',
  /** Páginas legales públicas */
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
  userProfile: '/users/:id',
  usersAdd: '/users/add',
  calendar: '/calendar',
  settings: '/settings',
  settingsUsuario: '/settings/usuario',
  settingsEmpresa: '/settings/empresa',
  settingsJornada: '/settings/jornada',
  companies: '/platform/empresas',
  platform: '/platform',
  platformAccesos: '/platform/accesos',
  platformAcceder: '/platform/acceder',
  platformEmpresas: '/platform/empresas',
  notifications: '/notifications',
  miPerfil: '/mi-perfil',
  facturacion: '/facturacion',
  facturacionExito: '/facturacion/exito',
  facturacionCancelado: '/facturacion/cancelado',
};

/** Rutas de facturación accesibles aunque el trial haya expirado */
export const FACTURACION_ROUTES = [
  APP_ROUTES.facturacion,
  APP_ROUTES.facturacionExito,
  APP_ROUTES.facturacionCancelado,
];

/** @deprecated Prefer APP_ROUTES or LANDING_ROUTES */
export const ROUTES = APP_ROUTES;
