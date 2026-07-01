const crypto = require('crypto');
const { procesarEventoOpenWA } = require('../services/whatsappFichajeService');

const verifyOpenWASignature = (rawBody, signature, secret) => {
  if (!signature || !secret) return false;

  const expected =
    `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

const handleOpenWAWebhook = async (req, res) => {
  const secret = process.env.OPENWA_WEBHOOK_SECRET;
  const signature = req.header('X-OpenWA-Signature');

  if (secret && !verifyOpenWASignature(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  const idempotencyKey =
    req.header('X-OpenWA-Idempotency-Key') ||
    event?.idempotencyKey ||
    null;

  try {
    await procesarEventoOpenWA(event, idempotencyKey);
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando webhook OpenWA:', error);
    return res.status(500).send('Error');
  }
};

module.exports = {
  handleOpenWAWebhook,
  verifyOpenWASignature,
};
