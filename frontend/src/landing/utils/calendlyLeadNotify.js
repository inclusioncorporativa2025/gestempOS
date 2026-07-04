import { getLandingApiBase } from './calendlyLead';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];

export const getStoredUtmParams = () => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = sessionStorage.getItem('timecor_utm');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  const params = new URLSearchParams(window.location.search);
  const utm = Object.fromEntries(
    UTM_KEYS
      .filter((key) => params.get(key))
      .map((key) => [key, params.get(key)]),
  );

  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem('timecor_utm', JSON.stringify(utm));
  }

  return utm;
};

export const notifyCalendlyBooking = async ({ invitee, event }) => {
  if (!invitee?.email) return;

  const endpoint = `${getLandingApiBase()}landing/demo-lead`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        invitee,
        event,
        utm: getStoredUtmParams(),
        origen: 'landing_timecor',
        evento: 'demo_solicitada',
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn('[Calendly → Make] Error al registrar lead:', response.status, endpoint, body);
    }
  } catch (error) {
    console.warn('[Calendly → Make] No se pudo contactar con el backend:', endpoint, error.message);
  }
};
