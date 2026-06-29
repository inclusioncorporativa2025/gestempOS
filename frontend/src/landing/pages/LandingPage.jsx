import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  FileProtectOutlined,
  HistoryOutlined,
  SolutionOutlined,
  CalendarOutlined,
  SyncOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { getAppLoginHref, getAppRegisterHref } from '../../utils/appLinks';
import { PLANS, PLAN_COMPARISON_ROWS, ANNUAL_DISCOUNT_LABEL, getPlanMinAnnual, LICENSE_IS_USER_NOTE, PRICES_EXCLUDE_TAX_NOTE, PRICE_UNIT_MONTHLY, PRICE_UNIT_ANNUAL, MIN_USERS_LABEL } from '../../constants/plans';
import LandingFooter from '../components/LandingFooter';
import LandingHeroVisual from '../components/LandingHeroVisual';
import LandingPlexusBackground from '../components/LandingPlexusBackground';
import LandingReveal from '../components/LandingReveal';
import LandingStats from '../components/LandingStats';
import BrandLogo from '../../components/BrandLogo';
import './LandingPage.css';

/** Capturas del producto en el hero (rotación automática). */
const LANDING_HERO_IMAGES = [
  {
    src: '/landing/hero.png',
    alt: 'Pantalla de fichaje en Timecor',
  },
  {
    src: '/landing/hero-gestion-tiempo.png',
    alt: 'Gestión de tiempo en tiempo real en Timecor',
  },
  {
    src: '/landing/hero-personal.png',
    alt: 'Listado de personal en Timecor',
  },
];

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

const complianceItems = [
  {
    icon: <FileProtectOutlined />,
    text: 'Informes y listados oficiales para la Inspección de Trabajo',
  },
  {
    icon: <HistoryOutlined />,
    text: 'Resúmenes mensuales requeridos por ley durante 4 años',
  },
  {
    icon: <SolutionOutlined />,
    text: 'Informe mensual de horas extraordinarias disponible para los representantes de los trabajadores',
  },
];

const absenceItems = [
  {
    icon: <CalendarOutlined />,
    text: 'Vacaciones, permisos y bajas en el mismo calendario que la jornada de cada empleado',
  },
  {
    icon: <SyncOutlined />,
    text: 'Festivos, ausencias aprobadas y fichajes en una sola vista, sin hojas de cálculo aparte',
  },
  {
    icon: <CheckCircleOutlined />,
    text: 'Solicitud, aprobación del gestor y saldo de vacaciones siempre alineados con el registro horario',
  },
];

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

const PLAN_UNAVAILABLE_TOOLTIP =
  'No disponible por el momento, disculpen las molestias';

const PlanCompareCell = ({ included }) => {
  if (!included) {
    return <span className="landing-compare-dash" aria-hidden>—</span>;
  }
  return (
    <span className="landing-compare-check" aria-hidden>✓</span>
  );
};

const PlanBillingToggle = ({ billingPeriod, onChange, variant = 'standalone' }) => {
  const isInCard = variant === 'in-card';
  const monthlyLabel = isInCard ? 'Mensual' : 'Pago por mes';

  return (
    <div
      className={`landing-plans-billing landing-plans-billing--${variant}`}
      role="group"
      aria-label="Periodo de facturación"
    >
      <button
        type="button"
        className={`landing-plans-billing-option${
          billingPeriod === 'monthly' ? ' landing-plans-billing-option--active' : ''
        }`}
        aria-pressed={billingPeriod === 'monthly'}
        onClick={() => onChange('monthly')}
      >
        {monthlyLabel}
      </button>
      <button
        type="button"
        className={`landing-plans-billing-option${
          billingPeriod === 'annual' ? ' landing-plans-billing-option--active' : ''
        }`}
        aria-pressed={billingPeriod === 'annual'}
        onClick={() => onChange('annual')}
      >
        Anual
        <span className="landing-plans-billing-note">({ANNUAL_DISCOUNT_LABEL})</span>
      </button>
    </div>
  );
};

const LandingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const loginHref = getAppLoginHref();
  const registerHref = getAppRegisterHref();
  const loginIsExternal = loginHref.startsWith('http');
  const registerIsExternal = registerHref.startsWith('http');

  return (
    <div className="landing gradient-bg">
      <LandingPlexusBackground />
      <div className="landing-surface">
      <div className="landing-header-shell">
        <header className="landing-header">
          <div className="landing-header-inner">
            <BrandLogo className="landing-logo" variant="header" />
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
          <LandingReveal className="landing-hero-copy">
            <p className="landing-eyebrow">Fichaje digital para empresas y autónomos</p>
            <h1 className="landing-title">
              Fichaje digital para cumplir la normativa española, sin pagar una
              suite RRHH completa.
            </h1>
            <p className="landing-lead">
              El fichaje digital de tu equipo centraliza fichajes,
              permisos y configuración por empresa: simple para el personal, potente para el negocio.
            </p>
            <div className="landing-hero-actions">
              <CtaButton
                href={registerHref}
                external={registerIsExternal}
                className="landing-cta-start landing-hero-cta-primary"
                size="large"
              >
                Demo gratuita
              </CtaButton>
              {loginIsExternal ? (
                <Button
                  type="default"
                  size="large"
                  href={loginHref}
                  className="landing-hero-login landing-hero-cta-secondary"
                >
                  Acceder
                </Button>
              ) : (
                <Link to={loginHref}>
                  <Button
                    type="default"
                    size="large"
                    className="landing-hero-login landing-hero-cta-secondary"
                  >
                    Acceder
                  </Button>
                </Link>
              )}
            </div>
          </LandingReveal>

          <LandingReveal className="landing-hero-visual" delay={160}>
            <LandingHeroVisual images={LANDING_HERO_IMAGES} />
          </LandingReveal>
        </div>
      </section>

      <LandingReveal
        as="section"
        id="cumplimiento"
        className="landing-compliance"
        aria-labelledby="landing-compliance-title"
      >
        <div className="landing-container landing-compliance-inner">
          <p className="landing-compliance-kicker">Evita inspecciones y multas</p>
          <h2 id="landing-compliance-title" className="landing-compliance-title">
            Cumple la ley de control horario
          </h2>
          <p className="landing-compliance-intro">
            Todo lo que necesitas para evitar sanciones y asegurar el cumplimiento
            de la normativa de control horario:
          </p>
          <ul className="landing-compliance-points">
            {complianceItems.map((item, index) => (
              <LandingReveal
                as="li"
                key={item.text}
                className="landing-compliance-point"
                delay={index * 100}
              >
                <span className="landing-compliance-point-marker" aria-hidden>
                  {item.icon}
                </span>
                <p className="landing-compliance-point-text">{item.text}</p>
              </LandingReveal>
            ))}
          </ul>
        </div>
      </LandingReveal>

      <LandingReveal
        as="section"
        id="planes"
        className="landing-plans"
        aria-labelledby="landing-plans-title"
      >
        <div className="landing-container">
          <h2 id="landing-plans-title" className="landing-plans-title">
            Compara todos los planes.
          </h2>
          <p className="landing-plans-lead">
            Elige qué incluye cada plan y encuentra el que mejor se adapta a tu negocio.{' '}
            <span className="landing-plans-license-note">{LICENSE_IS_USER_NOTE}</span>
          </p>

          <PlanBillingToggle
            billingPeriod={billingPeriod}
            onChange={setBillingPeriod}
            variant="standalone"
          />

          <p className="landing-plans-tax-note">{PRICES_EXCLUDE_TAX_NOTE}</p>

          <ul className="landing-plans-grid">
            {PLANS.map((plan, index) => (
              <LandingReveal
                as="li"
                key={plan.id}
                delay={index * 120}
                className={`landing-plan-item${
                  !plan.available ? ' landing-plan-item--unavailable' : ''
                }${plan.featured ? ' landing-plan-item--featured' : ''}`}
              >
                <article
                  className={`landing-plan-card landing-plan-card--${plan.variant}${
                    plan.featured ? ' landing-plan-card--featured' : ''
                  }${!plan.available ? ' landing-plan-card--unavailable' : ''}`}
                >
                  <div className="landing-plan-card-top">
                    <div className="landing-plan-card-gradient" aria-hidden />
                    <div
                      className={`landing-plan-card-top-row${
                        plan.featured ? '' : ' landing-plan-card-top-row--centered'
                      }`}
                    >
                      <span className="landing-plan-badge">{plan.name}</span>
                      {plan.featured && (
                        <PlanBillingToggle
                          billingPeriod={billingPeriod}
                          onChange={setBillingPeriod}
                          variant="in-card"
                        />
                      )}
                    </div>
                  </div>
                  <div className="landing-plan-card-body">
                    {billingPeriod === 'monthly' ? (
                      <p className="landing-plan-price">
                        <span className="landing-plan-price-from">desde</span>{' '}
                        <strong>{plan.priceMonthly} €</strong>
                        <span className="landing-plan-price-unit">
                          {PRICE_UNIT_MONTHLY}
                        </span>
                      </p>
                    ) : (
                      <p className="landing-plan-price landing-plan-price--annual">
                        <span className="landing-plan-price-from">desde</span>{' '}
                        <strong>{plan.priceAnnual} €</strong>
                        <span className="landing-plan-price-unit">
                          {PRICE_UNIT_ANNUAL}
                        </span>
                        <span className="landing-plan-price-annual-note landing-plan-price-annual-note--inline">
                          ({ANNUAL_DISCOUNT_LABEL})
                        </span>
                      </p>
                    )}
                    <p className="landing-plan-min">
                      {MIN_USERS_LABEL(plan.minLicenses)}
                    </p>
                    <p className="landing-plan-min-total">
                      {billingPeriod === 'monthly'
                        ? `Desde ${plan.minMonthly} €/mes`
                        : `Desde ${getPlanMinAnnual(plan)} €/año`}
                    </p>
                    <p className="landing-plan-desc">{plan.description}</p>
                    <ul className="landing-plan-features">
                      {plan.features.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <div className="landing-plan-cta-wrap">
                      {plan.available ? (
                        <PlanCta
                          href={registerHref}
                          external={registerIsExternal}
                          featured={plan.featured}
                        >
                          Empezar prueba gratuita
                        </PlanCta>
                      ) : (
                        <Tooltip title={PLAN_UNAVAILABLE_TOOLTIP}>
                          <span className="landing-plan-cta-disabled-wrap">
                            <Button
                              block
                              disabled
                              className="landing-plan-cta landing-plan-cta--disabled"
                            >
                              No disponible
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </article>
              </LandingReveal>
            ))}
          </ul>

          <LandingReveal className="landing-plan-compare" delay={200}>
            <h3 className="landing-plan-compare-title">Comparativa detallada</h3>
            <p className="landing-plan-compare-lead">
              Consulta qué incluye cada plan. El plan Completo estará disponible próximamente.
            </p>

            <div className="landing-plan-compare-scroll landing-plan-compare-scroll--desktop">
              <table className="landing-plan-compare-table">
                <caption className="landing-plan-compare-caption">
                  Funcionalidades por plan
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Funcionalidad</th>
                    {PLANS.map((plan) => (
                      <th key={plan.id} scope="col" className="landing-plan-compare-th">
                        <span className="landing-plan-compare-th-name">{plan.name}</span>
                        {!plan.available && (
                          <span className="landing-plan-compare-th-badge">No disponible</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLAN_COMPARISON_ROWS.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.label}</th>
                      {PLANS.map((plan) => (
                        <td key={plan.id}>
                          <PlanCompareCell included={row.plans[plan.id]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="landing-plan-compare-mobile" aria-label="Comparativa de planes en móvil">
              <div className="landing-plan-compare-mobile-header" role="row">
                {PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`landing-plan-compare-mobile-plan landing-plan-compare-mobile-plan--${plan.variant}`}
                    role="columnheader"
                  >
                    <span className="landing-plan-compare-mobile-plan-name">{plan.name}</span>
                    {!plan.available && (
                      <span className="landing-plan-compare-mobile-plan-badge">Próximamente</span>
                    )}
                  </div>
                ))}
              </div>
              <ul className="landing-plan-compare-mobile-list">
                {PLAN_COMPARISON_ROWS.map((row) => (
                  <li key={row.id} className="landing-plan-compare-mobile-row">
                    <p className="landing-plan-compare-mobile-label">{row.label}</p>
                    <div className="landing-plan-compare-mobile-cells" role="row">
                      {PLANS.map((plan) => (
                        <div
                          key={plan.id}
                          className="landing-plan-compare-mobile-cell"
                          role="cell"
                          aria-label={`${plan.name}: ${row.plans[plan.id] ? 'incluido' : 'no incluido'}`}
                        >
                          <PlanCompareCell included={row.plans[plan.id]} />
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </LandingReveal>
        </div>
      </LandingReveal>

      <LandingReveal
        as="section"
        id="ausencias"
        className="landing-absences"
        aria-labelledby="landing-absences-title"
      >
        <div className="landing-container landing-absences-inner">
          <p className="landing-absences-kicker">Ausencias y calendario</p>
          <h2 id="landing-absences-title" className="landing-absences-title">
            Días libres, permisos y bajas sincronizadas con la jornada laboral
          </h2>
          <p className="landing-absences-intro">
            Gestiona vacaciones, asuntos propios y bajas junto al registro horario:
            el calendario de la empresa refleja quién trabaja, quién está de permiso
            y qué días computan según la jornada asignada.
          </p>
          <ul className="landing-absences-points">
            {absenceItems.map((item, index) => (
              <LandingReveal
                as="li"
                key={item.text}
                className="landing-absences-point"
                delay={index * 100}
              >
                <span className="landing-absences-point-marker" aria-hidden>
                  {item.icon}
                </span>
                <p className="landing-absences-point-text">{item.text}</p>
              </LandingReveal>
            ))}
          </ul>
        </div>
      </LandingReveal>

      <LandingReveal
        as="section"
        id="funcionalidades"
        className="landing-features"
        aria-labelledby="landing-features-title"
      >
        <div className="landing-container">
          <h2 id="landing-features-title" className="landing-section-title">
            Todo lo que necesitas
          </h2>
          <ul className="landing-feature-grid">
            {features.map((item, index) => (
              <LandingReveal
                as="li"
                key={item.title}
                className="landing-feature-card"
                delay={index * 90}
              >
                <span className="landing-feature-icon" aria-hidden>
                  {item.icon}
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </LandingReveal>
            ))}
          </ul>
        </div>
      </LandingReveal>

      <LandingReveal as="div" delay={80}>
        <LandingStats />
      </LandingReveal>

      <LandingReveal className="landing-footer-reveal">
        <LandingFooter />
      </LandingReveal>
      </div>
    </div>
  );
};

export default LandingPage;
