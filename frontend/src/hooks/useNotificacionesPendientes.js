import { useState, useEffect, useCallback } from 'react';
import {
  countNotificacionesPendientes,
  countNotificacionesEmpleado,
} from '../features/fichaje/fichajeService';
import { useAuth } from '../config/AuthContext';
import {
  puedeAprobarSolicitudesEmpresaSesion,
  esEmpleadoNotificacionesSesion,
} from '../utils/tipoUsuarioLabel';

export const NOTIFICACIONES_ACTUALIZADAS = 'gestemp:notificaciones-actualizadas';

export const notifyNotificacionesActualizadas = () => {
  window.dispatchEvent(new CustomEvent(NOTIFICACIONES_ACTUALIZADAS));
};

export const useNotificacionesPendientes = () => {
  const { user } = useAuth();
  const esAprobador = puedeAprobarSolicitudesEmpresaSesion(user);
  const esEmpleado = esEmpleadoNotificacionesSesion(user);
  const puedeVer = esAprobador || esEmpleado;
  const [pendientes, setPendientes] = useState(false);

  const refetch = useCallback(async () => {
    if (!puedeVer) {
      setPendientes(false);
      return;
    }
    try {
      if (esAprobador) {
        const data = await countNotificacionesPendientes();
        setPendientes((data?.total ?? 0) > 0);
      } else if (esEmpleado) {
        const data = await countNotificacionesEmpleado();
        setPendientes((data?.total ?? 0) > 0);
      }
    } catch (error) {
      console.error('Error al contar notificaciones pendientes:', error);
    }
  }, [puedeVer, esAprobador, esEmpleado]);

  useEffect(() => {
    refetch();
  }, [refetch, user?.id_empresa, user?.id_usuario]);

  useEffect(() => {
    if (!puedeVer) return undefined;

    const onActualizadas = () => refetch();
    const onFocus = () => refetch();

    window.addEventListener(NOTIFICACIONES_ACTUALIZADAS, onActualizadas);
    window.addEventListener('focus', onFocus);
    const interval = setInterval(refetch, 60000);

    return () => {
      window.removeEventListener(NOTIFICACIONES_ACTUALIZADAS, onActualizadas);
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [puedeVer, refetch]);

  return { pendientes, refetch, esEmpleado };
};
