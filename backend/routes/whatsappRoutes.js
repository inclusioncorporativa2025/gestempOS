const express = require('express');
const { requireAuth, requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');
const { assertEmpresaTieneFeature } = require('../services/planService');
const { normalizarTelefonoWhatsapp } = require('../utils/telefonoWhatsapp');
const Usuario = require('../models/Usuario');
const { Op } = require('sequelize');
const { useMetaProvider, getProviderStatus } = require('../services/whatsappMessaging');
const {
  getSessionStatus,
  listWebhooks,
  createWebhook,
} = require('../services/openwaClient');

const router = express.Router();

const buildWebhookUrl = () => {
  const explicit = (
    process.env.WHATSAPP_WEBHOOK_PUBLIC_URL
    || process.env.OPENWA_WEBHOOK_PUBLIC_URL
  )?.replace(/\/$/, '');

  if (explicit) {
    return `${explicit}/api/whatsapp/webhook`;
  }

  const frontend = process.env.FRONTEND_URL?.replace(/\/$/, '');
  if (frontend?.includes('app.')) {
    return `${frontend}/api/whatsapp/webhook`;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:5000/api/whatsapp/webhook';
  }

  return null;
};

router.post('/vincular', requireAuth, requireRole(ROLE_GROUPS.FICHAJE), async (req, res) => {
  try {
    const idEmpresa = Number(req.body?.idEmpresa || req.user?.id_empresa);
    const idUsuario = Number(req.body?.idUsuario || req.user?.id_usuario);
    const telefonoRaw = req.body?.telefonoWhatsapp ?? req.body?.telefono;

    await assertEmpresaTieneFeature(idEmpresa, 'whatsapp_fichaje');

    const telefono = normalizarTelefonoWhatsapp(telefonoRaw);
    if (!telefono) {
      return res.status(400).json({ error: 'Teléfono WhatsApp no válido' });
    }

    const duplicado = await Usuario.findOne({
      where: {
        telefono_whatsapp: telefono,
        id_usuario: { [Op.ne]: idUsuario },
        fecha_baja: null,
      },
    });

    if (duplicado) {
      return res.status(409).json({ error: 'Ese número ya está vinculado a otro usuario' });
    }

    await Usuario.update(
      { telefono_whatsapp: telefono },
      { where: { id_usuario: idUsuario } },
    );

    return res.status(200).json({
      message: 'WhatsApp vinculado correctamente',
      telefonoWhatsapp: telefono,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || 'No se pudo vincular WhatsApp',
      code: error.code,
    });
  }
});

router.get('/estado', requireAuth, requireRole(ROLE_GROUPS.COMPANY_STAFF), async (req, res) => {
  try {
    const idEmpresa = Number(req.query?.idEmpresa || req.user?.id_empresa);
    await assertEmpresaTieneFeature(idEmpresa, 'whatsapp_fichaje');

    const webhookUrl = buildWebhookUrl();

    if (useMetaProvider()) {
      const provider = await getProviderStatus();
      return res.status(200).json({
        ...provider,
        webhookUrlEsperada: webhookUrl,
        webhookVerifyTokenConfigured: Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
      });
    }

    const session = await getSessionStatus();
    const webhooks = await listWebhooks();

    return res.status(200).json({
      provider: 'openwa',
      session,
      webhooks,
      webhookUrlEsperada: webhookUrl,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'No se pudo consultar WhatsApp' });
  }
});

router.post('/registrar-webhook', requireAuth, requireRole(ROLE_GROUPS.ROOT), async (req, res) => {
  try {
    const webhookUrl = buildWebhookUrl();

    if (useMetaProvider()) {
      return res.status(200).json({
        message: 'Con Meta Cloud API configura el webhook en developers.facebook.com',
        webhookUrlEsperada: webhookUrl,
        verifyTokenEnv: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
      });
    }

    const secret = req.body?.secret || process.env.OPENWA_WEBHOOK_SECRET;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'URL de webhook no configurada' });
    }

    const webhook = await createWebhook({
      url: webhookUrl,
      secret,
      events: ['message.received'],
    });

    return res.status(200).json({ message: 'Webhook registrado', webhook });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'No se pudo registrar webhook' });
  }
});

module.exports = router;
