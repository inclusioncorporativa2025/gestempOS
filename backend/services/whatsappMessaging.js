const { chatIdATelefono } = require('../utils/telefonoWhatsapp');
const metaClient = require('./whatsappCloudClient');
const openwaClient = require('./openwaClient');

const useMetaProvider = () => {
  const explicit = String(process.env.WHATSAPP_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'openwa') return false;
  if (explicit === 'meta') return true;
  return metaClient.isConfigured();
};

const sendText = async (chatIdOrPhone, text) => {
  if (useMetaProvider()) {
    const to = chatIdATelefono(chatIdOrPhone) || chatIdOrPhone;
    return metaClient.sendText(to, text);
  }
  return openwaClient.sendText(chatIdOrPhone, text);
};

/** Envía texto o menú interactivo (botones/lista) según el proveedor. */
const sendReply = async (chatIdOrPhone, { text, interactive } = {}) => {
  if (interactive && useMetaProvider()) {
    const to = chatIdATelefono(chatIdOrPhone) || chatIdOrPhone;
    return metaClient.sendInteractive(to, interactive);
  }
  if (text) {
    return sendText(chatIdOrPhone, text);
  }
  return null;
};

const getProviderStatus = async () => {
  if (useMetaProvider()) {
    return metaClient.getConfigStatus();
  }

  try {
    const session = await openwaClient.getSessionStatus();
    return {
      provider: 'openwa',
      configured: true,
      session,
    };
  } catch (error) {
    return {
      provider: 'openwa',
      configured: false,
      error: error.message,
    };
  }
};

module.exports = {
  useMetaProvider,
  sendText,
  sendReply,
  getProviderStatus,
};
