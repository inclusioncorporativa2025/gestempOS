import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { APP_ROUTES } from '../constants/routes';
import { useAuth } from '../config/AuthContext';
import { obtenerContextoHub } from '../features/hub/hubService';
import { tieneAccesoHub } from '../utils/hubAccess';

const useHubAccessSync = ({ activo = true, redirigirSiRevocado = false } = {}) => {
  const { user, patchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const sincronizar = useCallback(async () => {
    if (!activo || !user) return true;

    try {
      const ctx = await obtenerContextoHub();
      patchUser({
        hub_acceso: Boolean(ctx.hub_acceso),
        hub_puestos: ctx.hub_puestos || [],
        hub_permisos: ctx.hub_permisos || [],
      });

      if (!ctx.hub_acceso && (redirigirSiRevocado || location.pathname.startsWith(APP_ROUTES.hub))) {
        message.warning('Tu acceso al panel de ventas ha sido revocado');
        navigate(APP_ROUTES.home, { replace: true });
        return false;
      }

      return Boolean(ctx.hub_acceso);
    } catch (error) {
      if (error.code === 'HUB_ACCESS_REVOKED' || error.status === 403) {
        patchUser({
          hub_acceso: false,
          hub_puestos: [],
          hub_permisos: [],
        });
        if (redirigirSiRevocado || location.pathname.startsWith(APP_ROUTES.hub)) {
          message.warning('Tu acceso al panel de ventas ha sido revocado');
          navigate(APP_ROUTES.home, { replace: true });
        }
        return false;
      }
      return tieneAccesoHub(user);
    }
  }, [activo, user, patchUser, redirigirSiRevocado, location.pathname, navigate]);

  useEffect(() => {
    if (!activo || !user) return undefined;

    sincronizar();
    const interval = setInterval(sincronizar, 30000);
    const onFocus = () => { sincronizar(); };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [activo, user, sincronizar]);

  return sincronizar;
};

export default useHubAccessSync;
