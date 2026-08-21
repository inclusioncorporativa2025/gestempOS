import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Select, Typography } from 'antd';
import { APP_ROUTES } from '../../../constants/routes';
import { useAuth } from '../../../config/AuthContext';
import { puedeGestionarAccesosHub, puedeVerDashboardHub } from '../../../utils/hubAccess';
import useHubAccessSync from '../../../hooks/useHubAccessSync';
import '../gestor/Configuracion.css';

const { Title, Text } = Typography;

const MOBILE_BREAKPOINT = 950;

const HubLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const puedeGestionarAccesos = puedeGestionarAccesosHub(user);
  const puedeVerMetricas = puedeVerDashboardHub(user);
  useHubAccessSync({ activo: true, redirigirSiRevocado: true });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const submenuItems = useMemo(() => {
    const items = [];
    if (puedeVerMetricas) {
      items.push({ key: APP_ROUTES.hubMetricas, label: 'Métricas' });
    }
    items.push({ key: APP_ROUTES.hubVentas, label: 'Mis clientes' });
    if (puedeGestionarAccesos) {
      items.push({ key: APP_ROUTES.hubAccesos, label: 'Accesos' });
    }
    return items;
  }, [puedeVerMetricas, puedeGestionarAccesos]);

  const selectedKey =
    submenuItems.find((item) => item.key === location.pathname)?.key
    || (puedeVerMetricas ? APP_ROUTES.hubMetricas : APP_ROUTES.hubVentas);

  const esMetricas = location.pathname === APP_ROUTES.hubMetricas;
  const esVentas = location.pathname === APP_ROUTES.hubVentas;
  const esAccesos = location.pathname === APP_ROUTES.hubAccesos;

  const subtitulo = esMetricas
    ? 'Evolución comercial y productividad del equipo'
    : esVentas
      ? 'Empresas atribuidas y seguimiento comercial'
      : esAccesos
        ? 'Usuarios con acceso al panel de ventas'
        : 'Panel de ventas Timecor';

  return (
    <div className="config-layout">
      <Title level={3} className="config-layout__title">
        Panel de ventas
      </Title>
      <Text type="secondary" className="config-layout__subtitle">
        {subtitulo}
      </Text>

      <div className="config-layout__nav">
        {isMobile ? (
          <Select
            className="config-layout__select"
            value={selectedKey}
            options={submenuItems.map(({ key, label }) => ({ value: key, label }))}
            onChange={(key) => navigate(key)}
            aria-label="Sección del panel de ventas"
          />
        ) : (
          <Menu
            className="config-layout__menu"
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={submenuItems}
            onClick={({ key }) => navigate(key)}
          />
        )}
      </div>

      <div className="config-layout__content">
        <Outlet />
      </div>
    </div>
  );
};

export default HubLayout;
