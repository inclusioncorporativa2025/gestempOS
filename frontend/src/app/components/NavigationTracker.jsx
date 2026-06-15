import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useAuth } from '../../config/AuthContext';
import { registrarNavegacion } from '../../features/platform/platformService';

const RUTAS_IGNORADAS = new Set([
  APP_ROUTES.login,
  APP_ROUTES.register,
  APP_ROUTES.forgotPassword,
  APP_ROUTES.resetPassword,
]);

const NavigationTracker = () => {
  const location = useLocation();
  const { user, ready } = useAuth();
  const ultimaRuta = useRef(null);

  useEffect(() => {
    if (!ready || !user) return;

    const path = location.pathname;
    if (RUTAS_IGNORADAS.has(path)) return;
    if (ultimaRuta.current === path) return;

    ultimaRuta.current = path;
    registrarNavegacion(path).catch(() => {});
  }, [location.pathname, ready, user]);

  return null;
};

export default NavigationTracker;
