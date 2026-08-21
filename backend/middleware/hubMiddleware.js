const {
  requireAuth,
  requireRole,
  ROLE_GROUPS,
} = require('./authMiddleware');
const { usuarioTienePermisoHub } = require('../services/crmHubService');

const ROLES_ROOT = 1;

const requireHubAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  if (Number(req.user.tipo_usuario) === ROLES_ROOT || req.user.hub_acceso) {
    return next();
  }

  return res.status(403).json({ message: 'Acceso denegado: no tienes acceso al hub comercial' });
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

module.exports = {
  requireHubAccess,
  requireHubPermiso,
  requireAuth,
  requireRole,
  ROLE_GROUPS,
};
