const { syncAppAccessFromIamcor } = require('../services/iamcorBridgeSyncService');

const ALLOWED_EVENTS = new Set(['app_access.granted', 'app_access.revoked']);

const handleAppAccessWebhook = async (req, res) => {
  try {
    const {
      event,
      app_codigo: appCodigo,
      iam_user_id: iamUserId,
      iam_uuid: iamUuid,
      email,
    } = req.body || {};

    if (!ALLOWED_EVENTS.has(event)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'event inválido' },
      });
    }

    if (!email || !appCodigo) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'email y app_codigo son obligatorios' },
      });
    }

    const data = await syncAppAccessFromIamcor({
      event,
      app_codigo: appCodigo,
      iam_user_id: iamUserId,
      iam_uuid: iamUuid,
      email,
      nombre: req.body.nombre,
      apellido1: req.body.apellido1,
      apellido2: req.body.apellido2,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Error al sincronizar puente',
      },
    });
  }
};

module.exports = { handleAppAccessWebhook };
