import React from 'react';
import { Navigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useAuth } from '../../config/AuthContext';
import { tieneAccesoHub } from '../../utils/hubAccess';

const HubProtectedRoute = ({ children }) => {
  const { user, ready } = useAuth();

  if (!ready) {
    return null;
  }

  if (!user) {
    return <Navigate to={APP_ROUTES.login} replace />;
  }

  if (!tieneAccesoHub(user)) {
    return <Navigate to={APP_ROUTES.home} replace />;
  }

  return children;
};

export default HubProtectedRoute;
