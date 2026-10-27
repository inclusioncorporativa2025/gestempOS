const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const {
  IamcorApiError,
  iamcorLoginApp,
  iamcorProvisionLegacyUser,
  isIamcorClientConfigured,
} = require('./iamcorClient');

const bridgeEnabled = () =>
  String(process.env.IAMCOR_BRIDGE_ENABLED || 'true').trim().toLowerCase() !== 'false';

async function obtenerPuenteIam(idUsuario) {
  const rows = await sequelize.query(
    `SELECT id_usuario, iam_user_id, iam_uuid, estado
     FROM m_usuario_iamcor
     WHERE id_usuario = ?
     LIMIT 1`,
    { replacements: [idUsuario], type: QueryTypes.SELECT },
  );
  return rows[0] || null;
}

async function usuarioTienePuenteIam(idUsuario) {
  const row = await obtenerPuenteIam(idUsuario);
  if (!row) {
    return null;
  }
  if (row.estado === 'INACTIVE') {
    return null;
  }
  return row;
}

async function actualizarPuenteIam(idUsuario, iamUserId, iamUuid) {
  await sequelize.query(
    `UPDATE m_usuario_iamcor
     SET iam_user_id = ?,
         iam_uuid = ?,
         auth_provider = 'iamcor',
         iam_migrated_at = COALESCE(iam_migrated_at, NOW()),
         updated_at = NOW()
     WHERE id_usuario = ?`,
    { replacements: [iamUserId, iamUuid, idUsuario] },
  );
}

async function validarPasswordLocal(usuario, password) {
  if (!usuario.password_hash) {
    return false;
  }
  return bcrypt.compare(password, usuario.password_hash);
}

/**
 * Usuarios en m_usuario_iamcor validan contra IAMCOR (lazy migration con bcrypt).
 * El resto sigue con bcrypt local.
 */
async function validarCredencialesLogin(usuario, email, password) {
  if (bridgeEnabled()) {
    const puenteRow = await obtenerPuenteIam(usuario.id_usuario);
    if (puenteRow?.estado === 'INACTIVE') {
      return {
        ok: false,
        code: 'APP_ACCESS_DENIED',
        message: 'Acceso a la aplicación revocado en IAMCOR',
      };
    }
  }

  const puente = bridgeEnabled() ? await usuarioTienePuenteIam(usuario.id_usuario) : null;

  if (!puente) {
    return { ok: await validarPasswordLocal(usuario, password) };
  }

  if (!isIamcorClientConfigured()) {
    return { ok: await validarPasswordLocal(usuario, password), iamcorSkipped: true };
  }

  const emailNorm = String(email || '').trim().toLowerCase();

  try {
    const tokens = await iamcorLoginApp({ email: emailNorm, password });
    if (tokens && puente.iam_user_id == null) {
      const meRes = await fetch(`${process.env.IAMCOR_API_URL.replace(/\/$/, '')}/auth/me`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      }).catch(() => null);
      if (meRes?.ok) {
        const meBody = await meRes.json();
        const id = meBody?.data?.id_usuario;
        const uuid = meBody?.data?.uuid;
        if (id && uuid) {
          await actualizarPuenteIam(usuario.id_usuario, id, uuid);
        }
      }
    }
    return { ok: true, viaIamcor: true };
  } catch (error) {
    if (!(error instanceof IamcorApiError)) {
      console.error('[iamcor] error inesperado:', error.message);
      const localOk = await validarPasswordLocal(usuario, password);
      return { ok: localOk, iamcorFallback: true };
    }

    if (error.code === 'APP_ACCESS_DENIED') {
      return { ok: false, code: error.code, message: error.message };
    }

    if (error.status !== 401 && error.code !== 'INVALID_CREDENTIALS') {
      console.error('[iamcor]', error.status, error.code, error.message);
      const localOk = await validarPasswordLocal(usuario, password);
      return { ok: localOk, iamcorFallback: true };
    }

    const localOk = await validarPasswordLocal(usuario, password);
    if (!localOk) {
      return { ok: false };
    }

    try {
      const provision = await iamcorProvisionLegacyUser({
        email: emailNorm,
        password,
        nombre: usuario.nombre,
        apellido1: usuario.apellido1,
        apellido2: usuario.apellido2,
      });
      await actualizarPuenteIam(
        usuario.id_usuario,
        provision.id_usuario,
        provision.uuid,
      );
      return { ok: true, migrated: true };
    } catch (provisionError) {
      console.error('[iamcor] provision:', provisionError.message);
      return { ok: true, migrated: false, iamcorProvisionFailed: true };
    }
  }
}

module.exports = {
  actualizarPuenteIam,
  usuarioTienePuenteIam,
  validarCredencialesLogin,
};
