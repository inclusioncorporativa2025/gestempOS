import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useAuth } from '../../config/AuthContext';
import { obtenerContextoHub } from '../../features/hub/hubService';
import useHubAccessSync from '../../hooks/useHubAccessSync';

const HubProtectedRoute = ({ children }) => {
  const { user, ready, patchUser } = useAuth();
  const [verificado, setVerificado] = useState(false);
  const [permitido, setPermitido] = useState(false);

  useHubAccessSync({
    activo: Boolean(user && verificado && permitido),
    redirigirSiRevocado: true,
  });

  useEffect(() => {
    if (!ready) return undefined;

    if (!user) {
      setVerificado(true);
      setPermitido(false);
      return undefined;
    }

    let activo = true;

    obtenerContextoHub()
      .then((ctx) => {
        if (!activo) return;
        const claims = {
          hub_acceso: Boolean(ctx.hub_acceso),
          hub_puestos: ctx.hub_puestos || [],
          hub_permisos: ctx.hub_permisos || [],
        };
        patchUser(claims);
        setPermitido(claims.hub_acceso);
        setVerificado(true);
      })
      .catch(() => {
        if (!activo) return;
        patchUser({
          hub_acceso: false,
          hub_puestos: [],
          hub_permisos: [],
        });
        setPermitido(false);
        setVerificado(true);
      });

    return () => {
      activo = false;
    };
  }, [ready, user?.id_usuario, patchUser]);

  if (!ready || !verificado) {
    return null;
  }

  if (!user) {
    return <Navigate to={APP_ROUTES.login} replace />;
  }

  if (!permitido) {
    return <Navigate to={APP_ROUTES.home} replace />;
  }

  return children;
};

export default HubProtectedRoute;
