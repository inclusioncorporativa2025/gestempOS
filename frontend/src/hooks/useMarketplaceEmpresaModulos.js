import { useCallback, useEffect, useState } from 'react';
import { getMarketplaceEstadoEmpresa } from '../features/marketplace/marketplaceService';
import { marketplaceModuloMenuLabel } from '../constants/marketplace';

export const useMarketplaceEmpresaModulos = (enabled) => {
  const [modulosActivos, setModulosActivos] = useState([]);
  const [estadoFilas, setEstadoFilas] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    if (!enabled) {
      setModulosActivos([]);
      setEstadoFilas([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getMarketplaceEstadoEmpresa();
      const filas = data.modulos ?? [];
      setEstadoFilas(filas);
      setModulosActivos(
        filas
          .filter((f) => f.contrato?.estado === 'active' && f.modulo?.codigo)
          .map((f) => ({
            codigo: f.modulo.codigo,
            nombre: marketplaceModuloMenuLabel(f.modulo.codigo),
            asientos_activos: f.asientos_activos ?? 0,
            licencias_facturadas: f.contrato?.licencias_facturadas ?? null,
          })),
      );
    } catch {
      setModulosActivos([]);
      setEstadoFilas([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { modulosActivos, estadoFilas, loading, recargar: cargar };
};
