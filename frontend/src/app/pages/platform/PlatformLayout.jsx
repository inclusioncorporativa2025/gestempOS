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
      { key: APP_ROUTES.platformEmpresas, label: 'Empresas' },
      { key: APP_ROUTES.platformAccesos, label: 'Accesos' },
      { key: APP_ROUTES.platformAcceder, label: 'Acceder a cuenta' },
    ],
    [],
  );

  const selectedKey = submenuItems.find((item) => item.key === location.pathname)?.key;

  const esAcceder = location.pathname === APP_ROUTES.platformAcceder;
  const esEmpresas = location.pathname === APP_ROUTES.platformEmpresas;
  const esAccesos = location.pathname === APP_ROUTES.platformAccesos;

  const subtitulo = esEmpresas
    ? 'Alta y administración de empresas cliente'
    : esAcceder
      ? 'Acceso temporal a cuentas de usuario por correo'
      : esAccesos
        ? 'Auditoría de accesos y navegación de usuarios'
        : 'Herramientas de administración de la plataforma';

  return (
    <div className="config-layout">
      <Title level={3} className="config-layout__title">
        Gestión interna
      </Title>
      <Text type="secondary" className="config-layout__subtitle">
        {subtitulo}
      </Text>

      <Menu
        className="config-layout__menu"
        mode="horizontal"
        selectedKeys={selectedKey ? [selectedKey] : []}
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
