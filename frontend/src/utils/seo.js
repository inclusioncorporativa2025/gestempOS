import { LANDING_URL } from '../constants/urls';
import { isAppSubdomain } from './host';
import { isLegalPath } from './appLinks';

export const SEO_DEFAULTS = {
  title: 'Timecor — Software de fichaje digital y control horario | Prueba gratis',
  description:
    'Fichaje digital conforme a la normativa española. Registro de jornada, informes para inspección y gestión de equipos. 15 días gratis. Desde 2,50 €/usuario.',
  image: `${LANDING_URL}/landing/hero.png`,
};

const LEGAL_PAGES = {
  '/aviso-legal': {
    title: 'Aviso legal | Timecor',
    description: 'Aviso legal y datos identificativos del titular de Timecor, software de fichaje digital y control horario.',
  },
  '/politica-privacidad': {
    title: 'Política de privacidad | Timecor',
    description: 'Política de privacidad de Timecor: tratamiento de datos personales en el software de control horario.',
  },
  '/politica-cookies': {
    title: 'Política de cookies | Timecor',
    description: 'Información sobre el uso de cookies en la web de Timecor, software de fichaje digital.',
  },
  '/terminos-condiciones': {
    title: 'Términos y condiciones | Timecor',
    description: 'Condiciones generales de contratación del servicio Timecor de registro de jornada laboral.',
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
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Timecor' });
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
    return { title: 'Timecor', noindex: true };
  }

  if (pathname === '/') {
    return { path: '/' };
  }

  if (isLegalPath(pathname)) {
    const legal = LEGAL_PAGES[pathname];
    return { ...legal, path: pathname };
  }

  return { title: 'Timecor', noindex: true };
};
