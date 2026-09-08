import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { APP_ROUTES } from './constants/routes';
import { isAppSubdomain } from './utils/host';
import { initMetricoolTracker } from './landing/utils/metricoolTracker';
import LandingPage from './landing/pages/LandingPage';
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
          <Route path="/" element={<Navigate to={APP_ROUTES.login} replace />} />
          <Route path="/*" element={<AppShell />} />
        </>
      ) : (
        <>
          <Route path="/" element={<LandingPage />} />
          <Route path="/*" element={<AppShell />} />
        </>
      )}
    </Routes>
    </>
  );
}

export default App;
