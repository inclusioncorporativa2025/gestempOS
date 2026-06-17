import { useState, useEffect, useCallback } from 'react';
import {
  countNotificacionesPendientes,
  countNotificacionesEmpleado,
} from '../features/fichaje/fichajeService';
import { useAuth } from '../config/AuthContext';

export const NOTIFICACIONES_ACTUALIZADAS = 'gestemp:notificaciones-actualizadas';

export const notifyNotificacionesActualizadas = () => {
  window.dispatchEvent(new CustomEvent(NOTIFICACIONES_ACTUALIZADAS));
};

const TIPOS_GESTOR = [1, 3, 4];
const TIPOS_EMPLEADO = [5];

export const useNotificacionesPendientes = () => {
  const { user } = useAuth();
  const tipoUsuario = Number(user?.tipo_usuario);
  const esGestor = TIPOS_GESTOR.includes(tipoUsuario);
  const esEmpleado = TIPOS_EMPLEADO.includes(tipoUsuario);
  const puedeVer = esGestor || esEmpleado;
  const [pendientes, setPendientes] = useState(false);

  const refetch = useCallback(async () => {
    if (!puedeVer) {
      setPendientes(false);
      return;
    }
    try {
      if (esGestor) {
        const data = await countNotificacionesPendientes();
        setPendientes((data?.total ?? 0) > 0);
      } else if (esEmpleado) {
        const data = await countNotificacionesEmpleado();
        setPendientes((data?.total ?? 0) > 0);
      }
    } catch (error) {
      console.error('Error al contar notificaciones pendientes:', error);
    }
  }, [puedeVer, esGestor, esEmpleado]);

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
