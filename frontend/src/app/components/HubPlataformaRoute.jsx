import React from 'react';
import { Navigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useAuth } from '../../config/AuthContext';
import { puedeVerDashboardHub, tieneAccesoHub } from '../../utils/hubAccess';

const HubPlataformaRoute = ({ children }) => {
  const { user, ready } = useAuth();

  if (!ready) {
    return null;
  }

  if (!user || !tieneAccesoHub(user)) {
    return <Navigate to={APP_ROUTES.login} replace />;
  }

  if (!puedeVerDashboardHub(user)) {
    return <Navigate to={APP_ROUTES.hubVentas} replace />;
  }

  return children;
};

export default HubPlataformaRoute;
