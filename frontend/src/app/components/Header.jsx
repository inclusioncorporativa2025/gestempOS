import React, { useEffect, useState } from 'react';
import { Layout, Input, Badge } from 'antd';
import {
  SearchOutlined,
  MailOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useEstadoJornada } from '../../hooks/useEstadoJornada';
import { useNotificacionesPendientes } from '../../hooks/useNotificacionesPendientes';
import { useNovedadPendiente } from '../../hooks/useNovedadPendiente';
import { getTipoUsuario } from '../../utils/authSession';
import { puedeVerFichaPersonal } from '../../utils/tipoUsuarioLabel';
import { useAuth } from '../../config/AuthContext';
import { tieneAccesoHub } from '../../utils/hubAccess';
import HeaderEmpresaMenu from './HeaderEmpresaMenu';
import NovedadesDrawer from './NovedadesDrawer';
import NovedadesRocketIcon from './NovedadesRocketIcon';
import './Header.css';

const { Header } = Layout;

const OPEN_SUPPORT_EVENT = 'gestemp:open-support';

const esRutaFichaje = (pathname) =>
  pathname === APP_ROUTES.login || pathname === APP_ROUTES.home;

const MyHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tipoUsuario = getTipoUsuario();
  const ocultarSoporte = tieneAccesoHub(user);
  const mostrarBuscador = puedeVerFichaPersonal(tipoUsuario);
  const [searchValue, setSearchValue] = useState('');
  const { estadoJornada, horasTrabajadas, refetch } = useEstadoJornada();
  const { pendientes: hayNotificacionesPendientes } = useNotificacionesPendientes();
  const { pendientes: novedadesPendientes } = useNovedadPendiente({ autoFetch: true });
  const [novedadesDrawerOpen, setNovedadesDrawerOpen] = useState(false);

  const enHome = esRutaFichaje(location.pathname);
  const mostrarJornadaEnHeader =
    !enHome && (estadoJornada === 'in' || estadoJornada === 'break');

  useEffect(() => {
    if (!enHome) {
      refetch();
    }
  }, [enHome, location.pathname, refetch]);

  const displayName = user?.nombre || 'Usuario';

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
        {mostrarBuscador && (
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
        )}

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
        {!ocultarSoporte && (
        <button
          type="button"
          className="app-header-icon-btn"
          onClick={openSupport}
          aria-label="Contactar soporte"
        >
          <MailOutlined />
        </button>
        )}

        <button
          type="button"
          className="app-header-icon-btn"
          onClick={() => setNovedadesDrawerOpen(true)}
          aria-label={novedadesPendientes > 0 ? 'Novedades sin leer' : 'Novedades de la app'}
        >
          <Badge dot={novedadesPendientes > 0} color="#722ed1">
            <NovedadesRocketIcon className="app-header-novedades-icon" size={20} />
          </Badge>
        </button>

        <Link
          to={APP_ROUTES.notifications}
          className="app-header-icon-btn app-header-notificaciones"
          aria-label={hayNotificacionesPendientes ? 'Notificaciones pendientes' : 'Notificaciones'}
        >
          <Badge dot={hayNotificacionesPendientes} color="#ff4d4f">
            <BellOutlined />
          </Badge>
        </Link>

        <span className="app-header-divider" aria-hidden="true" />

        <HeaderEmpresaMenu label={displayName} />
      </div>

      <NovedadesDrawer
        open={novedadesDrawerOpen}
        onClose={() => setNovedadesDrawerOpen(false)}
      />
    </Header>
  );
};

export default MyHeader;
export { OPEN_SUPPORT_EVENT };

