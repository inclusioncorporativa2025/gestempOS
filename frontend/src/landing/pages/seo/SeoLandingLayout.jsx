import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { BRAND_NAME } from '../../../constants/brand';
import { LANDING_ROUTES } from '../../../constants/routes';
import { getAppLoginHref, getAppRegisterHref } from '../../../utils/appLinks';
import BrandLogo from '../../../components/BrandLogo';
import LandingFooter from '../../components/LandingFooter';
import LandingPlexusBackground from '../../components/LandingPlexusBackground';
import LandingReveal from '../../components/LandingReveal';
import '../../pages/LandingPage.css';
import './SeoLandingLayout.css';

const NavLink = ({ href, external, children }) =>
  external ? (
    <a href={href} className="landing-header-link">
      {children}
    </a>
  ) : (
    <Link to={href} className="landing-header-link">
      {children}
    </Link>
  );

const SeoLandingLayout = ({
  eyebrow,
  title,
  lead,
  heroVisual,
  onDemoClick,
  children,
  ctaTitle = 'Empieza a fichar digitalmente hoy',
  ctaLead = '15 días de prueba gratis. Sin tarjeta. Configura tu empresa en minutos.',
}) => {
  const loginHref = getAppLoginHref();
  const registerHref = getAppRegisterHref();
  const loginIsExternal = loginHref.startsWith('http');
  const registerIsExternal = registerHref.startsWith('http');

  return (
    <div className="landing gradient-bg seo-landing">
      <LandingPlexusBackground />
      <div className="landing-surface">
        <div className="landing-header-shell">
          <header className="landing-header">
            <div className="landing-header-inner">
              <Link to={LANDING_ROUTES.home} title={`${BRAND_NAME} — Inicio`}>
                <BrandLogo className="landing-logo" variant="header" />
              </Link>
              <nav className="landing-header-nav" aria-label="Acciones">
                <NavLink href={loginHref} external={loginIsExternal}>
                  Acceder
                </NavLink>
                {registerIsExternal ? (
                  <Button
                    type="primary"
                    href={registerHref}
                    className="landing-cta-header landing-cta-start"
                  >
                    Empieza gratis
                  </Button>
                ) : (
                  <Link to={registerHref}>
                    <Button type="primary" className="landing-cta-header landing-cta-start">
                      Empieza gratis
                    </Button>
                  </Link>
                )}
              </nav>
            </div>
          </header>
        </div>

        <section className="landing-hero seo-landing__hero">
          <div className="landing-container landing-hero-inner">
            <LandingReveal className="landing-hero-copy">
              {eyebrow ? <p className="landing-eyebrow">{eyebrow}</p> : null}
              <h1 className="landing-title">{title}</h1>
              <p className="landing-lead">{lead}</p>
              <div className="landing-hero-actions">
                {registerIsExternal ? (
                  <Button
                    type="primary"
                    size="large"
                    href={registerHref}
                    className="landing-cta-start landing-hero-cta-primary"
                  >
                    Prueba gratis 15 días
                  </Button>
                ) : (
                  <Link to={registerHref}>
                    <Button
                      type="primary"
                      size="large"
                      className="landing-cta-start landing-hero-cta-primary"
                    >
                      Prueba gratis 15 días
                    </Button>
                  </Link>
                )}
                {onDemoClick ? (
                  <Button
                    type="default"
                    size="large"
                    className="landing-hero-login landing-hero-cta-secondary"
                    onClick={onDemoClick}
                  >
                    Solicitar demo
                  </Button>
                ) : null}
              </div>
            </LandingReveal>
            {heroVisual ? (
              <LandingReveal className="landing-hero-visual" delay={160}>
                {heroVisual}
              </LandingReveal>
            ) : null}
          </div>
        </section>

        <main className="seo-landing__main">{children}</main>

        <section className="seo-landing__cta-band" aria-labelledby="seo-landing-cta-title">
          <div className="landing-container seo-landing__cta-inner">
            <h2 id="seo-landing-cta-title" className="seo-landing__cta-title">
              {ctaTitle}
            </h2>
            <p className="seo-landing__cta-lead">{ctaLead}</p>
            <div className="seo-landing__cta-actions">
              {registerIsExternal ? (
                <Button type="primary" size="large" href={registerHref} className="landing-cta-start">
                  Crear cuenta gratis
                </Button>
              ) : (
                <Link to={registerHref}>
                  <Button type="primary" size="large" className="landing-cta-start">
                    Crear cuenta gratis
                  </Button>
                </Link>
              )}
              <Link to={LANDING_ROUTES.home} className="seo-landing__cta-link">
                Ver todos los planes
              </Link>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </div>
  );
};

export default SeoLandingLayout;
