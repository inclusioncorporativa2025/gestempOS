import React, { useEffect } from 'react';
import { Layout } from 'antd';
import { useLocation, Link } from 'react-router-dom';
import { useEstadoJornada } from '../hooks/useEstadoJornada';
import { useAuth } from '../config/AuthContext';
import './Header.css';

const { Header } = Layout;

const esRutaFichaje = (pathname) =>
  pathname === '/' || /^\/home$/i.test(pathname);

const MyHeader = () => {
  const location = useLocation();
  const { estadoJornada, horasTrabajadas, refetch } = useEstadoJornada();

  const enHome = esRutaFichaje(location.pathname);
  const mostrarJornadaEnHeader =
    !enHome && (estadoJornada === 'in' || estadoJornada === 'break');

  useEffect(() => {
    if (!enHome) {
      refetch();
    }
  }, [enHome, location.pathname, refetch]);

  const { user } = useAuth();
  const alias = user?.alias || 'InCor';

  return (
    <Layout className="app-header-wrap">
      <Header className="app-header">
        <h1 className="app-header-title">{alias}</h1>

        {location.pathname !== '/' && (
          <Link
            to="/Home"
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
      </Header>
    </Layout>
  );
};

export default MyHeader;
