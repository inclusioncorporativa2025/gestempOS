const MAKE_LEAD_WEBHOOK_URL = process.env.MAKE_LEAD_WEBHOOK_URL || '';
const MAKE_LEAD_WEBHOOK_API_KEY = process.env.MAKE_LEAD_WEBHOOK_API_KEY || '';
const MAKE_LEAD_WEBHOOK_API_HEADER = process.env.MAKE_LEAD_WEBHOOK_API_HEADER || 'x-make-apikey';

const isConfigured = () => Boolean(MAKE_LEAD_WEBHOOK_URL);

const sendLeadToMake = async (leadPayload) => {
  if (!MAKE_LEAD_WEBHOOK_URL) {
    const error = new Error('MAKE_LEAD_WEBHOOK_URL no configurada');
    error.code = 'MAKE_NO_CONFIGURADO';
    throw error;
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (MAKE_LEAD_WEBHOOK_API_KEY) {
    headers[MAKE_LEAD_WEBHOOK_API_HEADER] = MAKE_LEAD_WEBHOOK_API_KEY;
  }

  const response = await fetch(MAKE_LEAD_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(leadPayload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`Make respondió ${response.status}: ${body || response.statusText}`);
    error.code = 'MAKE_REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }

  return {
    ok: true,
    status: response.status,
    body: await response.text().catch(() => ''),
  };
};

module.exports = {
  isConfigured,
  sendLeadToMake,
};
