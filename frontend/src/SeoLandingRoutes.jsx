import React from 'react';
import { Route } from 'react-router-dom';
import { LANDING_ROUTES } from './constants/routes';
import FichajeDigitalPage from './landing/pages/seo/FichajeDigitalPage';

/** Rutas públicas de landings SEO (usar como hijo directo de <Routes>). */
const seoLandingRouteElements = (
  <>
    <Route path={LANDING_ROUTES.seoFichajeDigital} element={<FichajeDigitalPage />} />
  </>
);

export default seoLandingRouteElements;
