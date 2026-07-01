const OPENWA_BASE_URL = () => String(process.env.OPENWA_BASE_URL || '').replace(/\/$/, '');
const OPENWA_API_KEY = () => process.env.OPENWA_API_KEY || '';
const OPENWA_SESSION_ID = () => process.env.OPENWA_SESSION_ID || '';

const assertConfig = () => {
  if (!OPENWA_BASE_URL() || !OPENWA_API_KEY() || !OPENWA_SESSION_ID()) {
    const error = new Error('OpenWA no configurado (OPENWA_BASE_URL, OPENWA_API_KEY, OPENWA_SESSION_ID)');
    error.status = 503;
    throw error;
  }
};

const openwaFetch = async (path, { method = 'GET', body } = {}) => {
  assertConfig();

  const response = await fetch(`${OPENWA_BASE_URL()}/api${path}`, {
    method,
    headers: {
      'X-API-Key': OPENWA_API_KEY(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `OpenWA ${response.status}`;
    const error = new Error(Array.isArray(message) ? message.join(', ') : message);
    error.status = response.status;
    throw error;
  }

  return data;
};

const sendText = async (chatId, text) =>
  openwaFetch(`/sessions/${OPENWA_SESSION_ID()}/messages/send-text`, {
    method: 'POST',
    body: { chatId, text },
  });

const getSessionStatus = async () =>
  openwaFetch(`/sessions/${OPENWA_SESSION_ID()}`);

const createWebhook = async ({ url, secret, events = ['message.received'] }) =>
  openwaFetch(`/sessions/${OPENWA_SESSION_ID()}/webhooks`, {
    method: 'POST',
    body: { url, secret, events, active: true },
  });

const listWebhooks = async () =>
  openwaFetch(`/sessions/${OPENWA_SESSION_ID()}/webhooks`);

module.exports = {
  sendText,
  getSessionStatus,
  createWebhook,
  listWebhooks,
  OPENWA_SESSION_ID,
};
