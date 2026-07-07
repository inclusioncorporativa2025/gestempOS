const CALENDLY_API_TOKEN = process.env.CALENDLY_API_TOKEN || '';

const isConfigured = () => Boolean(CALENDLY_API_TOKEN);

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const deriveEventUriFromInviteeUri = (inviteeUri) => {
  const match = String(inviteeUri || '').match(
    /^(https:\/\/api\.calendly\.com\/scheduled_events\/[^/]+)/,
  );
  return match ? match[1] : '';
};

const calendlyGet = async (url) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CALENDLY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`Calendly API ${response.status}: ${body || response.statusText}`);
    error.status = response.status;
    error.code = 'CALENDLY_API_FAILED';
    throw error;
  }

  const json = await response.json();
  return json.resource || json;
};

const resolveBookingFromUris = async ({ inviteeUri, eventUri }) => {
  const resolvedEventUri = eventUri || deriveEventUriFromInviteeUri(inviteeUri);

  if (!inviteeUri && !resolvedEventUri) {
    const error = new Error('Faltan URIs de Calendly');
    error.code = 'CALENDLY_URI_MISSING';
    throw error;
  }

  const retryDelaysMs = [0, 1500, 3000];
  let lastError;

  for (const delayMs of retryDelaysMs) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    try {
      const [inviteeResource, eventResource] = await Promise.all([
        inviteeUri ? calendlyGet(inviteeUri) : Promise.resolve(null),
        resolvedEventUri ? calendlyGet(resolvedEventUri) : Promise.resolve(null),
      ]);

      if (inviteeResource?.email) {
        return {
          invitee: inviteeResource,
          event: eventResource || {},
        };
      }

      lastError = new Error('Invitee sin email en respuesta de Calendly');
      lastError.code = 'CALENDLY_SIN_EMAIL';
    } catch (error) {
      lastError = error;
      if (error.status === 404) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('No se pudo resolver la reserva en Calendly');
};

module.exports = {
  isConfigured,
  deriveEventUriFromInviteeUri,
  resolveBookingFromUris,
};
