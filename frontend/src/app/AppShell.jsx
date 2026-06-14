import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../constants/routes';
import { Layout, Menu, Drawer, Button, ConfigProvider } from 'antd';
import {
  MenuOutlined,
  SlidersOutlined,
  SearchOutlined,
  FieldTimeOutlined,
  LoginOutlined,
  CalendarOutlined,
  MailOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import Login from './pages/Login';
import Home from './pages/Home';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import GradientButton from './components/shared/GradientButton';
import Header from './components/Header';
import SidebarFooter from './components/SidebarFooter';
import SidebarEmpresaBrand from './components/SidebarEmpresaBrand';
import SupportModal from './components/SupportModal';
import { OPEN_SUPPORT_EVENT } from './components/Header';
import { useAuth } from '../config/AuthContext';
import GestionTiempoPage from './pages/GestionTiempoPage';
import UserManagementForm from './pages/gestor/UserManagementForm';
import ConfiguracionLayout, { ConfiguracionOrgGate } from './pages/gestor/ConfiguracionLayout';
import ConfiguracionUsuario from './pages/gestor/ConfiguracionUsuario';
import ConfiguracionEmpresa from './pages/gestor/ConfiguracionEmpresa';
import ConfiguracionJornada from './pages/gestor/ConfiguracionJornada';
import Calendario from './pages/Calendario';
import BuscadorEmpresa from './pages/admin/BuscadorEmpresa';
import BuscadorUsuarios from './pages/BuscadorUsuarios';
import ProtectedRoute from './components/ProtectedRoute';
import Notificaciones from './pages/Notificaciones';

import './App.css';
import './styles/sidebar.css';
import './styles/app-layout.css';
import './styles/app-page.css';
import './styles/forms.css';
import './styles/modal-actions.css';

const { Sider, Content } = Layout;

const pages = [
  {
    label: 'Fichar',
    key: '1',
    icon: <LoginOutlined />,
    path: APP_ROUTES.home,
    tipousuario: [1, 3, 4, 5],
  },
  {
    label: 'Gestión Tiempo',
    key: '2',
    icon: <FieldTimeOutlined />,
    path: APP_ROUTES.timeLogs,
    tipousuario: [1, 3, 4, 5],
  },
  {
    label: 'Personal',
    key: '3',
    icon: <SearchOutlined />,
    path: APP_ROUTES.users,
    tipousuario: [1, 3, 4, 6],
  },
  {
    label: 'Calendario',
    key: '9',
    icon: <CalendarOutlined />,
    path: APP_ROUTES.calendar,
    tipousuario: [1, 3, 4, 5],
  },
  {
    label: 'Configuración',
    key: '6',
    icon: <SlidersOutlined />,
    path: APP_ROUTES.settings,
    tipousuario: [1, 2, 3, 4, 5, 6],
  },
  {
    label: 'Empresas',
    key: '8',
    icon: <SlidersOutlined />,
    path: APP_ROUTES.companies,
    tipousuario: [1, 2],
  },
  {
    label: 'Notificaciones',
    key: '10',
    icon: <MailOutlined />,
    path: APP_ROUTES.notifications,
    tipousuario: [1, 3, 4],
  },
];

const AppShell = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tipousuario = user?.tipo_usuario ?? null;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const openSupport = () => setSupportOpen(true);
    window.addEventListener(OPEN_SUPPORT_EVENT, openSupport);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, openSupport);
  }, []);

  const isMobile = windowWidth < 950;
  const isAuthShellPage = [
    APP_ROUTES.login,
    APP_ROUTES.register,
    APP_ROUTES.forgotPassword,
    APP_ROUTES.resetPassword,
  ].includes(location.pathname);

  const showDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  const filteredPages =
    tipousuario != null
      ? pages.filter((page) => page.tipousuario.includes(tipousuario))
      : [];

  const paginaActual = pages.find((page) => {
    if (page.path === APP_ROUTES.settings) {
      return (
        location.pathname === page.path ||
        location.pathname.startsWith(`${page.path}/`)
      );
    }
    return page.path.toLowerCase() === location.pathname.toLowerCase();
  });
  const selectedKeys = paginaActual ? [paginaActual.key] : [];

  const menuItems = filteredPages.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    title: item.label,
  }));

  const handleMenuClick = ({ key }) => {
    const page = pages.find((p) => p.key === key);
    if (page) {
      const dest =
        page.path === APP_ROUTES.settings ? APP_ROUTES.settingsUsuario : page.path;
      navigate(dest);
      closeDrawer();
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: 'var(--font-family-base)',
          fontWeightStrong: 300,
          colorPrimary: '#A85CE0',
          colorBgLayout: '#F6F2FA',
          colorBgContainer: '#FFFFFF',
          borderRadius: 12,
          controlHeight: 42,
        },
        components: {
          Input: {
            borderRadius: 999,
            controlHeight: 42,
            paddingInline: 16,
            lineWidth: 0,
            colorBorder: 'transparent',
            hoverBorderColor: 'transparent',
            activeBorderColor: 'transparent',
            activeShadow: '0 4px 18px rgba(168, 92, 224, 0.16)',
          },
          Select: {
            borderRadius: 999,
            controlHeight: 42,
            lineWidth: 0,
            colorBorder: 'transparent',
            hoverBorderColor: 'transparent',
            activeBorderColor: 'transparent',
          },
          DatePicker: {
            borderRadius: 999,
            controlHeight: 42,
            lineWidth: 0,
            colorBorder: 'transparent',
            hoverBorderColor: 'transparent',
            activeBorderColor: 'transparent',
          },
          InputNumber: {
            borderRadius: 999,
            controlHeight: 42,
            lineWidth: 0,
            colorBorder: 'transparent',
            hoverBorderColor: 'transparent',
            activeBorderColor: 'transparent',
          },
        },
      }}
    >
      <Layout className="app-shell">
        <Layout className="app-shell-body">
          {!isAuthShellPage && !isMobile && (
            <div className="app-sider-wrap">
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
                <SidebarEmpresaBrand collapsed={collapsed} />
                <Menu
                  className="app-menu app-sider-menu"
                  mode="inline"
                  inlineCollapsed={collapsed}
                  selectedKeys={selectedKeys}
                  onClick={handleMenuClick}
                  items={menuItems}
                />
                <SidebarFooter
                  collapsed={collapsed}
                  onOpenSupport={() => setSupportOpen(true)}
                />
              </div>
            </Sider>
            <Button
              type="text"
              className="app-sider-edge-toggle"
              aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              onClick={() => setCollapsed(!collapsed)}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            />
            </div>
          )}

          {isMobile && !isAuthShellPage && (
            <GradientButton
              iconStart={<MenuOutlined />}
              onClick={showDrawer}
              className="app-mobile-menu-btn"
              style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                zIndex: 1000,
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
              <SidebarEmpresaBrand />
              <Menu
                className="app-menu"
                mode="inline"
                selectedKeys={selectedKeys}
                onClick={handleMenuClick}
                items={menuItems}
              />
              <SidebarFooter onOpenSupport={() => setSupportOpen(true)} />
            </div>
          </Drawer>

          <Layout
            className={[
              'app-main-column',
              isAuthShellPage ? 'app-main-column--auth' : '',
            ].filter(Boolean).join(' ')}
          >
            {!isAuthShellPage && <Header />}

            <Layout className={!isAuthShellPage ? 'app-main-layout' : undefined}>
              <Content
                className={!isAuthShellPage ? 'app-main-content' : undefined}
                style={isAuthShellPage ? { background: 'transparent' } : undefined}
              >
              <Routes>
                <Route path={APP_ROUTES.login} element={<Login />} />
                <Route path={APP_ROUTES.register} element={<Register />} />
                <Route path={APP_ROUTES.forgotPassword} element={<ForgotPassword />} />
                <Route path={APP_ROUTES.resetPassword} element={<ResetPassword />} />
                <Route
                  path={APP_ROUTES.timeLogs}
                  element={
                    <ProtectedRoute allowedTypes={[1, 3, 4, 5]}>
                      <GestionTiempoPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.home}
                  element={
                    <ProtectedRoute allowedTypes={[1, 3, 4, 5]}>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.usersAdd}
                  element={
                    <ProtectedRoute allowedTypes={[1, 3, 4]}>
                      <UserManagementForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.calendar}
                  element={
                    <ProtectedRoute allowedTypes={[1, 3, 4, 5]}>
                      <Calendario />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={`${APP_ROUTES.settings}/*`}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4, 5, 6]}>
                      <ConfiguracionLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="usuario" replace />} />
                  <Route path="usuario" element={<ConfiguracionUsuario />} />
                  <Route
                    path="empresa"
                    element={
                      <ConfiguracionOrgGate>
                        <ConfiguracionEmpresa />
                      </ConfiguracionOrgGate>
                    }
                  />
                  <Route
                    path="jornada"
                    element={
                      <ConfiguracionOrgGate>
                        <ConfiguracionJornada />
                      </ConfiguracionOrgGate>
                    }
                  />
                </Route>
                <Route
                  path={APP_ROUTES.companies}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2]}>
                      <BuscadorEmpresa />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.users}
                  element={
                    <ProtectedRoute allowedTypes={[1, 3, 4, 6]}>
                      <BuscadorUsuarios />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.notifications}
                  element={
                    <ProtectedRoute allowedTypes={[1, 3, 4]}>
                      <Notificaciones />
                    </ProtectedRoute>
                  }
                />
                {/* Legacy paths */}
                <Route path="/Home" element={<Navigate to={APP_ROUTES.home} replace />} />
                <Route
                  path="/TimeLogsPanel"
                  element={<Navigate to={APP_ROUTES.timeLogs} replace />}
                />
                <Route
                  path="/UserManagementForm"
                  element={<Navigate to={APP_ROUTES.usersAdd} replace />}
                />
                <Route
                  path="/Calendario"
                  element={<Navigate to={APP_ROUTES.calendar} replace />}
                />
                <Route
                  path="/ConfiguracionGestor"
                  element={<Navigate to={APP_ROUTES.settingsEmpresa} replace />}
                />
                <Route
                  path="/ConfiguracionGestor/*"
                  element={<Navigate to={APP_ROUTES.settingsJornada} replace />}
                />
                <Route
                  path="/buscador-empresa"
                  element={<Navigate to={APP_ROUTES.companies} replace />}
                />
                <Route
                  path="/buscador-usuarios"
                  element={<Navigate to={APP_ROUTES.users} replace />}
                />
                <Route
                  path="/notificaciones"
                  element={<Navigate to={APP_ROUTES.notifications} replace />}
                />
              </Routes>
            </Content>
            </Layout>
          </Layout>
        </Layout>
      </Layout>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </ConfigProvider>
  );
};

export default AppShell;
