import React, { useEffect, useMemo } from 'react';
import { Menu, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { getTipoUsuario } from '../../utils/authSession';
import {
  marketplaceCodigoDesdePathname,
  marketplaceEsRutaModulo,
  marketplaceModuloPath,
  marketplaceModulosGestion,
  marketplaceRutaGestionPorDefecto,
  marketplaceSubtituloModulo,
} from '../../constants/marketplace';
import './GestionTiempoPage.css';
import './MarketplaceLayout.css';

const { Title, Text } = Typography;

const MarketplaceLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tipoUsuario = Number(getTipoUsuario());
  const puedeVerCatalogo = [1, 2].includes(tipoUsuario);

  const modulosEnTabs = useMemo(() => marketplaceModulosGestion(), []);

  useEffect(() => {
    if (location.pathname !== APP_ROUTES.marketplace) return;
    if (!puedeVerCatalogo) {
      navigate(marketplaceRutaGestionPorDefecto(), { replace: true });
    }
  }, [location.pathname, navigate, puedeVerCatalogo]);

  const submenuItems = useMemo(() => {
    const items = [];
    if (puedeVerCatalogo) {
      items.push({
        key: APP_ROUTES.marketplace,
        label: 'Catálogo',
      });
    }
    modulosEnTabs.forEach((modulo) => {
      items.push({
        key: marketplaceModuloPath(modulo.codigo),
        label: modulo.nombre,
      });
    });
    return items;
  }, [modulosEnTabs, puedeVerCatalogo]);

  const activeKey = useMemo(() => {
    if (marketplaceEsRutaModulo(location.pathname)) {
      const codigo = marketplaceCodigoDesdePathname(location.pathname);
      return codigo ? marketplaceModuloPath(codigo) : APP_ROUTES.marketplace;
    }
    if (location.pathname === APP_ROUTES.marketplace) {
      return APP_ROUTES.marketplace;
    }
    return submenuItems[0]?.key ?? APP_ROUTES.marketplace;
  }, [location.pathname, submenuItems]);

  const subtitulo = useMemo(() => {
    if (activeKey === APP_ROUTES.marketplace) {
      return 'Catálogo de módulos (activación por empresa)';
    }
    const codigo = marketplaceCodigoDesdePathname(activeKey);
    if (codigo) return marketplaceSubtituloModulo(codigo);
    return 'Módulos opcionales de la empresa';
  }, [activeKey]);

  return (
    <div className="gt-layout mp-layout">
      <Title level={3} className="gt-layout__title">
        Marketplace
      </Title>
      <Text type="secondary" className="gt-layout__subtitle">
        {subtitulo}
      </Text>

      {submenuItems.length > 0 ? (
        <Menu
          className="gt-layout__menu"
          mode="horizontal"
          selectedKeys={[activeKey]}
          items={submenuItems}
          onClick={({ key }) => navigate(key)}
        />
      ) : null}

      <div className="gt-layout__content mp-layout__content">
        <Outlet />
      </div>
    </div>
  );
};

export default MarketplaceLayout;
