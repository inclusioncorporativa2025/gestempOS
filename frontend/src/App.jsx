import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Drawer, Button, ConfigProvider } from 'antd';
import {
  MenuOutlined,
  UserAddOutlined,
  SlidersOutlined,
  SearchOutlined,
  FieldTimeOutlined,
  LoginOutlined,
  CalendarOutlined,MailOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import Login from './pages/Login';
import Home from './pages/Home';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Header from './components/Header';
import SidebarFooter from './components/SidebarFooter';
import { useAuth } from './config/AuthContext';
import TimeLogsPanel from './pages/TimeLogsPanel';
import UserManagementForm from './pages/gestor/UserManagementForm';
import ConfiguracionGestor from './pages/gestor/ConfiguracionGestor';
import Calendario from './pages/Calendario';

import BuscadorEmpresa from './pages/admin/BuscadorEmpresa';
import BuscadorUsuarios from './pages/BuscadorUsuarios';
import ProtectedRoute from './components/ProtectedRoute';
import Notificaciones from './pages/Notificaciones';


import '../src/App.css';
import './styles/sidebar.css';
import './styles/app-layout.css';

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
    tipousuario: [1,3,4,5],
  },
  {
    label: 'Configuración',
    key: '6',
    icon: <SlidersOutlined />,
    path: '/ConfiguracionGestor',
    tipousuario: [1,3,4],
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
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tipousuario = user?.tipo_usuario ?? null;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 950;
  /** Login, olvidé contraseña y alta de clave: sin menú ni cabecera de la app */
  const isAuthShellPage = ['/', '/forgot-password', '/reset-password'].includes(
    location.pathname,
  );
  const showDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  // Filtrar las páginas según el tipo de usuario
  const filteredPages =
    tipousuario != null
      ? pages.filter((page) => page.tipousuario.includes(tipousuario))
      : [];

  // Item del menú activo según la ruta actual
  const paginaActual = pages.find(
    (page) => page.path.toLowerCase() === location.pathname.toLowerCase()
  );
  const selectedKeys = paginaActual ? [paginaActual.key] : [];

  // Items del menú (el label como texto sirve de tooltip cuando está colapsado)
  const menuItems = filteredPages.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    title: item.label,
  }));

  // Navegación al pulsar un item (funciona también con el sidebar colapsado)
  const handleMenuClick = ({ key }) => {
    const page = pages.find((p) => p.key === key);
    if (page) {
      navigate(page.path);
      closeDrawer();
    }
  };

  return (
    <ConfigProvider theme={{ token: { fontFamily: 'var(--font-family-base)', fontWeightStrong: 300 } }}>
    <Layout className="app-shell">
      {!isAuthShellPage && <Header />}
      <Layout className="app-shell-body">
        {!isAuthShellPage && !isMobile && (
          <Sider
            width={220}
            collapsedWidth={76}
            theme="light"
            className="app-sider"
            collapsible
            collapsed={collapsed}
            trigger={null}
            onCollapse={(value) => setCollapsed(value)}
          >
            <div className="app-sider-inner">
              <div className="app-sider-toggle">
                <Button
                  type="text"
                  aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                  onClick={() => setCollapsed(!collapsed)}
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                />
              </div>
              <Menu
                className="app-menu app-sider-menu"
                mode="inline"
                inlineCollapsed={collapsed}
                selectedKeys={selectedKeys}
                onClick={handleMenuClick}
                items={menuItems}
              />
              <SidebarFooter collapsed={collapsed} />
            </div>
          </Sider>
        )}

        {isMobile && !isAuthShellPage && (
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
          open={drawerVisible}
          height="auto"
        >
          <div className="app-drawer-body">
            <Menu
              className="app-menu"
              mode="inline"
              selectedKeys={selectedKeys}
              onClick={handleMenuClick}
              items={menuItems}
            />
            <SidebarFooter />
          </div>
        </Drawer>

        <Layout className={!isMobile && !isAuthShellPage ? 'app-main-layout' : undefined}>
          <Content
            className={!isMobile && !isAuthShellPage ? 'app-main-content' : undefined}
            style={isAuthShellPage ? { background: 'transparent' } : undefined}
          >
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
                  <ProtectedRoute allowedTypes={[1, 3, 4, 5]}>
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
    </ConfigProvider>
  );
}

export default App;
