import React from 'react';
import { Button, Layout, Tooltip, notification } from 'antd';
import { PoweroffOutlined,PhoneOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';

const { Header } = Layout;

const MyHeader = () => {
  const location = useLocation(); // Obtiene la ruta actual

  // Función para cerrar sesión
  const handleLogout = () => {
    sessionStorage.clear(); // Borra todo el contenido de sessionStorage
    window.location.href = '/'; // Redirige al login
  };


  const notificarSoporte = () =>{

      // Notificación soporte
      notification.info({
        message: "Correo de soporte:",
        description: `soporte@fichaeneltrabajo.es`,
      });
    
  }



  const alias = sessionStorage.getItem('alias') || 'InCor';

  return (
    <Layout style={{ backgroundColor: 'red', display: 'contents' }}>
      <Header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxHeight: '6%',
        }}
      >
        <h1 style={{ color: 'white' }}>{alias}</h1>
        {/* Muestra el botón solo si no está en la página principal */}
        {location.pathname !== '/' && (
          <div>
              <Tooltip title="soporte@fichaeneltrabajo.es">
                <Button   style={{marginLeft:'10px'}}
              type="text"
              onClick={notificarSoporte}
              icon={<PhoneOutlined style={{ color: 'white', fontSize: '18px' }} />}>
            </Button>
            </Tooltip>
          <Tooltip title="Cerrar sesión"> 
            <Button
            style={{marginLeft:'10px'}}
              type="text"
              onClick={handleLogout}
              icon={<PoweroffOutlined style={{ color: 'white', fontSize: '18px' }} />}
            />
          </Tooltip>
          </div>
          
          
        )}
      </Header>
    </Layout>
  );
};

export default MyHeader;
