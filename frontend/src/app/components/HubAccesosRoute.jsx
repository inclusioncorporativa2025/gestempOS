import React from 'react';
import { Navigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useAuth } from '../../config/AuthContext';
import { puedeGestionarAccesosHub, tieneAccesoHub } from '../../utils/hubAccess';

const HubAccesosRoute = ({ children }) => {
  const { user, ready } = useAuth();

  if (!ready) {
    return null;
  }

  if (!user || !tieneAccesoHub(user)) {
    return <Navigate to={APP_ROUTES.login} replace />;
  }

  if (!puedeGestionarAccesosHub(user)) {
    return <Navigate to={APP_ROUTES.hubVentas} replace />;
  }

  return children;
};

export default HubAccesosRoute;
