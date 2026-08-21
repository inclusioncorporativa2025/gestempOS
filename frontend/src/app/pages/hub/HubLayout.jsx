import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Select, Typography } from 'antd';
import { APP_ROUTES } from '../../../constants/routes';
import '../gestor/Configuracion.css';

const { Title, Text } = Typography;

const MOBILE_BREAKPOINT = 950;

const HubLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const submenuItems = useMemo(
    () => [
      { key: APP_ROUTES.hubVentas, label: 'Mis clientes' },
    ],
    [],
  );

  const selectedKey =
    submenuItems.find((item) => item.key === location.pathname)?.key
    || APP_ROUTES.hubVentas;

  const esVentas = location.pathname === APP_ROUTES.hubVentas;

  const subtitulo = esVentas
    ? 'Empresas atribuidas y seguimiento comercial'
    : 'Hub comercial Timecor';

  return (
    <div className="config-layout">
      <Title level={3} className="config-layout__title">
        Hub comercial
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
            aria-label="Sección del hub comercial"
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
