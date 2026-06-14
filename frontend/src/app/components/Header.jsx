import React, { useEffect, useState } from 'react';
import { Layout, Input } from 'antd';
import {
  SearchOutlined,
  MailOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useEstadoJornada } from '../../hooks/useEstadoJornada';
import { useEmpresaBranding } from '../../hooks/useEmpresaBranding';
import { useAuth } from '../../config/AuthContext';
import HeaderEmpresaMenu from './HeaderEmpresaMenu';
import './Header.css';

const { Header } = Layout;

const OPEN_SUPPORT_EVENT = 'gestemp:open-support';

const esRutaFichaje = (pathname) =>
  pathname === APP_ROUTES.login || pathname === APP_ROUTES.home;

const MyHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const { estadoJornada, horasTrabajadas, refetch } = useEstadoJornada();

  const enHome = esRutaFichaje(location.pathname);
  const mostrarJornadaEnHeader =
    !enHome && (estadoJornada === 'in' || estadoJornada === 'break');

  useEffect(() => {
    if (!enHome) {
      refetch();
    }
  }, [enHome, location.pathname, refetch]);

  const {
    label,
    nombreEmpresa,
    licencias,
    logoUrl,
    iniciales,
    mostrarLogo,
    onLogoError,
  } = useEmpresaBranding();

  const displayName = user?.nombre || label || 'Usuario';

  const handleSearch = (value) => {
    const q = (value ?? searchValue).trim();
    if (!q) return;
    navigate(APP_ROUTES.users, { state: { headerSearch: q } });
  };

  const openSupport = () => {
    window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_EVENT));
  };

  return (
    <Header className="app-header">
      <div className="app-header__start">
        <Input
          className="app-header-search"
          placeholder="Buscar personal..."
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={() => handleSearch()}
          allowClear
          aria-label="Buscar personal"
        />

        {location.pathname !== APP_ROUTES.login && (
          <Link
            to={APP_ROUTES.home}
            className={`app-header-jornada ${mostrarJornadaEnHeader ? 'app-header-jornada--visible' : ''}`}
            aria-hidden={!mostrarJornadaEnHeader}
            tabIndex={mostrarJornadaEnHeader ? 0 : -1}
          >
            {estadoJornada === 'in' && (
              <>
                <span
                  className="app-header-jornada-dot app-header-jornada-dot--working"
                  aria-hidden
                />
                <span className="app-header-jornada-time">{horasTrabajadas}</span>
                <span className="app-header-jornada-label">Trabajando</span>
              </>
            )}
            {estadoJornada === 'break' && (
              <>
                <span
                  className="app-header-jornada-dot app-header-jornada-dot--pause"
                  aria-hidden
                />
                <span className="app-header-jornada-label">Pausa</span>
              </>
            )}
          </Link>
        )}
      </div>

      <div className="app-header__end">
        <button
          type="button"
          className="app-header-icon-btn"
          onClick={openSupport}
          aria-label="Contactar soporte"
        >
          <MailOutlined />
        </button>

        <Link
          to={APP_ROUTES.notifications}
          className="app-header-icon-btn"
          aria-label="Notificaciones"
        >
          <BellOutlined />
        </Link>

        <span className="app-header-divider" aria-hidden="true" />

        <HeaderEmpresaMenu
          label={displayName}
          nombreEmpresa={nombreEmpresa}
          licencias={licencias}
          logoUrl={logoUrl}
          iniciales={iniciales}
          mostrarLogo={mostrarLogo}
          onLogoError={onLogoError}
        />
      </div>
    </Header>
  );
};

export default MyHeader;
export { OPEN_SUPPORT_EVENT };
