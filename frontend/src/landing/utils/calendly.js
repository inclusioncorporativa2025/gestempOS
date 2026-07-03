const DEFAULT_CALENDLY_URL = 'https://calendly.com/inclusioncorporativa-info/timecor-demo';

export const CALENDLY_DEMO_URL = (
  import.meta.env.VITE_CALENDLY_DEMO_URL
  || import.meta.env.REACT_APP_CALENDLY_DEMO_URL
  || DEFAULT_CALENDLY_URL
).replace(/\/$/, '');

export const buildCalendlyEmbedUrl = (
  baseUrl = CALENDLY_DEMO_URL,
  { hideDetails = false } = {},
) => {
  const url = new URL(baseUrl);
  url.searchParams.set('embed_type', 'Inline');
  url.searchParams.set('embed_domain', window.location.hostname || 'localhost');
  url.searchParams.set('hide_gdpr_banner', '1');
  url.searchParams.set('background_color', 'ffffff');
  url.searchParams.set('primary_color', 'a85ce0');
  if (hideDetails) {
    url.searchParams.set('hide_event_type_details', '1');
    url.searchParams.set('hide_landing_page_details', '1');
  }
  return url.toString();
};
