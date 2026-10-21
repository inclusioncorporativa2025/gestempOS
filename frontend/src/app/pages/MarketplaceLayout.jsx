import React, { useEffect, useMemo } from 'react';
import { Menu, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { getTipoUsuario } from '../../utils/authSession';
import { useMarketplaceEmpresaModulos } from '../../hooks/useMarketplaceEmpresaModulos';
import {
  MARKETPLACE_CATALOGO_INTRO,
  marketplaceCodigoDesdePathname,
  marketplaceEsRutaModulo,
  marketplaceModuloPath,
  marketplaceModulosGestion,
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

  const { modulosActivos, loading: loadingModulos, recargar } = useMarketplaceEmpresaModulos(true);

  const codigosGestion = useMemo(
    () => new Set(marketplaceModulosGestion().map((m) => m.codigo)),
    [],
  );

  const modulosEnTabs = useMemo(
    () => modulosActivos.filter((m) => codigosGestion.has(m.codigo)),
    [modulosActivos, codigosGestion],
  );

  useEffect(() => {
    recargar();
  }, [location.pathname, recargar]);

  useEffect(() => {
    if (loadingModulos) return;
    if (location.pathname !== APP_ROUTES.marketplace) return;
    if (puedeVerCatalogo) return;
    const first = modulosEnTabs[0];
    if (first) {
      navigate(marketplaceModuloPath(first.codigo), { replace: true });
    }
  }, [location.pathname, loadingModulos, modulosEnTabs, navigate, puedeVerCatalogo]);

  useEffect(() => {
    if (loadingModulos) return;
    if (!marketplaceEsRutaModulo(location.pathname)) return;
    const codigo = marketplaceCodigoDesdePathname(location.pathname);
    if (!codigo || !codigosGestion.has(codigo)) return;
    const activo = modulosEnTabs.some((m) => m.codigo === codigo);
    if (activo) return;
    const dest = puedeVerCatalogo
      ? APP_ROUTES.marketplace
      : (modulosEnTabs[0] ? marketplaceModuloPath(modulosEnTabs[0].codigo) : APP_ROUTES.marketplace);
    navigate(dest, { replace: true });
  }, [
    codigosGestion,
    loadingModulos,
    location.pathname,
    modulosEnTabs,
    navigate,
    puedeVerCatalogo,
  ]);

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

  const enCatalogo = activeKey === APP_ROUTES.marketplace;

  const subtitulo = useMemo(() => {
    if (enCatalogo) return null;
    const codigo = marketplaceCodigoDesdePathname(activeKey);
    if (codigo) return marketplaceSubtituloModulo(codigo);
    return 'Módulos opcionales de la empresa';
  }, [activeKey, enCatalogo]);

  return (
    <div className="gt-layout mp-layout">
      <Title level={3} className="gt-layout__title">
        Marketplace
      </Title>
      {enCatalogo ? (
        <Text type="secondary" className="gt-layout__subtitle mp-layout__catalogo-intro">
          {MARKETPLACE_CATALOGO_INTRO}
        </Text>
      ) : (
        <Text type="secondary" className="gt-layout__subtitle">
          {subtitulo}
        </Text>
      )}

      {submenuItems.length > 0 ? (
        <Menu
          className="gt-layout__menu mp-layout__menu"
          mode="horizontal"
          disabledOverflow
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
