import React, { useEffect, useState } from 'react';
import { Layout, Badge } from 'antd';
import {
  MailOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useLocation, Link } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useEstadoJornada } from '../../hooks/useEstadoJornada';
import { useNotificacionesPendientes } from '../../hooks/useNotificacionesPendientes';
import { useNovedadPendiente } from '../../hooks/useNovedadPendiente';
import { useAuth } from '../../config/AuthContext';
import { puedeVerNotificacionesSesion } from '../../utils/tipoUsuarioLabel';
import { tieneAccesoHub } from '../../utils/hubAccess';
import HeaderEmpresaMenu from './HeaderEmpresaMenu';
import NovedadesDrawer from './NovedadesDrawer';
import NovedadesRocketIcon from './NovedadesRocketIcon';
import OnboardingHeaderPanel from './OnboardingHeaderPanel';
import useOnboarding from '../../hooks/useOnboarding';
import './Header.css';

const { Header } = Layout;

const OPEN_SUPPORT_EVENT = 'gestemp:open-support';

const esRutaFichaje = (pathname) =>
  pathname === APP_ROUTES.login || pathname === APP_ROUTES.home;

const MyHeader = () => {
  const location = useLocation();
  const { user } = useAuth();
  const ocultarSoporte = tieneAccesoHub(user);
  const {
    data: onboardingData,
    mostrar: mostrarOnboarding,
    minimized: onboardingMinimized,
    toggleMinimized: toggleOnboardingMinimized,
    recargar: recargarOnboarding,
  } = useOnboarding();
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
  const mostrarNotificaciones = puedeVerNotificacionesSesion(user);

  const openSupport = () => {
    window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_EVENT));
  };

  return (
    <Header className="app-header">
      <div className="app-header__start">
        {mostrarOnboarding && onboardingData && (
          <OnboardingHeaderPanel
            data={onboardingData}
            minimized={onboardingMinimized}
            onToggleMinimized={toggleOnboardingMinimized}
            onClosed={recargarOnboarding}
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

        {mostrarNotificaciones && (
        <Link
          to={APP_ROUTES.notifications}
          className="app-header-icon-btn app-header-notificaciones"
          aria-label={hayNotificacionesPendientes ? 'Notificaciones pendientes' : 'Notificaciones'}
        >
          <Badge dot={hayNotificacionesPendientes} color="#ff4d4f">
            <BellOutlined />
          </Badge>
        </Link>
        )}

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

