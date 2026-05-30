import React from 'react';
import { Button, Layout, Tooltip, notification } from 'antd';
import { PoweroffOutlined, PhoneOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import './Header.css';

const { Header } = Layout;

const MyHeader = () => {
  const location = useLocation(); // Obtiene la ruta actual

  // Función para cerrar sesión
  const handleLogout = () => {
    sessionStorage.clear(); // Borra todo el contenido de sessionStorage
    window.location.href = '/'; // Redirige al login
  };

  const notificarSoporte = () => {
    notification.info({
      message: "Correo de soporte:",
      description: `soporte@fichaeneltrabajo.es`,
    });
  };

  const alias = sessionStorage.getItem('alias') || 'InCor';

  return (
    <Layout className="app-header-wrap">
      <Header className="app-header">
        <h1 className="app-header-title">{alias}</h1>
        {/* Muestra el botón solo si no está en la página principal */}
        {location.pathname !== '/' && (
          <div>
            <Tooltip title="soporte@fichaeneltrabajo.es">
              <Button
                className="app-header-btn"
                type="text"
                onClick={notificarSoporte}
                icon={<PhoneOutlined className="app-header-icon" />}
              />
            </Tooltip>
            <Tooltip title="Cerrar sesión">
              <Button
                className="app-header-btn"
                type="text"
                onClick={handleLogout}
                icon={<PoweroffOutlined className="app-header-icon" />}
              />
            </Tooltip>
          </div>
        )}
      </Header>
    </Layout>
  );
};

export default MyHeader;
