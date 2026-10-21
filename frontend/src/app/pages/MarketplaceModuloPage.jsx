import React from 'react';
import { Empty, Spin } from 'antd';
import { Navigate, useParams } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useMarketplaceEmpresaModulos } from '../../hooks/useMarketplaceEmpresaModulos';
import {
  MARKETPLACE_MODULO_ALERTAS,
  marketplaceModuloContratoActivo,
  marketplaceModulosGestion,
} from '../../constants/marketplace';
import MarketplaceAsignacionesPage from './MarketplaceAsignacionesPage';

const MarketplaceModuloPage = () => {
  const { codigoModulo } = useParams();
  const codigosValidos = marketplaceModulosGestion().map((m) => m.codigo);
  const { estadoFilas, loading } = useMarketplaceEmpresaModulos(true);

  if (!codigosValidos.includes(codigoModulo)) {
    return (
      <Empty description="Módulo no encontrado en el marketplace" />
    );
  }

  if (loading) {
    return <Spin />;
  }

  const filaEstado = estadoFilas.find((f) => f.modulo?.codigo === codigoModulo);
  const activo = marketplaceModuloContratoActivo(filaEstado);
  if (!activo) {
    return (
      <Navigate
        to={APP_ROUTES.marketplace}
        replace
        state={{ marketplaceModuloInactivo: codigoModulo }}
      />
    );
  }

  if (codigoModulo === MARKETPLACE_MODULO_ALERTAS) {
    return <MarketplaceAsignacionesPage codigoModulo={codigoModulo} />;
  }

  return (
    <Empty description="Panel de gestión en preparación para este módulo" />
  );
};

export default MarketplaceModuloPage;
