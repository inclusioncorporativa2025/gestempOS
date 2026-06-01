import React from 'react';
import { Layout, Typography } from 'antd';
import './Footer.css';

const { Footer } = Layout;
const { Text } = Typography;

const CustomFooter = () => {
  return (
    <Footer className="app-footer">
      <Text className="app-footer-text">© 2024 Mi Aplicación. Todos los derechos reservados.</Text>
    </Footer>
  );
};

export default CustomFooter;
