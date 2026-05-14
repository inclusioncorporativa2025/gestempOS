import React from 'react';
import { Layout, Typography } from 'antd';

const { Footer } = Layout;
const { Text } = Typography;

const CustomFooter = () => {
  return (
    <Footer
      style={{
        backgroundColor: '#001529', // Azul oscuro
        color: 'white', // Texto blanco
        textAlign: 'center',
        padding: '10px 50px',
        
      }}
    >
      <Text style={{ color: 'white' }}>© 2024 Mi Aplicación. Todos los derechos reservados.</Text>
    </Footer>
  );
};

export default CustomFooter;
