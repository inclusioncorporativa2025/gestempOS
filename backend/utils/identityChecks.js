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

const isEmailValido = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

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

/** Cualquier cuenta (activa o dada de baja) por email. */
const findUsuarioPorEmail = async (email, options = {}) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  return Usuario.findOne({
    where: {
      [Op.and]: [where(fn('LOWER', fn('TRIM', col('email'))), normalized)],
    },
    ...options,
  });
};

const findUsuariosActivosPorDni = async (dni, options = {}) => {
  const normalized = normalizeDni(dni);
  if (!normalized) return [];

  const { excludeUserId, ...queryOptions } = options;
  const whereClause = {
    fecha_baja: null,
    dni: { [Op.ne]: null },
    [Op.and]: [where(dniSqlNormalized, normalized)],
  };

  if (excludeUserId != null) {
    whereClause.id_usuario = { [Op.ne]: excludeUserId };
  }

  return Usuario.findAll({
    where: whereClause,
    ...queryOptions,
  });
};

const findUsuariosPorDni = async (dni, options = {}) => {
  const normalized = normalizeDni(dni);
  if (!normalized) return [];

  const { excludeUserId, ...queryOptions } = options;
  const whereClause = {
    dni: { [Op.ne]: null },
    [Op.and]: [where(dniSqlNormalized, normalized)],
  };

  if (excludeUserId != null) {
    whereClause.id_usuario = { [Op.ne]: excludeUserId };
  }

  return Usuario.findAll({
    where: whereClause,
    ...queryOptions,
  });
};

const findUsuarioActivoPorDni = async (dni, options = {}) => {
  const usuarios = await findUsuariosActivosPorDni(dni, options);
  if (usuarios.length === 0) return null;
  if (usuarios.length === 1) return usuarios[0];

  const emailNorm = normalizeEmail(options.email);
  if (emailNorm) {
    const porEmail = usuarios.find(
      (usuario) => normalizeEmail(usuario.email) === emailNorm,
    );
    if (porEmail) return porEmail;
  }

  return usuarios[0];
};

const findUsuarioPorDni = async (dni, options = {}) => {
  const usuarios = await findUsuariosPorDni(dni, options);
  if (usuarios.length === 0) return null;
  if (usuarios.length === 1) return usuarios[0];

  const emailNorm = normalizeEmail(options.email);
  if (emailNorm) {
    const porEmail = usuarios.find(
      (usuario) => normalizeEmail(usuario.email) === emailNorm,
    );
    if (porEmail) return porEmail;
  }

  return usuarios[0];
};

const usuarioEstaActivoGlobal = (usuario) =>
  Boolean(
    usuario
    && !usuario.fecha_baja
    && usuario.activo !== false
    && usuario.activo !== 0,
  );

const reactivarUsuarioGlobal = async (
  idUsuario,
  { nombre, dni, idUsuarioAccion, fecha, transaction } = {},
) => {
  const update = {
    fecha_baja: null,
    usuario_baja: null,
    activo: true,
    fecha_modificacion: fecha ?? new Date(),
    usuario_modificacion: idUsuarioAccion ?? null,
  };
  if (nombre) update.nombre = nombre;
  if (dni) update.dni = dni;

  await Usuario.update(update, {
    where: { id_usuario: idUsuario },
    transaction,
  });

  return Usuario.findByPk(idUsuario, { transaction });
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

const MENSAJE_CONFLICTO_PUBLICO =
  'Ya existe una cuenta en la plataforma con estos datos. Si es su cuenta, inicie sesión o use «Olvidé mi contraseña». Si necesita ayuda, contacte con soporte.';

const MENSAJE_DNI_OTRO_EMAIL_INTERNO =
  'Este DNI ya está asociado a otra cuenta. Vincule al personal con el email de esa cuenta o contacte con soporte.';

const sanitizarConflictoIdentidadPublico = () => ({
  message: MENSAJE_CONFLICTO_PUBLICO,
  codigo: 'CUENTA_YA_EXISTE',
});

/**
 * Resuelve la identidad global de una persona (email / DNI) para operaciones multi-empresa.
 * - Un mismo usuario puede pertenecer a varias empresas.
 * - El conflicto relevante es email+DNI que apunten a cuentas distintas, no el hecho de existir.
 * - Con `respuestaPublica: true` no se devuelven datos de otras cuentas (p. ej. email ajeno).
 */
const resolverUsuarioIdentidad = async (
  { email, dni, respuestaPublica = false } = {},
  options = {},
) => {
  const emailNorm = normalizeEmail(email);
  const dniNorm = normalizeDni(dni);

  const [byEmail, byDni] = await Promise.all([
    emailNorm ? findUsuarioPorEmail(emailNorm, options) : null,
    dniNorm ? findUsuarioPorDni(dniNorm, { ...options, email: emailNorm }) : null,
  ]);

  if (byEmail && byDni && byEmail.id_usuario !== byDni.id_usuario) {
    return {
      usuario: null,
      esNuevo: false,
      conflict: respuestaPublica
        ? sanitizarConflictoIdentidadPublico()
        : {
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
      conflict: respuestaPublica
        ? sanitizarConflictoIdentidadPublico()
        : {
            message: MENSAJE_DNI_OTRO_EMAIL_INTERNO,
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
        conflict: respuestaPublica
          ? sanitizarConflictoIdentidadPublico()
          : {
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
  isEmailValido,
  normalizeDni,
  findEmpresaActivaPorCif,
  findUsuarioActivoPorEmail,
  findUsuarioPorEmail,
  findUsuarioActivoPorDni,
  findUsuarioPorDni,
  findUsuariosActivosPorDni,
  findUsuariosPorDni,
  findMembresiaActivaEnEmpresa,
  usuarioEstaActivoGlobal,
  reactivarUsuarioGlobal,
  resolverUsuarioIdentidad,
  sanitizarConflictoIdentidadPublico,
};
