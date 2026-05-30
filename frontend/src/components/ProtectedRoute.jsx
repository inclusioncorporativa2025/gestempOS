import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../config/AuthContext';

const ProtectedRoute = ({ children, allowedTypes }) => {
  const { user, ready } = useAuth();

  if (!ready) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const tipoUsuario = Number(user.tipo_usuario);

  if (!allowedTypes.includes(tipoUsuario)) {
    if (tipoUsuario === 2) {
      return <Navigate to="/buscador-empresa" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
