const { normalizarTelefonoWhatsapp } = require('../utils/telefonoWhatsapp');

const graphVersion = () => process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
const cloudToken = () => process.env.WHATSAPP_CLOUD_TOKEN || '';
const phoneNumberId = () => process.env.WHATSAPP_PHONE_NUMBER_ID || '';

const isConfigured = () => Boolean(cloudToken() && phoneNumberId());

const assertConfigured = () => {
  if (!isConfigured()) {
    const error = new Error(
      'WhatsApp Cloud API no configurado (WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID)',
    );
    error.status = 503;
    throw error;
  }
};

const postMessage = async (toPhone, payload) => {
  assertConfigured();

  const to = normalizarTelefonoWhatsapp(toPhone);
  if (!to) {
    const error = new Error('Destinatario WhatsApp no válido');
    error.status = 400;
    throw error;
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion()}/${phoneNumberId()}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cloudToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        ...payload,
      }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `WhatsApp Cloud API ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data?.error;
    throw error;
  }

  return data;
};

const sendText = async (toPhone, text) =>
  postMessage(toPhone, {
    type: 'text',
    text: { body: String(text || '').slice(0, 4096) },
  });

const sendInteractive = async (toPhone, interactive) =>
  postMessage(toPhone, {
    type: 'interactive',
    interactive,
  });

/**
 * Plantilla aprobada en Meta (utility/marketing).
 * @param {object} options
 * @param {string} options.name - Nombre de plantilla, ej. timecor_alerta_fichaje_entrada
 * @param {string} options.languageCode - Código idioma, ej. es
 * @param {Array} [options.components] - Componentes body/button/header
 */
const sendTemplate = async (toPhone, { name, languageCode, components }) => {
  if (!name) {
    const error = new Error('Nombre de plantilla WhatsApp obligatorio');
    error.status = 400;
    throw error;
  }

  const template = {
    name: String(name),
    language: { code: String(languageCode || 'es') },
  };

  if (Array.isArray(components) && components.length > 0) {
    template.components = components;
  }

  return postMessage(toPhone, {
    type: 'template',
    template,
  });
};

const getConfigStatus = () => ({
  provider: 'meta',
  configured: isConfigured(),
  phoneNumberId: phoneNumberId() || null,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null,
  graphVersion: graphVersion(),
  webhookVerifyTokenConfigured: Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
  appSecretConfigured: Boolean(process.env.WHATSAPP_APP_SECRET),
});

module.exports = {
  sendText,
  sendInteractive,
  sendTemplate,
  isConfigured,
  getConfigStatus,
};
