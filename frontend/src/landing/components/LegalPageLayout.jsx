import React from 'react';
import { Link } from 'react-router-dom';
import { LANDING_ROUTES } from '../../constants/routes';
import { BRAND_NAME } from '../../constants/brand';
import BrandLogo from '../../components/BrandLogo';
import LandingFooter from './LandingFooter';
import './LegalPageLayout.css';
import './LandingFooter.css';

const LegalPageLayout = ({ title, lastUpdated, children }) => (
  <div className="legal-page">
    <header className="legal-page__header">
      <div className="legal-page__header-inner">
        <Link to={LANDING_ROUTES.home} className="legal-page__logo" title={`${BRAND_NAME} — Inicio`}>
          <BrandLogo variant="footer" />
        </Link>
        <Link to={LANDING_ROUTES.home} className="legal-page__back">
          Volver al inicio
        </Link>
      </div>
    </header>

    <main className="legal-page__main">
      <article className="legal-page__article">
        <h1 className="legal-page__title">{title}</h1>
        {lastUpdated ? (
          <p className="legal-page__updated">Última actualización: {lastUpdated}</p>
        ) : null}
        <div className="legal-page__body">{children}</div>
      </article>
    </main>

    <LandingFooter />
  </div>
);

export const LegalSection = ({ title, children }) => (
  <section className="legal-section">
    <h2 className="legal-section__title">{title}</h2>
    {children}
  </section>
);

export default LegalPageLayout;
