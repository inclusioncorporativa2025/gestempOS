import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { APP_ROUTES, FACTURACION_ROUTES, LANDING_ROUTES } from '../constants/routes';
import { Layout, Menu, Drawer, Button } from 'antd';
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
  BarChartOutlined,
  ShopOutlined,
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
import {
  redirectToApp,
  isAuthAppPath,
  isLegalPath,
  isCampaignLandingPath,
} from '../utils/appLinks';
import { isAppSubdomain, isLandingHost } from '../utils/host';
import CampaignContactPage from '../landing/pages/CampaignContactPage';
import RedirectToLandingCampaign from '../landing/components/RedirectToLandingCampaign';
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
import useHubAccessSync from '../hooks/useHubAccessSync';
import ImpersonationBanner from './components/ImpersonationBanner';
import TrialStatusBanner from './components/TrialStatusBanner';
import TrialExpiredGate from './components/TrialExpiredGate';
import NovedadAppNotifier from './components/NovedadAppNotifier';
import FacturacionPage from './pages/facturacion/FacturacionPage';
import FacturacionExito from './pages/facturacion/FacturacionExito';
import FacturacionCancelado from './pages/facturacion/FacturacionCancelado';
import RenovarSuscripcion from './pages/facturacion/RenovarSuscripcion';
import PagoRedirect from './pages/PagoRedirect';
import NominasPage from './pages/NominasPage';
import ProductividadPage from './pages/ProductividadPage';
import MarketplacePage from './pages/MarketplacePage';
import MarketplaceAsignacionesPage from './pages/MarketplaceAsignacionesPage';
import { useTrialStatus } from '../hooks/useTrialStatus';
import { usePlan } from '../hooks/usePlan';
import { useMarketplaceEmpresaModulos } from '../hooks/useMarketplaceEmpresaModulos';
import { MARKETPLACE_MODULO_ALERTAS } from '../constants/marketplace';

import './App.css';
import './styles/sidebar.css';
import './styles/app-layout.css';
import './styles/app-page.css';
import './styles/app-responsive.css';
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
    label: 'Productividad',
    key: '14',
    icon: <BarChartOutlined />,
    path: APP_ROUTES.productividad,
    tipousuario: [1, 2, 3, 4],
    planFeature: 'informes_productividad',
  },
  {
    label: 'Marketplace',
    key: '15',
    icon: <ShopOutlined />,
    path: APP_ROUTES.marketplace,
    tipousuario: [1, 3, 4],
    marketplaceMenu: true,
  },
  {
    label: 'Mi perfil',
    key: '12',
    icon: <UserOutlined />,
    path: APP_ROUTES.miPerfil,
    tipousuario: [1, 2, 3, 4, 5],
  },
];

const COMPACT_DESKTOP_MAX = 1280;
const MOBILE_MAX = 950;
const MARKETPLACE_SUBMENU_KEY = '15-marketplace';

const marketplaceModMenuKey = (codigo) => `marketplace-mod-${codigo}`;

const shouldCollapseSidebar = (width) => width >= MOBILE_MAX && width < COMPACT_DESKTOP_MAX;

