import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LANDING_ROUTES } from '../../constants/routes';
import { LANDING_URL } from '../../constants/urls';
import { SUPPORT_EMAIL, supportMailtoHref } from '../../constants/support';
import { getAppLoginHref, getAppRegisterHref } from '../../utils/appLinks';
import { BRAND_NAME } from '../../constants/brand';
import './LandingFooter.css';

const FooterLink = ({ href, external, children, title }) =>
  external ? (
    <a href={href} className="landing-footer-link" title={title} rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link to={href} className="landing-footer-link" title={title}>
      {children}
    </Link>
  );

const FooterColumn = ({ title, links, ariaLabel }) => (
  <nav className="landing-footer-col" aria-label={ariaLabel}>
    <h3 className="landing-footer-col-title">{title}</h3>
    <ul className="landing-footer-col-list">
      {links.map(({ label, href, external, title }) => (
        <li key={label}>
          <FooterLink href={href} external={external} title={title || label}>
            {label}
          </FooterLink>
        </li>
      ))}
    </ul>
  </nav>
);

const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND_NAME,
  url: LANDING_URL,
  description:
    'Software de control horario y registro de jornada laboral para empresas en España.',
  email: SUPPORT_EMAIL,
  areaServed: 'ES',
  knowsAbout: [
    'Control horario',
    'Registro de jornada',
    'Fichaje digital',
    'Gestión de equipos',
  ],
};

const LandingFooter = () => {
  const loginHref = getAppLoginHref();
  const registerHref = getAppRegisterHref();
  const loginIsExternal = loginHref.startsWith('http');
  const registerIsExternal = registerHref.startsWith('http');
  const year = new Date().getFullYear();

  useEffect(() => {
    const scriptId = 'landing-organization-schema';
    if (document.getElementById(scriptId)) return undefined;

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ORGANIZATION_SCHEMA);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, []);

  const productLinks = [
    {
      label: 'Funcionalidades',
      href: LANDING_ROUTES.features,
      title: 'Funcionalidades de fichaje y control horario',
    },
    {
      label: 'Planes y precios',
      href: LANDING_ROUTES.plans,
      title: 'Planes de control horario para empresas',
    },
    {
      label: 'Prueba gratuita',
      href: registerHref,
      external: registerIsExternal,
      title: 'Registro gratuito de empresas',
    },
  ];

  const companyLinks = [
    {
      label: 'Acceso clientes',
      href: loginHref,
      external: loginIsExternal,
      title: 'Acceder a la aplicación de fichaje',
    },
    {
      label: 'Contacto',
      href: supportMailtoHref,
      external: true,
      title: `Contactar con soporte en ${SUPPORT_EMAIL}`,
    },
    {
      label: 'Soporte técnico',
      href: supportMailtoHref,
      external: true,
      title: 'Solicitar ayuda con el registro de jornada',
    },
  ];

  const solutionLinks = [
    {
      label: 'Fichaje digital',
      href: LANDING_ROUTES.features,
      title: 'Fichaje digital conforme a la normativa',
    },
    {
      label: 'Gestión de equipos',
      href: LANDING_ROUTES.features,
      title: 'Gestión de personal y supervisores',
    },
    {
      label: 'Informes de jornada',
      href: LANDING_ROUTES.features,
      title: 'Informes y exportación para RR. HH.',
    },
  ];

  const legalLinks = [
    { label: 'Aviso legal', href: LANDING_ROUTES.legalNotice },
    { label: 'Política de privacidad', href: LANDING_ROUTES.privacy },
    { label: 'Política de cookies', href: LANDING_ROUTES.cookies },
    { label: 'Términos y condiciones', href: LANDING_ROUTES.terms },
  ];

  return (
    <footer className="landing-footer" role="contentinfo">
      <div className="landing-footer-inner">
        <div className="landing-footer-main">
          <div className="landing-footer-brand">
            <Link
              to={LANDING_ROUTES.home}
              className="landing-footer-logo"
              title={`${BRAND_NAME} — Software de control horario`}
            >
              {BRAND_NAME}
            </Link>
            <p className="landing-footer-tagline">
              Software de control horario y registro de jornada laboral para empresas.
              Fichaje digital, gestión de equipos e informes en un solo panel.
            </p>
          </div>

          <div className="landing-footer-columns">
            <FooterColumn
              title="Producto"
              ariaLabel="Enlaces del producto"
              links={productLinks}
            />
            <FooterColumn
              title="Solución"
              ariaLabel="Enlaces sobre la solución de control horario"
              links={solutionLinks}
            />
            <FooterColumn
              title="Empresa"
              ariaLabel="Enlaces de empresa y acceso"
              links={companyLinks}
            />
          </div>
        </div>

        <div className="landing-footer-legal">
          <p className="landing-footer-copy">
            © {year} {BRAND_NAME}. Todos los derechos reservados.
          </p>
          <nav className="landing-footer-legal-nav" aria-label="Enlaces legales">
            {legalLinks.map(({ label, href }, index) => (
              <React.Fragment key={label}>
                {index > 0 && (
                  <span className="landing-footer-legal-sep" aria-hidden="true">
                    ·
                  </span>
                )}
                <Link to={href} className="landing-footer-legal-link" title={label}>
                  {label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
