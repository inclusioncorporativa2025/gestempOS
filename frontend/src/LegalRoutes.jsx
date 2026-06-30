import React from 'react';
import { Route } from 'react-router-dom';
import { LANDING_ROUTES } from './constants/routes';
import PoliticaPrivacidadPage from './landing/pages/legal/PoliticaPrivacidadPage';
import AvisoLegalPage from './landing/pages/legal/AvisoLegalPage';
import PoliticaCookiesPage from './landing/pages/legal/PoliticaCookiesPage';
import TerminosCondicionesPage from './landing/pages/legal/TerminosCondicionesPage';

/** Fragmento de rutas públicas legales (usar como hijo directo de <Routes>). */
const legalRouteElements = (
  <>
    <Route path={LANDING_ROUTES.legalNotice} element={<AvisoLegalPage />} />
    <Route path={LANDING_ROUTES.privacy} element={<PoliticaPrivacidadPage />} />
    <Route path={LANDING_ROUTES.cookies} element={<PoliticaCookiesPage />} />
    <Route path={LANDING_ROUTES.terms} element={<TerminosCondicionesPage />} />
  </>
);

export default legalRouteElements;
