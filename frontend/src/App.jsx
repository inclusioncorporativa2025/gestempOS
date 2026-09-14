import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { APP_ROUTES, LANDING_ROUTES } from './constants/routes';
import { isAppSubdomain } from './utils/host';
import { initMetricoolTracker } from './landing/utils/metricoolTracker';
import LandingPage from './landing/pages/LandingPage';
import CampaignContactPage from './landing/pages/CampaignContactPage';
import RedirectToLandingCampaign from './landing/components/RedirectToLandingCampaign';
import legalRouteElements from './LegalRoutes';
import seoLandingRouteElements from './SeoLandingRoutes';
import AppShell from './app/AppShell';
import SeoManager from './components/SeoManager';

/**
 * Raíz del SPA: landing pública (/) en timecor.es; login solo en app.timecor.es.
 * En subdominio `app.*` la raíz redirige al login.
 */
function App() {
  const onAppHost = isAppSubdomain();

  useEffect(() => {
    if (!onAppHost) {
      initMetricoolTracker();
    }
  }, [onAppHost]);

  return (
    <>
    <SeoManager />
    <Routes>
      {legalRouteElements}
      {seoLandingRouteElements}
      {onAppHost ? (
        <>
          <Route path={LANDING_ROUTES.demo} element={<RedirectToLandingCampaign />} />
          <Route path={LANDING_ROUTES.llamada} element={<RedirectToLandingCampaign />} />
          <Route path="/" element={<Navigate to={APP_ROUTES.login} replace />} />
          <Route path="/*" element={<AppShell />} />
        </>
      ) : (
        <>
          <Route path={LANDING_ROUTES.demo} element={<LandingPage />} />
          <Route path={LANDING_ROUTES.llamada} element={<CampaignContactPage variant="llamada" />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/*" element={<AppShell />} />
        </>
      )}
    </Routes>
    </>
  );
}

export default App;
