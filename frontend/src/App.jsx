import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { APP_ROUTES } from './constants/routes';
import { isAppSubdomain } from './utils/host';
import LandingPage from './landing/pages/LandingPage';
import AppShell from './app/AppShell';

/**
 * Raíz del SPA: landing pública (/) en timecor.es; login solo en app.timecor.es.
 * En subdominio `app.*` la raíz redirige al login.
 */
function App() {
  const onAppHost = isAppSubdomain();

  return (
    <Routes>
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
  );
}

export default App;
