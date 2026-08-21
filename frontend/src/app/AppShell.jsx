import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { APP_ROUTES, FACTURACION_ROUTES } from '../constants/routes';
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
  AppstoreOutlined,
  UserOutlined,
  FileTextOutlined,
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
import PausaBloqueoOverlay from './components/PausaBloqueoOverlay';
import { OPEN_SUPPORT_EVENT } from './components/Header';
import { useAuth } from '../config/AuthContext';
import { puedeVerNotificacionesSesion } from '../utils/tipoUsuarioLabel';
import { redirectToApp, isAuthAppPath, isLegalPath } from '../utils/appLinks';
import { isLandingHost } from '../utils/host';
import { getAuthToken } from '../utils/authSession';
import GestionTiempoPage from './pages/GestionTiempoPage';
import UserManagementForm from './pages/gestor/UserManagementForm';
import ConfiguracionLayout, { ConfiguracionOrgGate } from './pages/gestor/ConfiguracionLayout';
import ConfiguracionUsuario from './pages/gestor/ConfiguracionUsuario';
import ConfiguracionEmpresa from './pages/gestor/ConfiguracionEmpresa';
import ConfiguracionJornada from './pages/gestor/ConfiguracionJornada';
import ConfiguracionConvenios from './pages/gestor/ConfiguracionConvenios';
import Calendario from './pages/Calendario';
import BuscadorEmpresa from './pages/admin/BuscadorEmpresa';
import BuscadorUsuarios from './pages/BuscadorUsuarios';
import FichaPersonal from './pages/FichaPersonal';
import ProtectedRoute from './components/ProtectedRoute';
import NavigationTracker from './components/NavigationTracker';
import Notificaciones from './pages/Notificaciones';
import PlatformLayout from './pages/platform/PlatformLayout';
import PlatformAccesos from './pages/platform/PlatformAccesos';
import PlatformConvenios from './pages/platform/PlatformConvenios';
import PlatformNovedades from './pages/platform/PlatformNovedades';
import PlatformAcceder from './pages/platform/PlatformAcceder';
import HubLayout from './pages/hub/HubLayout';
import HubVentas from './pages/hub/HubVentas';
import HubAccesos from './pages/hub/HubAccesos';
import HubDashboard from './pages/hub/HubDashboard';
import HubProtectedRoute from './components/HubProtectedRoute';
import HubAccesosRoute from './components/HubAccesosRoute';
import HubPlataformaRoute from './components/HubPlataformaRoute';
import { tieneAccesoHub } from '../utils/hubAccess';
import ImpersonationBanner from './components/ImpersonationBanner';
import TrialStatusBanner from './components/TrialStatusBanner';
import TrialExpiredGate from './components/TrialExpiredGate';
import NovedadAppNotifier from './components/NovedadAppNotifier';
import FacturacionPage from './pages/facturacion/FacturacionPage';
import FacturacionExito from './pages/facturacion/FacturacionExito';
import FacturacionCancelado from './pages/facturacion/FacturacionCancelado';
import RenovarSuscripcion from './pages/facturacion/RenovarSuscripcion';
import NominasPage from './pages/NominasPage';
import { useTrialStatus } from '../hooks/useTrialStatus';
import { usePlan } from '../hooks/usePlan';

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
    tipousuario: [1, 2, 3, 4, 5],
  },
  {
    label: 'Gestión Tiempo',
    key: '2',
    icon: <FieldTimeOutlined />,
    path: APP_ROUTES.timeLogs,
    tipousuario: [1, 2, 3, 4, 5],
  },
  {
    label: 'Personal',
    key: '3',
    icon: <SearchOutlined />,
    path: APP_ROUTES.users,
    tipousuario: [1, 2, 3, 4, 6],
  },
  {
    label: 'Calendario',
    key: '9',
    icon: <CalendarOutlined />,
    path: APP_ROUTES.calendar,
    tipousuario: [1, 2, 3, 4, 5],
  },
  {
    label: 'Configuración',
    key: '6',
    icon: <SlidersOutlined />,
    path: APP_ROUTES.settings,
    tipousuario: [1, 2, 3, 4, 5, 6],
  },
  {
    label: 'Gestión interna',
    key: '11',
    icon: <AppstoreOutlined />,
    path: APP_ROUTES.platform,
    tipousuario: [1, 2],
  },
  {
    label: 'Notificaciones',
    key: '10',
    icon: <MailOutlined />,
    path: APP_ROUTES.notifications,
    tipousuario: [3, 4, 5],
  },
  {
    label: 'Nóminas',
    key: '13',
    icon: <FileTextOutlined />,
    path: APP_ROUTES.nominas,
    tipousuario: [1, 2, 3, 4],
    planFeature: 'nominas',
  },
  {
    label: 'Mi perfil',
    key: '12',
    icon: <UserOutlined />,
    path: APP_ROUTES.miPerfil,
    tipousuario: [1, 2, 3, 4, 5],
  },
];

