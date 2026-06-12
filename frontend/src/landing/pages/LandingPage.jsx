import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import {
  ClockCircleOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { getAppLoginHref, getAppRegisterHref } from '../../utils/appLinks';
import { PLANS } from '../../constants/plans';
import LandingFooter from '../components/LandingFooter';
import './LandingPage.css';

const PlanCta = ({ href, external, featured, children }) => {
  const className = featured
    ? 'landing-plan-cta landing-plan-cta--primary'
    : 'landing-plan-cta landing-plan-cta--outline';

  if (external) {
    return (
      <Button type={featured ? 'primary' : 'default'} href={href} className={className} block>
        {children}
      </Button>
    );
  }

  return (
    <Link to={href}>
      <Button type={featured ? 'primary' : 'default'} className={className} block>
        {children}
      </Button>
    </Link>
  );
};

const features = [
  {
    icon: <ClockCircleOutlined />,
    title: 'Fichaje digital',
    text: 'Entrada, salida y pausas desde el móvil o el ordenador, con registro horario conforme a la normativa.',
  },
  {
    icon: <TeamOutlined />,
    title: 'Gestión de equipos',
    text: 'Altas, supervisores e inspectores en un solo panel. Control de licencias por empresa.',
  },
  {
    icon: <BarChartOutlined />,
    title: 'Informes y calendario',
    text: 'Consulta de fichajes, ausencias, festivos y exportación para tu departamento de RR. HH.',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: 'Seguridad',
    text: 'Acceso por roles, sesión protegida y restablecimiento de contraseña con enlace seguro.',
  },
];

const CtaButton = ({ href, external, className, size, children }) =>
  external ? (
    <Button type="primary" href={href} className={className} size={size}>
      {children}
    </Button>
  ) : (
    <Link to={href}>
      <Button type="primary" className={className} size={size}>
        {children}
      </Button>
    </Link>
  );

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

const LandingPage = () => {
  const loginHref = getAppLoginHref();
  const registerHref = getAppRegisterHref();
  const loginIsExternal = loginHref.startsWith('http');
  const registerIsExternal = registerHref.startsWith('http');

  return (
    <div className="landing gradient-bg">
      <div className="landing-header-shell">
        <header className="landing-header">
          <div className="landing-header-inner">
            <span className="landing-logo">Ficha en el trabajo</span>
            <nav className="landing-header-nav" aria-label="Acciones">
              <NavLink href={loginHref} external={loginIsExternal}>
                Acceder
              </NavLink>
              <CtaButton
                href={registerHref}
                external={registerIsExternal}
                className="landing-cta-header landing-cta-start"
              >
                Empieza gratis
              </CtaButton>
            </nav>
          </div>
        </header>
      </div>

      <section className="landing-hero">
        <div className="landing-container landing-hero-inner">
          <p className="landing-eyebrow">Control horario para empresas</p>
          <h1 className="landing-title">
            El registro de jornada que tu equipo usa cada día
          </h1>
          <p className="landing-lead">
            Centraliza fichajes, permisos y configuración por empresa. Simple para el
            empleado, potente para el gestor.
          </p>
          <div className="landing-hero-actions">
            <CtaButton
              href={registerHref}
              external={registerIsExternal}
              className="landing-cta-start"
              size="large"
            >
              Empieza gratis
            </CtaButton>
            {loginIsExternal ? (
              <Button type="default" size="large" href={loginHref} className="landing-hero-login">
                Acceder
              </Button>
            ) : (
              <Link to={loginHref}>
                <Button type="default" size="large" className="landing-hero-login">
                  Acceder
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section
        id="planes"
        className="landing-plans"
        aria-labelledby="landing-plans-title"
      >
        <div className="landing-container">
          <h2 id="landing-plans-title" className="landing-plans-title">
            Compara todos los planes.
          </h2>
          <p className="landing-plans-lead">
            Elige qué incluye cada plan y encuentra el que mejor se adapta a tu negocio.
          </p>

          <ul className="landing-plans-grid">
            {PLANS.map((plan) => (
              <li
                key={plan.id}
                className={`landing-plan-item${plan.bestseller ? ' landing-plan-item--bestseller' : ''}`}
              >
                {plan.bestseller && (
                  <span className="landing-plan-bestseller">Más vendido</span>
                )}
                <article
                  className={`landing-plan-card landing-plan-card--${plan.variant}${
                    plan.featured ? ' landing-plan-card--featured' : ''
                  }`}
                >
                  <div className="landing-plan-card-top">
                    <div className="landing-plan-card-gradient" aria-hidden />
                    <span className="landing-plan-badge">{plan.name}</span>
                  </div>
                  <div className="landing-plan-card-body">
                    <p className="landing-plan-price">
                      <span className="landing-plan-price-from">desde</span>{' '}
                      <strong>{plan.price} €</strong>
                      <span className="landing-plan-price-unit">/ licencia / mes</span>
                    </p>
                    <p className="landing-plan-min">
                      Mín. {plan.minLicenses} licencias
                    </p>
                    <p className="landing-plan-desc">{plan.description}</p>
                    <ul className="landing-plan-features">
                      {plan.features.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <div className="landing-plan-cta-wrap">
                      <PlanCta
                        href={registerHref}
                        external={registerIsExternal}
                        featured={plan.featured}
                      >
                        Empezar prueba gratuita
                      </PlanCta>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="funcionalidades"
        className="landing-features"
        aria-labelledby="landing-features-title"
      >
        <div className="landing-container">
          <h2 id="landing-features-title" className="landing-section-title">
            Todo lo que necesitas
          </h2>
          <ul className="landing-feature-grid">
            {features.map((item) => (
              <li key={item.title} className="landing-feature-card">
                <span className="landing-feature-icon" aria-hidden>
                  {item.icon}
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default LandingPage;
