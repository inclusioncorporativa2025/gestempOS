const {
  requireAuth,
  requireRole,
  ROLE_GROUPS,
} = require('./authMiddleware');
const {
  usuarioTienePermisoHub,
  usuarioPuedeGestionarAccesosHub,
  refrescarClaimsHubEnUsuario,
} = require('../services/crmHubService');

const requireHubAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  try {
    const tieneAcceso = await refrescarClaimsHubEnUsuario(req.user);
    if (!tieneAcceso) {
      return res.status(403).json({
        message: 'Acceso denegado: no tienes acceso al panel de ventas',
        code: 'HUB_ACCESS_REVOKED',
      });
    }
    return next();
  } catch (error) {
    console.error('[hub] requireHubAccess:', error.message);
    return res.status(500).json({ message: 'Error al comprobar acceso al panel de ventas' });
  }
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
