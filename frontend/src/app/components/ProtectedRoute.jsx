import React from 'react';
import { Navigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useAuth } from '../../config/AuthContext';

import { getRutaInicioSesion } from '../../utils/tipoUsuarioLabel';

const ProtectedRoute = ({ children, allowedTypes }) => {
  const { user, ready } = useAuth();

  if (!ready) {
    return null;
  }

  if (!user) {
    return <Navigate to={APP_ROUTES.login} replace />;
  }

  const tipoUsuario = Number(user.tipo_usuario);

  if (!allowedTypes.includes(tipoUsuario)) {
    const destino = getRutaInicioSesion(user);
    return <Navigate to={destino} replace />;
  }

  return children;
};

export default ProtectedRoute;
