import { getLandingApiBase } from './calendlyLead';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];

export const isDemoDeepLink = (search = '') => {
  const normalized = search.startsWith('?') ? search : `?${search}`;
  const demo = new URLSearchParams(normalized).get('demo');
  return demo === '1' || demo === 'true';
};

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

/** Guarda UTMs y detecta ?demo=1 (también tras bfcache al volver desde email). */
export const syncLandingCampaignFromUrl = () => {
  if (typeof window === 'undefined') {
    return { openDemo: false };
  }

  getStoredUtmParams();

  return {
    openDemo: isDemoDeepLink(window.location.search),
  };
};

export const notifyCalendlyBooking = async ({ invitee, event }) => {
  const hasEmail = Boolean(invitee?.email || invitee?.invitee?.email);
  const hasUri = Boolean(invitee?.uri || event?.uri);

  if (!hasEmail && !hasUri) {
    console.warn('[Calendly → Make] postMessage sin email ni URI:', { invitee, event });
    return;
  }

  const endpoint = `${getLandingApiBase()}landing/demo-lead`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        invitee: invitee || {},
        event: event || {},
        utm: getStoredUtmParams(),
        origen: 'landing_timecor',
        evento: 'demo_solicitada',
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn('[Calendly → Make] Error al registrar lead:', response.status, endpoint, body);
      return;
    }

    console.info('[Calendly → Make] Lead registrado');
  } catch (error) {
    console.warn('[Calendly → Make] No se pudo contactar con el backend:', endpoint, error.message);
  }
};
