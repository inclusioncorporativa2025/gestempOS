const crypto = require('crypto');
const {
  procesarEventoOpenWA,
  procesarEventoMeta,
} = require('../services/whatsappFichajeService');

const verifyOpenWASignature = (rawBody, signature, secret) => {
  if (!signature || !secret) return false;

  const expected =
    `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

const verifyMetaSignature = (rawBody, signature, appSecret) => {
  if (!signature || !appSecret) return false;

  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const received = String(signature).replace(/^sha256=/, '');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(received, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
};

const handleWhatsappWebhookGet = (req, res) => {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && verifyToken && token === verifyToken && challenge) {
    return res.status(200).send(String(challenge));
  }

  console.warn('[whatsapp/webhook] Verificación Meta rechazada', {
    mode,
    tokenMatch: Boolean(verifyToken && token === verifyToken),
  });
  return res.sendStatus(403);
};

const parseWebhookBody = (rawBody) => {
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    return null;
  }
};

const isMetaPayload = (payload) => payload?.object === 'whatsapp_business_account';

const handleWhatsappWebhookPost = async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');

  let payload;
  try {
    payload = parseWebhookBody(rawBody);
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  if (!payload) {
    return res.status(400).send('Invalid JSON');
  }

  if (isMetaPayload(payload)) {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const signature = req.header('X-Hub-Signature-256');

    console.log('[whatsapp/webhook] POST Meta recibido', {
      bytes: rawBody.length,
      hasSignature: Boolean(signature),
      field: payload?.entry?.[0]?.changes?.[0]?.field,
    });

    if (appSecret && !verifyMetaSignature(rawBody, signature, appSecret)) {
      console.warn('[whatsapp/webhook] Firma Meta inválida');
      return res.status(401).send('Invalid signature');
    }

    try {
      await procesarEventoMeta(payload);
      return res.status(200).send('OK');
    } catch (error) {
      console.error('Error procesando webhook Meta WhatsApp:', error);
      return res.status(500).send('Error');
    }
  }

  const secret = process.env.OPENWA_WEBHOOK_SECRET;
  const signature = req.header('X-OpenWA-Signature');

  if (secret && !verifyOpenWASignature(rawBody, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  const idempotencyKey =
    req.header('X-OpenWA-Idempotency-Key') ||
    payload?.idempotencyKey ||
    null;

  try {
    await procesarEventoOpenWA(payload, idempotencyKey);
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando webhook OpenWA:', error);
    return res.status(500).send('Error');
  }
};

module.exports = {
  handleWhatsappWebhookGet,
  handleWhatsappWebhookPost,
  verifyOpenWASignature,
  verifyMetaSignature,
};
