import { BRAND_NAME } from '../constants/brand';
import { LANDING_URL } from '../constants/urls';
import { isAppSubdomain } from './host';
import { isIndexableLandingPath, isLegalPath, isSeoLandingPath } from './appLinks';

export const SEO_DEFAULTS = {
  title: `${BRAND_NAME} — Software de fichaje digital y control horario | Prueba gratis`,
  description:
    'Fichaje digital conforme a la normativa española. Registro de jornada, informes para inspección y gestión de equipos. 15 días gratis. Desde 2,50 €/usuario.',
  image: `${LANDING_URL}/landing/hero.png`,
};

const SEO_LANDING_PAGES = {
  '/fichaje-digital': {
    title: `Fichaje digital para empresas | Software control horario — ${BRAND_NAME}`,
    description:
      'Software de fichaje digital conforme a la normativa española. Registro de jornada laboral, informes para inspecciones y gestión de equipos. Prueba gratis 15 días.',
  },
};

const LEGAL_PAGES = {
  '/aviso-legal': {
    title: `Aviso legal | ${BRAND_NAME}`,
    description: `Aviso legal y datos identificativos del titular de ${BRAND_NAME}, software de fichaje digital y control horario.`,
  },
  '/politica-privacidad': {
    title: `Política de privacidad | ${BRAND_NAME}`,
    description: `Política de privacidad de ${BRAND_NAME}: tratamiento de datos personales en el software de control horario.`,
  },
  '/politica-cookies': {
    title: `Política de cookies | ${BRAND_NAME}`,
    description: `Información sobre el uso de cookies en la web de ${BRAND_NAME}, software de fichaje digital.`,
  },
  '/terminos-condiciones': {
    title: `Términos y condiciones | ${BRAND_NAME}`,
    description: `Condiciones generales de contratación del servicio ${BRAND_NAME} de registro de jornada laboral.`,
  },
};

const upsertMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
};

const upsertLink = (rel, href) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

/** Actualiza title, description, Open Graph, Twitter y canonical. */
export const applyPageSeo = ({ title, description, path = '/', noindex = false } = {}) => {
  const resolvedTitle = title || SEO_DEFAULTS.title;
  const resolvedDescription = description || SEO_DEFAULTS.description;
  const canonical = `${LANDING_URL}${path === '/' ? '' : path}`;

  document.title = resolvedTitle;

  upsertMeta('meta[name="description"]', { name: 'description', content: resolvedDescription });
  upsertMeta('meta[name="robots"]', {
    name: 'robots',
    content: noindex ? 'noindex, nofollow' : 'index, follow',
  });

  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: BRAND_NAME });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: resolvedTitle });
  upsertMeta('meta[property="og:description"]', {
    property: 'og:description',
    content: resolvedDescription,
  });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: SEO_DEFAULTS.image });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'es_ES' });

  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: resolvedTitle });
  upsertMeta('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: resolvedDescription,
  });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: SEO_DEFAULTS.image });

  if (!noindex) {
    upsertLink('canonical', canonical);
  } else {
    document.head.querySelector('link[rel="canonical"]')?.remove();
  }
};

/** SEO según host y ruta actual (landing indexable, app noindex). */
export const resolveSeoForPath = (pathname) => {
  if (isAppSubdomain()) {
    return { title: BRAND_NAME, noindex: true };
  }

  if (pathname === '/') {
    return { path: '/' };
  }

  if (isSeoLandingPath(pathname)) {
    const seoLanding = SEO_LANDING_PAGES[pathname];
    return { ...seoLanding, path: pathname };
  }

  if (isLegalPath(pathname)) {
    const legal = LEGAL_PAGES[pathname];
    return { ...legal, path: pathname };
  }

  if (!isIndexableLandingPath(pathname)) {
    return { title: BRAND_NAME, noindex: true };
  }

  return { path: pathname };
};
