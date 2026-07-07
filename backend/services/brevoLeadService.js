const {
  mapLeadToBrevoContact,
  mapLeadToDemoSolicitadaEvent,
} = require('../utils/brevoLeadMapper');

const BREVO_API_BASE = 'https://api.brevo.com/v3';

const getBrevoConfig = () => ({
  apiKey: process.env.BREVO_API_KEY || process.env.BREVO_API || '',
  listId: Number.parseInt(process.env.BREVO_LIST_ID, 10) || 0,
  enabled: process.env.BREVO_ENABLED !== 'false',
});

const TIME_EVENTS = {
  DEMO_SOLICITADA: 'time_demo_solicitada',
  LEAD_CONTACTADO: 'time_lead_contactado',
  DEMO_REALIZADA: 'time_demo_realizada',
  LEAD_SE_LO_VA_PENSAR: 'time_lead_se_lo_va_pensar',
  LEAD_CONTRATADO: 'time_lead_contratado',
  LEAD_PERDIDO: 'time_lead_perdido',
  LEAD_NO_SHOW: 'time_lead_no_show',
};

const isConfigured = () => {
  const { apiKey, enabled } = getBrevoConfig();
  return Boolean(apiKey && enabled);
};

const brevoRequest = async (path, { method = 'GET', body } = {}) => {
  const { apiKey } = getBrevoConfig();

  const response = await fetch(`${BREVO_API_BASE}${path}`, {
    method,
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text().catch(() => '');

  if (!response.ok) {
    const error = new Error(`Brevo respondió ${response.status}: ${text || response.statusText}`);
    error.code = 'BREVO_REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const addContactToList = async (email, listId) => {
  if (!listId || !email) return null;

  try {
    return await brevoRequest(`/contacts/lists/${listId}/contacts/add`, {
      method: 'POST',
      body: {
        emails: [String(email).trim().toLowerCase()],
      },
    });
  } catch (error) {
    const alreadyInList = error.status === 400
      && String(error.message).includes('already in list');

    if (alreadyInList) {
      return null;
    }

    throw error;
  }
};

const upsertContact = async (lead = {}, context = {}) => {
  const { listId } = getBrevoConfig();
  const contact = mapLeadToBrevoContact(lead, context);

  if (!contact.email) {
    const error = new Error('Email obligatorio para Brevo');
    error.code = 'BREVO_SIN_EMAIL';
    throw error;
  }

  const buildPayload = (attributes) => {
    const payload = {
      email: contact.email,
      attributes,
      updateEnabled: true,
    };

    if (listId > 0) {
      payload.listIds = [listId];
    }

    return payload;
  };

  let result;

  try {
    result = await brevoRequest('/contacts', {
      method: 'POST',
      body: buildPayload(contact.attributes),
    });
  } catch (error) {
    const isDuplicateSms = error.status === 400
      && String(error.message).includes('SMS is already associated');

    if (!isDuplicateSms) {
      throw error;
    }

    const { SMS, ...attributesWithoutSms } = contact.attributes;
    result = await brevoRequest('/contacts', {
      method: 'POST',
      body: buildPayload(attributesWithoutSms),
    });
  }

  if (listId > 0) {
    await addContactToList(contact.email, listId);
  }

  return result;
};

const trackEvent = async (eventName, email, eventProperties = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    const error = new Error('Email obligatorio para evento Brevo');
    error.code = 'BREVO_SIN_EMAIL';
    throw error;
  }

  if (!eventName) {
    const error = new Error('Nombre de evento obligatorio');
    error.code = 'BREVO_SIN_EVENTO';
    throw error;
  }

  const properties = Object.fromEntries(
    Object.entries(eventProperties).filter(([, value]) => value !== '' && value != null),
  );

  return brevoRequest('/events', {
    method: 'POST',
    body: {
      event_name: eventName,
      identifiers: {
        email_id: normalizedEmail,
      },
      event_properties: properties,
    },
  });
};

const syncDemoLeadToBrevo = async (lead = {}, context = {}) => {
  if (!isConfigured()) {
    const error = new Error('Brevo no configurado');
    error.code = 'BREVO_NO_CONFIGURADO';
    throw error;
  }

  await upsertContact(lead, context);

  const eventProperties = mapLeadToDemoSolicitadaEvent(lead, context);
  await trackEvent(TIME_EVENTS.DEMO_SOLICITADA, lead.email, eventProperties);

  const { listId } = getBrevoConfig();

  return {
    ok: true,
    email: lead.email,
    event: TIME_EVENTS.DEMO_SOLICITADA,
    listId: listId || null,
  };
};

const trackLeadStatusEvent = async (email, eventName, eventProperties = {}) => {
  if (!isConfigured()) {
    const error = new Error('Brevo no configurado');
    error.code = 'BREVO_NO_CONFIGURADO';
    throw error;
  }

  await trackEvent(eventName, email, eventProperties);

  return {
    ok: true,
    email,
    event: eventName,
  };
};

module.exports = {
  TIME_EVENTS,
  isConfigured,
  upsertContact,
  trackEvent,
  syncDemoLeadToBrevo,
  trackLeadStatusEvent,
};
