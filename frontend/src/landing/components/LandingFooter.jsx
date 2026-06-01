import React from 'react';
import { Link } from 'react-router-dom';
import { getAppLoginHref, getAppRegisterHref } from '../../utils/appLinks';
import './LandingFooter.css';

const FooterLink = ({ href, external, children }) =>
  external ? (
    <a href={href} className="landing-footer-link">
      {children}
    </a>
  ) : (
    <Link to={href} className="landing-footer-link">
      {children}
    </Link>
  );

const LandingFooter = () => {
  const loginHref = getAppLoginHref();
  const registerHref = getAppRegisterHref();
  const loginIsExternal = loginHref.startsWith('http');
  const registerIsExternal = registerHref.startsWith('http');
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <span className="landing-footer-logo">Ficha en el trabajo</span>
          <p className="landing-footer-tagline">Control horario para empresas</p>
        </div>

        <nav className="landing-footer-nav" aria-label="Enlaces del pie de página">
          <FooterLink href={loginHref} external={loginIsExternal}>
            Acceso clientes
          </FooterLink>
          <FooterLink href={registerHref} external={registerIsExternal}>
            Empieza gratis
          </FooterLink>
        </nav>

        <p className="landing-footer-copy">
          © {year} Ficha en el trabajo. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default LandingFooter;
