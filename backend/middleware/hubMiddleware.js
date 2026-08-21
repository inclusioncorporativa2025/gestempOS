const {
  requireAuth,
  requireRole,
  ROLE_GROUPS,
} = require('./authMiddleware');
const { usuarioTienePermisoHub, usuarioPuedeGestionarAccesosHub } = require('../services/crmHubService');

const ROLES_ROOT = 1;

const requireHubAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  if (Number(req.user.tipo_usuario) === ROLES_ROOT || req.user.hub_acceso) {
    return next();
  }

  return res.status(403).json({ message: 'Acceso denegado: no tienes acceso al panel de ventas' });
};

const requireHubPermiso = (...codigos) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  if (usuarioTienePermisoHub(req.user, ...codigos)) {
    return next();
  }

  return res.status(403).json({ message: 'Acceso denegado: permiso hub insuficiente' });
};

const requireHubGestorAccesos = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  if (usuarioPuedeGestionarAccesosHub(req.user)) {
    return next();
  }

  return res.status(403).json({
    message: 'Acceso denegado: no puedes gestionar accesos al panel de ventas',
  });
};

/** Dashboard métricas: solo equipo plataforma (tipos 1 y 2). */
const requireHubPlataforma = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  if (ROLE_GROUPS.PLATFORM.includes(Number(req.user.tipo_usuario))) {
    return next();
  }

  return res.status(403).json({
    message: 'Acceso denegado: métricas solo para usuarios de plataforma',
  });
};

module.exports = {
  requireHubAccess,
  requireHubPermiso,
  requireHubGestorAccesos,
  requireHubPlataforma,
  requireAuth,
  requireRole,
  ROLE_GROUPS,
};
