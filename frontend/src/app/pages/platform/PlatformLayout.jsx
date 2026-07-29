import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Select, Typography } from 'antd';
import { APP_ROUTES } from '../../../constants/routes';
import { useAuth } from '../../../config/AuthContext';
import '../gestor/Configuracion.css';

const { Title, Text } = Typography;

const MOBILE_BREAKPOINT = 950;

const PlatformLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const esRoot = Number(user?.tipo_usuario) === 1;
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const submenuItems = useMemo(
    () => {
      const items = [
        { key: APP_ROUTES.platformEmpresas, label: 'Empresas' },
        { key: APP_ROUTES.platformAccesos, label: 'Accesos' },
        { key: APP_ROUTES.platformAcceder, label: 'Acceder a cuenta' },
      ];
      if (esRoot) {
        items.splice(1, 0, { key: APP_ROUTES.platformConvenios, label: 'Convenios' });
      }
      return items;
    },
    [esRoot],
  );

  const selectedKey =
    submenuItems.find((item) => item.key === location.pathname)?.key
    || APP_ROUTES.platformEmpresas;

  const esAcceder = location.pathname === APP_ROUTES.platformAcceder;
  const esEmpresas = location.pathname === APP_ROUTES.platformEmpresas;
  const esAccesos = location.pathname === APP_ROUTES.platformAccesos;
  const esConvenios = location.pathname === APP_ROUTES.platformConvenios;

  const subtitulo = esEmpresas
    ? 'Alta y administración de empresas cliente'
    : esConvenios
      ? 'Catálogo global de convenios colectivos'
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

      <div className="config-layout__nav">
        {isMobile ? (
          <Select
            className="config-layout__select"
            value={selectedKey}
            options={submenuItems.map(({ key, label }) => ({ value: key, label }))}
            onChange={(key) => navigate(key)}
            aria-label="Sección de gestión interna"
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

export default PlatformLayout;
