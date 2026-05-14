import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Drawer, Button } from 'antd';
import {
  MenuOutlined,
  UserAddOutlined,
  SlidersOutlined,
  SearchOutlined,
  FieldTimeOutlined,
  LoginOutlined,
  CalendarOutlined,MailOutlined
} from '@ant-design/icons';
import Login from './pages/Login';
import Home from './pages/Home';
import ForgotPassword from './pages/ForgotPassword';
import Header from './components/Header';
import TimeLogsPanel from './pages/TimeLogsPanel';
import AltaEmpresa from './pages/admin/AltaEmpresa';
import UserManagementForm from './pages/gestor/UserManagementForm';
import ConfiguracionGestor from './pages/gestor/ConfiguracionGestor';
import Calendario from './pages/Calendario';

import BuscadorEmpresa from './pages/admin/BuscadorEmpresa';
import BuscadorUsuarios from './pages/BuscadorUsuarios';
import ProtectedRoute from './components/ProtectedRoute';
import Notificaciones from './pages/Notificaciones';


import '../src/App.css';

const { Sider, Content } = Layout;

const pages = [
  {
    label: 'Fichar',
    key: '1',
    icon: <LoginOutlined />,
    path: '/Home',
    tipousuario: [1,3,4,5],
  },
  {
    label: 'Gestión Tiempo',
    key: '2',
    icon: <FieldTimeOutlined />,
    path: '/TimeLogsPanel',
    tipousuario: [1,3,4,5],
  },
  {
    label: 'Personal',
    key: '3',
    icon: <SearchOutlined />,
    path: '/buscador-usuarios',
    tipousuario: [1,3,4,6],
  },
  {
    label: 'Añadir Personal',
    key: '4',
    icon: <UserAddOutlined />,
    path: '/UserManagementForm',
    tipousuario: [1,3,4],
  },
  {
    label: 'Calendario',
    key: '9',
    icon: <CalendarOutlined />,
    path: '/Calendario',
    tipousuario: [1,3,4],
  },
  {
    label: 'Configuración',
    key: '6',
    icon: <SlidersOutlined />,
    path: '/ConfiguracionGestor',
    tipousuario: [1,3,4],
  },
  {
    label: 'Alta Empresa',
    key: '7',
    icon: <UserAddOutlined />,
    path: '/alta-empresa',
    tipousuario: [1,2],
  },
  {
    label: 'Empresas',
    key: '8',
    icon: <SlidersOutlined />,
    path: '/buscador-empresa',
    tipousuario: [1,2],
  },
  {
    label: 'Notificaciones',
    key: '10',
    icon: <MailOutlined />,
    path: '/notificaciones',
    tipousuario: [1,3,4],
  },
];

function App() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const location = useLocation();
  const tipousuario = parseInt(sessionStorage.getItem('tipoUsuario')); 

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 950;
  const showDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  // Filtrar las páginas según el tipo de usuario
  const filteredPages = pages.filter((page) => page.tipousuario.includes(tipousuario));

  return (
    <Layout style={{ height: '100vh' }}>
      <Header />
      <Layout>
        {location.pathname !== '/' && !isMobile && (
          <Sider width={200} theme="dark" style={{ background: '#fff' }}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['1']}
              items={filteredPages.map((item) => ({
                ...item,
                label: <Link to={item.path}>{item.label}</Link>,
              }))}
            />
          </Sider>
        )}

        {isMobile && location.pathname !== '/' && ( // Asegúrate de no mostrar en la página de login
          <Button
            className="colorPrincipal"
            type="primary"
            icon={<MenuOutlined />}
            onClick={showDrawer}
            style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              zIndex: 1000,
              borderRadius: 15,
            }}
          />
        )}

        <Drawer
          title="Menú de navegación"
          placement="bottom"
          closable
          onClose={closeDrawer}
          onClick={closeDrawer}
          open={drawerVisible}
          height="auto"
        >
          <Menu
            mode="inline"
            defaultSelectedKeys={['1']}
            items={filteredPages.map((item) => ({
              ...item,
              label: <Link to={item.path}>{item.label}</Link>,
            }))}
          />
        </Drawer>

        <Layout style={isMobile ? {} : { padding: '0 24px 24px' }}>
          <Content style={{ padding: isMobile ? 0 : 24, background: '#fff' }}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/alta-empresa"
                element={
                  <ProtectedRoute allowedTypes={[1, 2]}>
                    <AltaEmpresa />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/TimeLogsPanel"
                element={
                  <ProtectedRoute allowedTypes={[1, 3, 4, 5]}>
                    <TimeLogsPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Home"
                element={
                  <ProtectedRoute allowedTypes={[1, 3, 4, 5]}>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/UserManagementForm"
                element={
                  <ProtectedRoute allowedTypes={[1, 3, 4]}>
                    <UserManagementForm />
                  </ProtectedRoute>
                }
              />
               <Route
                path="/Calendario"
                element={
                  <ProtectedRoute allowedTypes={[1, 3, 4]}>
                    <Calendario />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ConfiguracionGestor"
                element={
                  <ProtectedRoute allowedTypes={[1, 3, 4]}>
                    <ConfiguracionGestor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buscador-empresa"
                element={
                  <ProtectedRoute allowedTypes={[1, 2]}>
                    <BuscadorEmpresa />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buscador-usuarios"
                element={
                  <ProtectedRoute allowedTypes={[1,3,4,6]}>
                    <BuscadorUsuarios />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/notificaciones"
                element={
                  <ProtectedRoute allowedTypes={[1,3,4]}>
                    <Notificaciones />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;
