import React, { useEffect, useMemo } from 'react';

import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';

import { Menu, Typography } from 'antd';

import { APP_ROUTES } from '../../../constants/routes';

import { useAuth } from '../../../config/AuthContext';

import './Configuracion.css';



const { Title, Text } = Typography;



const TIPOS_CONFIG_ORG = [1, 3, 4];

export const ConfiguracionOrgGate = ({ children }) => {
  const { user } = useAuth();
  const tipoUsuario = Number(user?.tipo_usuario);

  if (!TIPOS_CONFIG_ORG.includes(tipoUsuario)) {
    return <Navigate to={APP_ROUTES.settingsUsuario} replace />;
  }

  return children;
};

const ConfiguracionLayout = () => {

  const location = useLocation();

  const navigate = useNavigate();

  const { user } = useAuth();

  const tipoUsuario = Number(user?.tipo_usuario);

  const puedeConfigOrg = TIPOS_CONFIG_ORG.includes(tipoUsuario);



  const submenuItems = useMemo(() => {

    const items = [

      {

        key: APP_ROUTES.settingsUsuario,

        label: 'Mi cuenta',

      },

    ];



    if (puedeConfigOrg) {

      items.push(

        {

          key: APP_ROUTES.settingsEmpresa,

          label: 'Empresa',

        },

        {

          key: APP_ROUTES.settingsJornada,

          label: 'Jornada',

        },

      );

    }



    return items;

  }, [puedeConfigOrg]);



  const selectedKey =

    submenuItems.find((item) => item.key === location.pathname)?.key ||

    APP_ROUTES.settingsUsuario;



  const esMiCuenta = location.pathname === APP_ROUTES.settingsUsuario;



  useEffect(() => {

    if (

      !puedeConfigOrg &&

      [APP_ROUTES.settingsEmpresa, APP_ROUTES.settingsJornada].includes(location.pathname)

    ) {

      navigate(APP_ROUTES.settingsUsuario, { replace: true });

    }

  }, [location.pathname, navigate, puedeConfigOrg]);



  return (

    <div className="config-layout">

      <Title level={3} className="config-layout__title">

        Configuración

      </Title>

      <Text type="secondary" className="config-layout__subtitle">

        {esMiCuenta

          ? 'Gestiona tu perfil y preferencias personales'

          : 'Ajustes generales de tu organización'}

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

