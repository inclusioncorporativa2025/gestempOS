const { Op, fn, col, where } = require('sequelize');
const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');

const normalizeIdentificador = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return text.toUpperCase().replace(/[\s-]/g, '');
};

const normalizeEmail = (value) => {
  const text = String(value ?? '').trim().toLowerCase();
  return text || null;
};

const normalizeDni = normalizeIdentificador;

const cifSqlNormalized = fn(
  'UPPER',
  fn(
    'REPLACE',
    fn('REPLACE', fn('TRIM', col('identificador_fiscal')), ' ', ''),
    '-',
    '',
  ),
);

const dniSqlNormalized = fn(
  'UPPER',
  fn(
    'REPLACE',
    fn('REPLACE', fn('TRIM', col('dni')), ' ', ''),
    '-',
    '',
  ),
);

const findEmpresaActivaPorCif = async (cif, options = {}) => {
  const normalized = normalizeIdentificador(cif);
  if (!normalized) return null;

  return Empresa.findOne({
    where: {
      fecha_baja: null,
      identificador_fiscal: { [Op.ne]: null },
      [Op.and]: [where(cifSqlNormalized, normalized)],
    },
    ...options,
  });
};

const findUsuarioActivoPorEmail = async (email, options = {}) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  return Usuario.findOne({
    where: {
      fecha_baja: null,
      [Op.and]: [where(fn('LOWER', fn('TRIM', col('email'))), normalized)],
    },
    ...options,
  });
};

const findUsuarioActivoPorDni = async (dni, options = {}) => {
  const normalized = normalizeDni(dni);
  if (!normalized) return null;

  const { excludeUserId, ...queryOptions } = options;
  const whereClause = {
    fecha_baja: null,
    dni: { [Op.ne]: null },
    [Op.and]: [where(dniSqlNormalized, normalized)],
  };

  if (excludeUserId != null) {
    whereClause.id_usuario = { [Op.ne]: excludeUserId };
  }

  return Usuario.findOne({
    where: whereClause,
    ...queryOptions,
  });
};

const findMembresiaActivaEnEmpresa = async (idUsuario, idEmpresa, options = {}) => {
  if (idUsuario == null || idEmpresa == null) return null;

  return UsuarioEmpresa.findOne({
    where: {
      id_usuario: idUsuario,
      id_empresa: idEmpresa,
      fecha_baja: null,
    },
    ...options,
  });
};

/**
 * Resuelve la identidad global de una persona (email / DNI) para operaciones multi-empresa.
 * - Un mismo usuario puede pertenecer a varias empresas.
 * - El conflicto relevante es email+DNI que apunten a cuentas distintas, no el hecho de existir.
 */
const resolverUsuarioIdentidad = async ({ email, dni } = {}, options = {}) => {
  const emailNorm = normalizeEmail(email);
  const dniNorm = normalizeDni(dni);

  const [byEmail, byDni] = await Promise.all([
    emailNorm ? findUsuarioActivoPorEmail(emailNorm, options) : null,
    dniNorm ? findUsuarioActivoPorDni(dniNorm, options) : null,
  ]);

  if (byEmail && byDni && byEmail.id_usuario !== byDni.id_usuario) {
    return {
      usuario: null,
      esNuevo: false,
      conflict: {
        message: 'El email y el DNI pertenecen a cuentas distintas en la plataforma',
        codigo: 'IDENTIDAD_CONFLICTO',
      },
    };
  }

  const usuario = byEmail || byDni || null;

  if (usuario && emailNorm && normalizeEmail(usuario.email) !== emailNorm) {
    return {
      usuario: null,
      esNuevo: false,
      conflict: {
        message: 'Este DNI ya está asociado a otra cuenta. Utilice el email registrado para esa persona.',
        codigo: 'DNI_VINCULADO_OTRO_EMAIL',
      },
    };
  }

  if (usuario && dniNorm && usuario.dni) {
    const dniGuardado = normalizeDni(usuario.dni);
    if (dniGuardado && dniGuardado !== dniNorm) {
      return {
        usuario: null,
        esNuevo: false,
        conflict: {
          message: 'El DNI no coincide con el de la cuenta existente para este email',
          codigo: 'DNI_NO_COINCIDE',
        },
      };
    }
  }

  return {
    usuario,
    esNuevo: !usuario,
    conflict: null,
  };
};

module.exports = {
  normalizeIdentificador,
  normalizeEmail,
  normalizeDni,
  findEmpresaActivaPorCif,
  findUsuarioActivoPorEmail,
  findUsuarioActivoPorDni,
  findMembresiaActivaEnEmpresa,
  resolverUsuarioIdentidad,
};
