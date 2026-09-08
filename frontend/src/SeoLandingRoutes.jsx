import React from 'react';
import { Route } from 'react-router-dom';
import { LANDING_ROUTES } from './constants/routes';
import FichajeDigitalPage from './landing/pages/seo/FichajeDigitalPage';
import ControlHorarioPymesPage from './landing/pages/seo/ControlHorarioPymesPage';
import RegistroJornadaNormativaPage from './landing/pages/seo/RegistroJornadaNormativaPage';

/** Rutas públicas de landings SEO (usar como hijo directo de <Routes>). */
const seoLandingRouteElements = (
  <>
    <Route path={LANDING_ROUTES.seoFichajeDigital} element={<FichajeDigitalPage />} />
    <Route path={LANDING_ROUTES.seoControlHorarioPymes} element={<ControlHorarioPymesPage />} />
    <Route
      path={LANDING_ROUTES.seoRegistroJornadaNormativa}
      element={<RegistroJornadaNormativaPage />}
    />
  </>
);

export default seoLandingRouteElements;
