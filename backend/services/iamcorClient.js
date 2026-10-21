const baseUrl = () => {
  const url = (process.env.IAMCOR_API_URL || '').replace(/\/$/, '');
  return url || null;
};

const integrationSecret = () => {
  const secret = (process.env.IAMCOR_INTEGRATION_SECRET || '').trim();
  if (!secret || secret.length < 32) {
    return null;
  }
  return secret;
};

const appCode = () =>
  (process.env.IAMCOR_APP_CODE || 'TIMECOR').trim().toUpperCase();

const isConfigured = () => Boolean(baseUrl());

class IamcorApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'IamcorApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseEnvelope(res) {
  let body;
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  return body;
}

async function iamcorLoginApp({ email, password }) {
  const url = baseUrl();
  if (!url) {
    throw new IamcorApiError(503, 'IAMCOR_NOT_CONFIGURED', 'IAMCOR_API_URL no configurada');
  }

  const res = await fetch(`${url}/auth/login/app`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      app_codigo: appCode(),
    }),
  });

  const body = await parseEnvelope(res);
  if (!res.ok || body.success === false) {
    const code = body.error?.code || 'IAMCOR_ERROR';
    const message = body.error?.message || 'Error al autenticar con IAMCOR';
    throw new IamcorApiError(res.status, code, message);
  }

  return body.data;
}

async function iamcorProvisionLegacyUser({
  email,
  password,
  nombre,
  apellido1,
  apellido2,
}) {
  const url = baseUrl();
  const secret = integrationSecret();
  if (!url || !secret) {
    throw new IamcorApiError(
      503,
      'IAMCOR_INTEGRATION_NOT_CONFIGURED',
      'IAMCOR_API_URL o IAMCOR_INTEGRATION_SECRET no configurados',
    );
  }

  const res = await fetch(`${url}/integrations/provision-legacy-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-IAMCOR-Integration-Secret': secret,
    },
    body: JSON.stringify({
      email,
      password,
      app_codigo: appCode(),
      nombre,
      apellido1,
      apellido2,
    }),
  });

  const body = await parseEnvelope(res);
  if (!res.ok || body.success === false) {
    const code = body.error?.code || 'IAMCOR_ERROR';
    const message = body.error?.message || 'Error al provisionar en IAMCOR';
    throw new IamcorApiError(res.status, code, message);
  }

  return body.data;
}

module.exports = {
  IamcorApiError,
  iamcorLoginApp,
  iamcorProvisionLegacyUser,
  isIamcorClientConfigured,
};

function isIamcorClientConfigured() {
  return isConfigured();
}
