import React, { useState, useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import { FundProjectionScreenOutlined, PhoneOutlined, PoweroffOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmPopup from './shared/ConfirmPopup';
import { doLogout } from '../../features/auth/authService';
import { useAuth } from '../../config/AuthContext';
import { useEstadoJornada } from '../../hooks/useEstadoJornada';
import { APP_ROUTES } from '../../constants/routes';
import { tieneAccesoHub } from '../../utils/hubAccess';

const getLogoutCopy = (estadoJornada, horasTrabajadas) => {
  if (estadoJornada === 'in') {
    return {
      message: (
        <>
          Vas a salir de la aplicación en este dispositivo. Tu{' '}
          <strong>jornada laboral sigue activa</strong> y el tiempo trabajado
          continuará contabilizándose hasta que registres la salida.
        </>
      ),
      meta: [
        { label: 'Tiempo en jornada', value: horasTrabajadas },
        { value: 'Recuerda fichar salida al finalizar tu día' },
      ],
    };
  }

  if (estadoJornada === 'break') {
    return {
      message: (
        <>
          Tienes un <strong>descanso en curso</strong>. La jornada permanece
          abierta y el registro horario no se interrumpe al cerrar sesión.
        </>
      ),
      meta: [{ value: 'Podrás volver a entrar para gestionar tu jornada' }],
    };
  }

  return {
    message:
      'Se cerrará tu sesión en este dispositivo. Podrás volver a acceder con tus credenciales cuando lo necesites.',
    meta: [],
  };
};

const SidebarFooter = ({ collapsed = false, onOpenSupport }) => {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { logout: clearAuth, user } = useAuth();
  const { estadoJornada, horasTrabajadas } = useEstadoJornada();
  const navigate = useNavigate();
  const location = useLocation();
  const hubAcceso = tieneAccesoHub(user);
  const enHub = location.pathname.startsWith(APP_ROUTES.hub);

  const logoutCopy = useMemo(
    () => getLogoutCopy(estadoJornada, horasTrabajadas),
    [estadoJornada, horasTrabajadas],
  );

  const ejecutarLogout = () => {
    setLogoutOpen(false);
    clearAuth();
    doLogout();
  };

  const abrirSoporte = () => {
    onOpenSupport?.();
  };

  const abrirHub = () => {
    navigate(APP_ROUTES.hubVentas);
  };

  return (
    <>
      <div className={`app-sider-footer ${collapsed ? 'app-sider-footer--collapsed' : ''}`}>
        {hubAcceso ? (
          <Tooltip title={collapsed ? 'Panel de ventas' : ''} placement="right">
            <span className="app-sider-footer-btn-wrap">
              <Button
                type="text"
                className={[
                  'app-sider-footer-btn',
                  'app-sider-footer-btn--ventas-panel',
                  enHub && 'app-sider-footer-btn--active',
                ].filter(Boolean).join(' ')}
                icon={<FundProjectionScreenOutlined />}
                onClick={abrirHub}
                block={!collapsed}
              >
                {!collapsed && 'Panel de ventas'}
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Tooltip title={collapsed ? 'Contactar soporte' : ''} placement="right">
            <span className="app-sider-footer-btn-wrap">
              <Button
                type="text"
                className="app-sider-footer-btn"
                icon={<PhoneOutlined />}
                onClick={abrirSoporte}
                block={!collapsed}
              >
                {!collapsed && 'Soporte'}
              </Button>
            </span>
          </Tooltip>
        )}
        <Tooltip title={collapsed ? 'Cerrar sesión' : ''} placement="right">
          <Button
            type="text"
            className="app-sider-footer-btn app-sider-footer-btn--logout"
            icon={<PoweroffOutlined />}
            onClick={() => setLogoutOpen(true)}
            block={!collapsed}
            danger
          >
            {!collapsed && 'Cerrar sesión'}
          </Button>
        </Tooltip>
      </div>

      <ConfirmPopup
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={ejecutarLogout}
        title="¿Cerrar sesión?"
        message={logoutCopy.message}
        meta={logoutCopy.meta}
        icon={PoweroffOutlined}
        variant="logout"
        confirmText="Sí, cerrar sesión"
        cancelText="Seguir en la app"
      />
    </>
  );
};

export default SidebarFooter;
