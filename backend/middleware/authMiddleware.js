const jwt = require('jsonwebtoken');
const Empresa = require('../models/Empresa');

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'soporte@fichaeneltrabajo.es';

const empresaEstaOperativa = (empresa) =>
  empresa &&
  !empresa.fecha_baja &&
  empresa.activo !== false &&
  empresa.activo !== 0;

/** Tipos de usuario (m_usuarios.tipo_usuario) */
const ROLES = {
  ROOT: 1,
  PLATFORM_ADMIN: 2,
  ADMIN_EMPRESA: 3,
  SUPERVISOR: 4,
  EMPLEADO: 5,
  INSPECTOR: 6,
};

/** Grupos alineados con ProtectedRoute del frontend */
const ROLE_GROUPS = {
  PLATFORM: [ROLES.ROOT, ROLES.PLATFORM_ADMIN],
  COMPANY_STAFF: [ROLES.ROOT, ROLES.ADMIN_EMPRESA, ROLES.SUPERVISOR],
  FICHAJE: [ROLES.ROOT, ROLES.ADMIN_EMPRESA, ROLES.SUPERVISOR, ROLES.EMPLEADO],
  PERSONAL_LIST: [ROLES.ROOT, ROLES.ADMIN_EMPRESA, ROLES.SUPERVISOR, ROLES.INSPECTOR],
  USER_WRITE: [ROLES.ROOT, ROLES.ADMIN_EMPRESA, ROLES.SUPERVISOR],
  CONFIG: [ROLES.ROOT, ROLES.ADMIN_EMPRESA, ROLES.SUPERVISOR],
  /** Calendario: ver ausencias de toda la empresa */
  CALENDARIO_AUSENCIAS_EMPRESA: [
    ROLES.ROOT,
    ROLES.PLATFORM_ADMIN,
    ROLES.ADMIN_EMPRESA,
    ROLES.SUPERVISOR,
  ],
  /** Calendario: acceso a la pantalla (empleado solo ve las propias) */
  CALENDARIO_VIEW: [
    ROLES.ROOT,
    ROLES.PLATFORM_ADMIN,
    ROLES.ADMIN_EMPRESA,
    ROLES.SUPERVISOR,
    ROLES.EMPLEADO,
  ],
  ALL: [1, 2, 3, 4, 5, 6],
};

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'No autorizado: falta el token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'No autorizado: token inválido o expirado' });
  }
};

/**
 * Exige que req.user.tipo_usuario esté en la lista permitida.
 * Uso: requireRole(1, 3, 4) o requireRole(ROLE_GROUPS.FICHAJE)
 */
const requireRole = (...tiposPermitidos) => {
  const permitidos =
    tiposPermitidos.length === 1 && Array.isArray(tiposPermitidos[0])
      ? tiposPermitidos[0]
      : tiposPermitidos;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const tipo = Number(req.user.tipo_usuario);
    if (!permitidos.map(Number).includes(tipo)) {
      return res.status(403).json({ message: 'Acceso denegado: rol no permitido' });
    }

    return next();
  };
};

/**
 * Usuarios de empresa (3–6) solo pueden operar sobre su id_empresa del JWT.
 * ROOT (1) y plataforma (2) quedan exentos.
 */
const requireOwnEmpresa = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  const tipo = Number(req.user.tipo_usuario);
  if (ROLE_GROUPS.PLATFORM.includes(tipo)) {
    return next();
  }

  const empresaToken = Number(req.user.id_empresa);
  if (!empresaToken) {
    return res.status(403).json({
      code: 'EMPRESA_NO_VINCULADA',
      message: 'No podemos iniciar su sesión en este momento.',
      supportEmail: SUPPORT_EMAIL,
    });
  }

  try {
    const empresa = await Empresa.findByPk(empresaToken);
    if (!empresaEstaOperativa(empresa)) {
      return res.status(403).json({
        code: 'EMPRESA_INACTIVA',
        message:
          'El acceso de su empresa no está disponible en este momento. Si necesita ayuda, contacte con soporte.',
        supportEmail: SUPPORT_EMAIL,
      });
    }
  } catch (error) {
    console.error('Error validando empresa activa:', error.message);
    return res.status(500).json({ message: 'Error al validar la empresa' });
  }

  const camposEmpresa = ['idEmpresa', 'id_empresa'];
  for (const campo of camposEmpresa) {
    if (req.body?.[campo] != null && Number(req.body[campo]) !== empresaToken) {
      return res.status(403).json({ message: 'No puedes operar sobre otra empresa' });
    }
  }

  if (req.body && req.body.idEmpresa == null && req.body.id_empresa == null) {
    req.body.idEmpresa = empresaToken;
  }

  return next();
};

module.exports = {
  ROLES,
  ROLE_GROUPS,
  requireAuth,
  requireRole,
  requireOwnEmpresa,
};
