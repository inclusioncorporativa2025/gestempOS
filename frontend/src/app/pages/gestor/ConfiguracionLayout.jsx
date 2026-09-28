import React, { useEffect, useMemo, useState } from 'react';

import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';

import { Menu, Select, Typography } from 'antd';

import { APP_ROUTES } from '../../../constants/routes';

const TIPOS_CONFIG_ORG = [1, 2, 3, 4];

import { useAuth } from '../../../config/AuthContext';

import './Configuracion.css';



const { Title, Text } = Typography;

const MOBILE_BREAKPOINT = 950;



export const ConfiguracionOrgGate = ({ children }) => {
  const { user } = useAuth();
  const tipoUsuario = Number(user?.tipo_usuario);

  if (!TIPOS_CONFIG_ORG.includes(tipoUsuario)) {
    return <Navigate to={APP_ROUTES.miPerfil} replace />;
  }

  return children;
};

const ConfiguracionLayout = () => {

  const location = useLocation();

  const navigate = useNavigate();

  const { user } = useAuth();

  const tipoUsuario = Number(user?.tipo_usuario);

  const puedeConfigOrg = TIPOS_CONFIG_ORG.includes(tipoUsuario);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);



  const submenuItems = useMemo(() => {

    if (!puedeConfigOrg) {
      return [];
    }

    const items = [
        {

          key: APP_ROUTES.settingsEmpresa,

          label: 'Empresa',

        },

        {

          key: APP_ROUTES.settingsJornada,

          label: 'Jornada',

        },

        {

          key: APP_ROUTES.settingsConvenios,

          label: 'Convenios',

        },

    ];

    return items;

  }, [puedeConfigOrg]);



  const selectedKey =

    submenuItems.find((item) => item.key === location.pathname)?.key

    || APP_ROUTES.settingsEmpresa;

  useEffect(() => {
    if (location.pathname === APP_ROUTES.settingsUsuario) {
      navigate(APP_ROUTES.miPerfil, { replace: true });
      return;
    }

    if (
      !puedeConfigOrg
      && (
        location.pathname.startsWith(`${APP_ROUTES.settings}/`)
        || location.pathname === APP_ROUTES.settings
      )
    ) {
      navigate(APP_ROUTES.miPerfil, { replace: true });
    }
  }, [location.pathname, navigate, puedeConfigOrg]);



  return (

    <div className="config-layout">

      <Title level={3} className="config-layout__title">

        Configuración

      </Title>

      <Text type="secondary" className="config-layout__subtitle">
        Ajustes generales de tu organización
      </Text>

      {submenuItems.length > 0 ? (
      <div className="config-layout__nav">
        {isMobile ? (
          <Select
            className="config-layout__select"
            value={selectedKey}
            options={submenuItems.map(({ key, label }) => ({ value: key, label }))}
            onChange={(key) => navigate(key)}
            aria-label="Sección de configuración"
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
      ) : null}

      <div className="config-layout__content">

        <Outlet />

      </div>

    </div>

  );

};



export default ConfiguracionLayout;

