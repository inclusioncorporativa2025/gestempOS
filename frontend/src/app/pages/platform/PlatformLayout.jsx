import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Typography } from 'antd';
import { APP_ROUTES } from '../../../constants/routes';
import '../gestor/Configuracion.css';

const { Title, Text } = Typography;

const PlatformLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const submenuItems = useMemo(
    () => [
      { key: APP_ROUTES.platform, label: 'Inicio' },
      { key: APP_ROUTES.platformAccesos, label: 'Accesos' },
      { key: APP_ROUTES.platformAcceder, label: 'Acceder a cuenta' },
    ],
    [],
  );

  const selectedKey =
    submenuItems.find((item) => item.key === location.pathname)?.key ||
    APP_ROUTES.platform;

  const esInicio = location.pathname === APP_ROUTES.platform;
  const esAcceder = location.pathname === APP_ROUTES.platformAcceder;

  return (
    <div className="config-layout">
      <Title level={3} className="config-layout__title">
        Gestión interna
      </Title>
      <Text type="secondary" className="config-layout__subtitle">
        {esInicio
          ? 'Herramientas de administración de la plataforma'
          : esAcceder
            ? 'Acceso temporal a cuentas de usuario por correo'
            : 'Auditoría de accesos y navegación de usuarios'}
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

export default PlatformLayout;
