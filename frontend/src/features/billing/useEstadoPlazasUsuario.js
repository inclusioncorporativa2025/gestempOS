import { useCallback, useEffect, useState } from 'react';
import { getEstadoFacturacion } from './billingService';

export const useEstadoPlazasUsuario = (enabled) => {
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(false);

  const recargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEstadoFacturacion();
      setEstado(data);
      return data;
    } catch {
      setEstado(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      recargar();
    } else {
      setEstado(null);
    }
  }, [enabled, recargar]);

  const plazasLibres = estado?.plazas_libres ?? 0;
  /** Si no se pudo cargar facturación, no bloquear el alta (el backend validará). */
  const hayPlaza = estado == null ? true : plazasLibres > 0;

  return { estado, loading, recargar, hayPlaza, plazasLibres };
};
