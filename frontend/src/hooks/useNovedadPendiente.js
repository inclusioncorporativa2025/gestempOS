import { useState, useEffect, useCallback } from 'react';
import { obtenerNovedadPendiente, marcarNovedadVista } from '../features/novedades/novedadesService';
import { useAuth } from '../config/AuthContext';

export const NOVEDADES_ACTUALIZADAS = 'gestemp:novedades-actualizadas';

export const notifyNovedadesActualizadas = () => {
  window.dispatchEvent(new CustomEvent(NOVEDADES_ACTUALIZADAS));
};

export const useNovedadPendiente = ({ autoFetch = true } = {}) => {
  const { user, ready } = useAuth();
  const [novedad, setNovedad] = useState(null);
  const [pendientes, setPendientes] = useState(0);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!user?.id_usuario) {
      setNovedad(null);
      setPendientes(0);
      return null;
    }

    setLoading(true);
    try {
      const data = await obtenerNovedadPendiente();
      setNovedad(data?.novedad || null);
      setPendientes(data?.pendientes ?? 0);
      return data;
    } catch (error) {
      console.error('Error al cargar novedad pendiente:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id_usuario]);

  const marcarVista = useCallback(async (idNovedad) => {
    const id = idNovedad ?? novedad?.id_novedad;
    if (!id) return;

    try {
      const data = await marcarNovedadVista(id);
      setNovedad(data?.novedad || null);
      setPendientes(data?.pendientes ?? 0);
      notifyNovedadesActualizadas();
    } catch (error) {
      console.error('Error al marcar novedad como vista:', error);
      throw error;
    }
  }, [novedad?.id_novedad]);

  useEffect(() => {
    if (!autoFetch || !ready || !user) return undefined;

    refetch();

    const onActualizadas = () => refetch();
    window.addEventListener(NOVEDADES_ACTUALIZADAS, onActualizadas);

    return () => {
      window.removeEventListener(NOVEDADES_ACTUALIZADAS, onActualizadas);
    };
  }, [autoFetch, ready, user, refetch]);

  return {
    novedad,
    pendientes,
    loading,
    refetch,
    marcarVista,
  };
};
