import { getLandingApiBase } from './calendlyLead';
import { getStoredUtmParams } from './calendlyLeadNotify';

export const submitDemoLead = async (fields) => {
  const endpoint = `${getLandingApiBase()}landing/demo-lead`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...fields,
        utm: getStoredUtmParams(),
        consentimiento_rgpd: fields.consentimiento_rgpd ?? false,
      }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(body || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json().catch(() => ({}));
};
