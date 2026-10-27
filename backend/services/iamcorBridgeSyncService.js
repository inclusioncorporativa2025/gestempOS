const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Usuario = require('../models/Usuario');

const APP_CODE = (process.env.IAMCOR_APP_CODE || 'TIMECOR').trim().toUpperCase();

async function findUsuarioByEmail(email) {
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!emailNorm) {
    return null;
  }
  return Usuario.findOne({
    where: {
      [Op.and]: [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), emailNorm),
        { fecha_baja: null },
      ],
    },
  });
}

/**
 * Sincroniza m_usuario_iamcor tras grant/revoke en IAMCOR (webhook).
 */
async function syncAppAccessFromIamcor(payload) {
  const appCodigo = String(payload.app_codigo || '').trim().toUpperCase();
  if (appCodigo !== APP_CODE) {
    const err = new Error(`App no soportada en este backend: ${appCodigo}`);
    err.status = 400;
    err.code = 'APP_NOT_SUPPORTED';
    throw err;
  }

  const usuario = await findUsuarioByEmail(payload.email);
  if (!usuario) {
    const err = new Error(
      'No existe usuario TimeCor con ese email; créalo en m_usuarios antes del acceso IAM',
    );
    err.status = 404;
    err.code = 'TIMECOR_USER_NOT_FOUND';
    throw err;
  }

  const event = payload.event;
  const iamUserId = Number(payload.iam_user_id);
  const iamUuid = String(payload.iam_uuid || '').trim();

  if (event === 'app_access.granted') {
    if (!Number.isInteger(iamUserId) || iamUserId <= 0 || !iamUuid) {
      const err = new Error('iam_user_id e iam_uuid son obligatorios');
      err.status = 400;
      err.code = 'VALIDATION';
      throw err;
    }

    await sequelize.query(
      `INSERT INTO m_usuario_iamcor (
          id_usuario, iam_user_id, iam_uuid, estado,
          provisioned_at, revoked_at, provision_source,
          iam_linked_at, auth_provider, iam_migrated_at,
          created_at, updated_at
       ) VALUES (
          ?, ?, ?, 'ACTIVE',
          NOW(), NULL, 'iamcor_webhook',
          NOW(), 'iamcor', NOW(),
          NOW(), NOW()
       )
       ON DUPLICATE KEY UPDATE
          iam_user_id = VALUES(iam_user_id),
          iam_uuid = VALUES(iam_uuid),
          estado = 'ACTIVE',
          provisioned_at = COALESCE(provisioned_at, NOW()),
          revoked_at = NULL,
          provision_source = 'iamcor_webhook',
          iam_linked_at = COALESCE(iam_linked_at, NOW()),
          auth_provider = 'iamcor',
          updated_at = NOW()`,
      {
        replacements: [usuario.id_usuario, iamUserId, iamUuid],
      },
    );

    return {
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      estado: 'ACTIVE',
      action: 'granted',
    };
  }

  if (event === 'app_access.revoked') {
    await sequelize.query(
      `UPDATE m_usuario_iamcor
       SET estado = 'INACTIVE',
           revoked_at = NOW(),
           updated_at = NOW()
       WHERE id_usuario = ?`,
      { replacements: [usuario.id_usuario] },
    );

    return {
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      estado: 'INACTIVE',
      action: 'revoked',
    };
  }

  const err = new Error('event inválido');
  err.status = 400;
  err.code = 'VALIDATION';
  throw err;
}

module.exports = { syncAppAccessFromIamcor };