const AppShell = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(() => shouldCollapseSidebar(window.innerWidth));
  const [supportOpen, setSupportOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const tipousuario = user?.tipo_usuario ?? null;
  useHubAccessSync({
    activo: Boolean(user?.id_usuario && !location.pathname.startsWith(APP_ROUTES.hub)),
  });
  const { trial, bloqueado, mostrarAviso } = useTrialStatus();
  const { tieneFeature } = usePlan();
  const esRoot = Number(tipousuario) === 1;
  const puedeVerMarketplaceMenu = [1, 3, 4].includes(Number(tipousuario));
  const [menuOpenKeys, setMenuOpenKeys] = useState([]);

  const authShellPaths = [
    APP_ROUTES.login,
    APP_ROUTES.register,
    APP_ROUTES.forgotPassword,
    APP_ROUTES.resetPassword,
    APP_ROUTES.facturacionExito,
    APP_ROUTES.facturacionCancelado,
    APP_ROUTES.renovarSuscripcion,
    APP_ROUTES.pagoCaducado,
    APP_ROUTES.pagoError,
  ];

  useEffect(() => {
    if (!isLandingHost()) return;
    if (!isAuthAppPath(location.pathname)) return;
    redirectToApp(`${location.pathname}${location.search}`, getAuthToken());
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!ready || !user || !isLandingHost()) return;
    if (
      isAuthAppPath(location.pathname)
      || isLegalPath(location.pathname)
      || isCampaignLandingPath(location.pathname)
    ) {
      return;
    }

    const target = `${location.pathname}${location.search}`;
    redirectToApp(target, getAuthToken());
  }, [ready, user, location.pathname, location.search]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      if (shouldCollapseSidebar(width)) {
        setCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const openSupport = () => setSupportOpen(true);
    window.addEventListener(OPEN_SUPPORT_EVENT, openSupport);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, openSupport);
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/marketplace')) {
      setMenuOpenKeys([MARKETPLACE_SUBMENU_KEY]);
    }
  }, [location.pathname]);

  const isMobile = windowWidth < MOBILE_MAX;
  const isAuthShellPage = authShellPaths.includes(location.pathname)
    || location.pathname.startsWith('/pago/');
  const { modulosActivos } = useMarketplaceEmpresaModulos(
    puedeVerMarketplaceMenu && ready && !isAuthShellPage,
  );
  const mostrarMarketplaceEnMenu = puedeVerMarketplaceMenu && (
    esRoot || modulosActivos.length > 0
  );
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
    if (page.marketplaceMenu) return false;
    if (
      page.path === APP_ROUTES.settings
      || page.path === APP_ROUTES.platform
      || page.path === APP_ROUTES.hub
    ) {
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

  const selectedKeys = useMemo(() => {
    if (location.pathname === APP_ROUTES.marketplace) {
      return ['15'];
    }
    if (location.pathname === APP_ROUTES.marketplaceAsignaciones) {
      return [marketplaceModMenuKey(MARKETPLACE_MODULO_ALERTAS)];
    }
    return paginaActual ? [paginaActual.key] : [];
  }, [location.pathname, paginaActual]);

  const pagesParaMenu = filteredPages.filter((p) => !p.marketplaceMenu);

  const menuItems = useMemo(() => {
    const items = pagesParaMenu.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
      title: item.label,
    }));

    if (!mostrarMarketplaceEnMenu) {
      return items;
    }

    const activadosChildren = modulosActivos.map((m) => ({
      key: marketplaceModMenuKey(m.codigo),
      label: m.nombre,
    }));

    const marketplaceChildren = [
      ...(esRoot ? [{ key: '15', label: 'Catálogo' }] : []),
      ...(activadosChildren.length
        ? [{ type: 'group', label: 'Activados', children: activadosChildren }]
        : []),
    ];

    const marketplaceItem = {
      key: MARKETPLACE_SUBMENU_KEY,
      icon: <ShopOutlined />,
      label: 'Marketplace',
      children: marketplaceChildren,
    };

    const idx = items.findIndex((i) => i.key === '14');
    const insertAt = idx >= 0 ? idx + 1 : items.length;
    return [...items.slice(0, insertAt), marketplaceItem, ...items.slice(insertAt)];
  }, [pagesParaMenu, modulosActivos, esRoot, mostrarMarketplaceEnMenu]);

  const handleMenuClick = ({ key }) => {
    if (key === '15') {
      navigate(APP_ROUTES.marketplace);
      closeDrawer();
      return;
    }
    if (key.startsWith('marketplace-mod-')) {
      const codigo = key.slice('marketplace-mod-'.length);
      if (codigo === MARKETPLACE_MODULO_ALERTAS) {
        navigate(APP_ROUTES.marketplaceAsignaciones);
      }
      closeDrawer();
      return;
    }

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

  if (isCampaignLandingPath(location.pathname)) {
    if (isAppSubdomain()) {
      return <RedirectToLandingCampaign />;
    }
    if (isLandingHost()) {
      const normalized = location.pathname.replace(/\/$/, '') || '/';
      const variant = normalized === LANDING_ROUTES.llamada ? 'llamada' : 'demo';
      return <CampaignContactPage variant={variant} />;
    }
  }

  return (
    <>
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
                  openKeys={collapsed ? [] : menuOpenKeys}
                  onOpenChange={setMenuOpenKeys}
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
                openKeys={menuOpenKeys}
                onOpenChange={setMenuOpenKeys}
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
                <Route path={APP_ROUTES.pago} element={<PagoRedirect />} />
                <Route path={APP_ROUTES.pagoCaducado} element={<PagoRedirect />} />
                <Route path={APP_ROUTES.pagoError} element={<PagoRedirect />} />
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
                  path={APP_ROUTES.productividad}
                  element={
                    <ProtectedRoute allowedTypes={[1, 2, 3, 4]}>
                      <ProductividadPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.marketplaceAsignaciones}
                  element={
                    <ProtectedRoute allowedTypes={[1, 3, 4]}>
                      <MarketplaceAsignacionesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={APP_ROUTES.marketplace}
                  element={
                    <ProtectedRoute allowedTypes={[1]}>
                      <MarketplacePage />
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

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
      {user && !isAuthShellPage && <NovedadAppNotifier />}
      {user && !isAuthShellPage && puedeFichar && <PausaBloqueoOverlay />}
    </>
  );
};

export default AppShell;