const AppShell = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const tipousuario = user?.tipo_usuario ?? null;
  const hubAcceso = tieneAccesoHub(user);
  const { trial, bloqueado, mostrarAviso } = useTrialStatus();
  const { tieneFeature } = usePlan();

  const authShellPaths = [
    APP_ROUTES.login,
    APP_ROUTES.register,
    APP_ROUTES.forgotPassword,
    APP_ROUTES.resetPassword,
    APP_ROUTES.facturacionExito,
    APP_ROUTES.facturacionCancelado,
    APP_ROUTES.renovarSuscripcion,
  ];

  useEffect(() => {
    if (!isLandingHost()) return;
    if (!isAuthAppPath(location.pathname)) return;
    redirectToApp(`${location.pathname}${location.search}`, getAuthToken());
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!ready || !user || !isLandingHost()) return;
    if (isAuthAppPath(location.pathname) || isLegalPath(location.pathname)) return;

    const target = `${location.pathname}${location.search}`;
    redirectToApp(target, getAuthToken());
  }, [ready, user, location.pathname, location.search]);

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
  const isAuthShellPage = authShellPaths.includes(location.pathname);
  const esRutaFacturacion = FACTURACION_ROUTES.includes(location.pathname);
  const puedeFichar = [1, 2, 3, 4, 5].includes(Number(tipousuario));

  const showDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  const filteredPages =
    tipousuario != null
      ? pages.filter(
        (page) => (
          page.path === APP_ROUTES.notifications
            ? puedeVerNotificacionesSesion(user)
            : page.tipousuario.includes(tipousuario)
        )
          && (!page.planFeature || tieneFeature(page.planFeature)),
      )
      : [];

  const paginaActual = pages.find((page) => {
    if (page.path === APP_ROUTES.settings || page.path === APP_ROUTES.platform || page.path === APP_ROUTES.hub) {
      return (
        location.pathname === page.path ||
        location.pathname.startsWith(`${page.path}/`)
      );
    }
    if (page.path === APP_ROUTES.miPerfil) {
      return location.pathname === APP_ROUTES.miPerfil;
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
        page.path === APP_ROUTES.settings
          ? APP_ROUTES.settingsUsuario
          : page.path === APP_ROUTES.platform
            ? APP_ROUTES.platformEmpresas
            : page.path;
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
        <NavigationTracker />
        <Layout
          className={['app-shell-body', isAuthShellPage && 'app-shell-body--auth']
            .filter(Boolean)
            .join(' ')}
        >
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
            {!isAuthShellPage && <ImpersonationBanner />}
            {!isAuthShellPage && mostrarAviso && <TrialStatusBanner trial={trial} />}
            {!isAuthShellPage && <Header />}

            <Layout className={!isAuthShellPage ? 'app-main-layout' : undefined}>
              <Content
                className={!isAuthShellPage ? 'app-main-content' : undefined}
                style={isAuthShellPage ? { background: 'transparent' } : undefined}
              >
              {!isAuthShellPage && bloqueado && !esRutaFacturacion ? (
                <TrialExpiredGate />
              ) : (
                <>
              <Routes>
                <Route path={APP_ROUTES.login} element={<Login />} />
                <Route path={APP_ROUTES.register} element={<Register />} />
                <Route path={APP_ROUTES.forgotPassword} element={<ForgotPassword />} />
                <Route path={APP_ROUTES.resetPassword} element={<ResetPassword />} />
                <Route path={APP_ROUTES.facturacionExito} element={<FacturacionExito />} />
                <Route path={APP_ROUTES.facturacionCancelado} element={<FacturacionCancelado />} />
                <Route path={APP_ROUTES.renovarSuscripcion} element={<RenovarSuscripcion />} />
                <Route
                  path={APP_ROUTES.timeLogs}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4, 5]}>
                      <GestionTiempoPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.home}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4, 5]}>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.usersAdd}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4]}>
                      <UserManagementForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.calendar}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4, 5]}>
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
                  <Route
                    path="convenios"
                    element={
                      <ConfiguracionOrgGate>
                        <ConfiguracionConvenios />
                      </ConfiguracionOrgGate>
                    }
                  />
                </Route>
                <Route
                  path={`${APP_ROUTES.platform}/*`}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2]}>
                      <PlatformLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="empresas" replace />} />
                  <Route path="empresas" element={<BuscadorEmpresa embedded />} />
                  <Route path="accesos" element={<PlatformAccesos />} />
                  <Route path="acceder" element={<PlatformAcceder />} />
                  <Route
                    path="convenios"
                    element={
                      <ProtectedRoute allowedTypes={[1]}>
                        <PlatformConvenios />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="novedades"
                    element={
                      <ProtectedRoute allowedTypes={[1]}>
                        <PlatformNovedades />
                      </ProtectedRoute>
                    }
                  />
                </Route>
                <Route
                  path={`${APP_ROUTES.hub}/*`}
                  element={
                    <HubProtectedRoute>
                      <HubLayout />
                    </HubProtectedRoute>
                  }
                >
                  <Route
                    index
                    element={(
                      <Navigate
                        to={Number(user?.tipo_usuario) <= 2 ? 'metricas' : 'ventas'}
                        replace
                      />
                    )}
                  />
                  <Route
                    path="metricas"
                    element={(
                      <HubPlataformaRoute>
                        <HubDashboard />
                      </HubPlataformaRoute>
                    )}
                  />
                  <Route path="ventas" element={<HubVentas />} />
                  <Route
                    path="accesos"
                    element={
                      <HubAccesosRoute>
                        <HubAccesos />
                      </HubAccesosRoute>
                    }
                  />
                </Route>
                <Route
                  path="/companies"
                  element={<Navigate to={APP_ROUTES.platformEmpresas} replace />}
                />
                <Route
                  path={APP_ROUTES.nominas}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4]}>
                      <NominasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.miPerfil}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4, 5]}>
                      <FichaPersonal />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={`${APP_ROUTES.users}/:id`}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4]}>
                      <FichaPersonal />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.users}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4, 6]}>
                      <BuscadorUsuarios />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.notifications}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4, 5]}>
                      <Notificaciones />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.facturacion}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3]}>
                      <FacturacionPage />
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
                  element={<Navigate to={APP_ROUTES.platformEmpresas} replace />}
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
                </>
              )}
            </Content>
            </Layout>
          </Layout>
        </Layout>
      </Layout>

      {!hubAcceso && (
        <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
      )}
      {user && !isAuthShellPage && <NovedadAppNotifier />}
      {user && !isAuthShellPage && puedeFichar && <PausaBloqueoOverlay />}
    </ConfigProvider>
  );
};

export default AppShell;
