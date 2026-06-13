import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Typography } from 'antd';
import { APP_ROUTES } from '../../../constants/routes';
import './Configuracion.css';

const { Title, Text } = Typography;

const submenuItems = [
  {
    key: APP_ROUTES.settings,
    label: 'General',
  },
  {
    key: APP_ROUTES.settingsEmpresa,
    label: 'Empresa',
  },
  {
    key: APP_ROUTES.settingsJornada,
    label: 'Jornada',
  },
];

const ConfiguracionLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey =
    submenuItems.find((item) => item.key === location.pathname)?.key ||
    APP_ROUTES.settings;

  return (
    <div className="config-layout">
      <Title level={3} className="config-layout__title">
        Configuración
      </Title>
      <Text type="secondary" className="config-layout__subtitle">
        Ajustes generales de tu organización
      </Text>

      <Menu
        className="config-layout__menu"
        mode="horizontal"
        selectedKeys={[selectedKey]}
        items={submenuItems}
        onClick={({ key }) => navigate(key)}
      />

      <div className="config-layout__content">
        <Outlet />
      </div>
    </div>
  );
};

export default ConfiguracionLayout;
