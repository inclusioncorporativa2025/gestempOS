import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { APP_ROUTES } from '../constants/routes';
import { useAuth } from '../config/AuthContext';
import { obtenerContextoHub } from '../features/hub/hubService';

const claimsIguales = (actual, siguiente) => (
  Boolean(actual?.hub_acceso) === Boolean(siguiente.hub_acceso)
  && JSON.stringify(actual?.hub_puestos || []) === JSON.stringify(siguiente.hub_puestos || [])
  && JSON.stringify(actual?.hub_permisos || []) === JSON.stringify(siguiente.hub_permisos || [])
);

const useHubAccessSync = ({ activo = true, redirigirSiRevocado = false } = {}) => {
  const { user, patchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userRef = useRef(user);
  const sincronizandoRef = useRef(false);
  const avisoRevocadoRef = useRef(false);

  userRef.current = user;

  const sincronizar = useCallback(async () => {
    const actual = userRef.current;
    if (!activo || !actual?.id_usuario || sincronizandoRef.current) return true;

    sincronizandoRef.current = true;
    try {
      const ctx = await obtenerContextoHub();
      const claims = {
        hub_acceso: Boolean(ctx.hub_acceso),
        hub_puestos: ctx.hub_puestos || [],
        hub_permisos: ctx.hub_permisos || [],
      };

      if (!claimsIguales(actual, claims)) {
        patchUser(claims);
      }

      if (!claims.hub_acceso && (redirigirSiRevocado || location.pathname.startsWith(APP_ROUTES.hub))) {
        if (!avisoRevocadoRef.current) {
          avisoRevocadoRef.current = true;
          message.warning('Tu acceso al panel de ventas ha sido revocado');
        }
        navigate(APP_ROUTES.home, { replace: true });
        return false;
      }

      avisoRevocadoRef.current = false;
      return claims.hub_acceso;
    } catch (error) {
      if (error.code === 'HUB_ACCESS_REVOKED' || error.status === 403) {
        const claims = {
          hub_acceso: false,
          hub_puestos: [],
          hub_permisos: [],
        };
        if (!claimsIguales(actual, claims)) {
          patchUser(claims);
        }
        if (redirigirSiRevocado || location.pathname.startsWith(APP_ROUTES.hub)) {
          if (!avisoRevocadoRef.current) {
            avisoRevocadoRef.current = true;
            message.warning('Tu acceso al panel de ventas ha sido revocado');
          }
          navigate(APP_ROUTES.home, { replace: true });
        }
        return false;
      }
      // Error de red u otro: conservar claims actuales (p. ej. JWT recién emitido en login)
      return Boolean(actual?.hub_acceso);
    } finally {
      sincronizandoRef.current = false;
    }
  }, [activo, patchUser, redirigirSiRevocado, location.pathname, navigate]);

  useEffect(() => {
    if (!activo || !user?.id_usuario) return undefined;

    sincronizar();
    const interval = setInterval(sincronizar, 30000);
    const onFocus = () => { sincronizar(); };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [activo, user?.id_usuario, sincronizar]);

  return sincronizar;
};

export default useHubAccessSync;
