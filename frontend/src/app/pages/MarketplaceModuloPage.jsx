import React from 'react';
import { Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { MARKETPLACE_MODULO_ALERTAS, marketplaceModulosGestion } from '../../constants/marketplace';
import MarketplaceAsignacionesPage from './MarketplaceAsignacionesPage';

const MarketplaceModuloPage = () => {
  const { codigoModulo } = useParams();
  const codigosValidos = marketplaceModulosGestion().map((m) => m.codigo);

  if (!codigosValidos.includes(codigoModulo)) {
    return (
      <Empty description="Módulo no encontrado en el marketplace" />
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
