import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import {
  ClockCircleOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { getAppLoginHref } from '../../utils/appLinks';
import './LandingPage.css';

const features = [
  {
    icon: <ClockCircleOutlined />,
    title: 'Fichaje digital',
    text: 'Entrada, salida y pausas desde el móvil o el ordenador, con registro horario conforme a la normativa.',
  },
  {
    icon: <TeamOutlined />,
    title: 'Gestión de equipos',
    text: 'Altas, supervisores e inspectores en un solo panel. Control de licencias por empresa.',
  },
  {
    icon: <BarChartOutlined />,
    title: 'Informes y calendario',
    text: 'Consulta de fichajes, ausencias, festivos y exportación para tu departamento de RR. HH.',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: 'Seguridad',
    text: 'Acceso por roles, sesión protegida y restablecimiento de contraseña con enlace seguro.',
  },
];

const LandingPage = () => {
  const loginHref = getAppLoginHref();
  const loginIsExternal = loginHref.startsWith('http');

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <span className="landing-logo">Ficha en el trabajo</span>
          {loginIsExternal ? (
            <Button type="primary" href={loginHref} className="landing-cta-header">
              Acceder
            </Button>
          ) : (
            <Link to={loginHref}>
              <Button type="primary" className="landing-cta-header">
                Acceder
              </Button>
            </Link>
          )}
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-container landing-hero-inner">
          <p className="landing-eyebrow">Control horario para empresas</p>
          <h1 className="landing-title">
            El registro de jornada que tu equipo usa cada día
          </h1>
          <p className="landing-lead">
            Centraliza fichajes, permisos y configuración por empresa. Simple para el
            empleado, potente para el gestor.
          </p>
          <div className="landing-hero-actions">
            {loginIsExternal ? (
              <Button type="primary" size="large" href={loginHref}>
                Iniciar sesión
              </Button>
            ) : (
              <Link to={loginHref}>
                <Button type="primary" size="large">
                  Iniciar sesión
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-container">
          <h2 className="landing-section-title">Todo lo que necesitas</h2>
          <ul className="landing-feature-grid">
            {features.map((item) => (
              <li key={item.title} className="landing-feature-card">
                <span className="landing-feature-icon" aria-hidden>
                  {item.icon}
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <span>© {new Date().getFullYear()} Ficha en el trabajo</span>
          {loginIsExternal ? (
            <a href={loginHref}>Acceso clientes</a>
          ) : (
            <Link to={loginHref}>Acceso clientes</Link>
          )}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
