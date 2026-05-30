import React, { useState, useMemo } from 'react';
import { Button, Tooltip, notification } from 'antd';
import { PhoneOutlined, PoweroffOutlined } from '@ant-design/icons';
import ConfirmPopup from './shared/ConfirmPopup';
import { doLogout } from '../features/auth/authService';
import { useAuth } from '../config/AuthContext';
import { useEstadoJornada } from '../hooks/useEstadoJornada';

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

const SidebarFooter = ({ collapsed = false }) => {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { estadoJornada, horasTrabajadas } = useEstadoJornada();

  const logoutCopy = useMemo(
    () => getLogoutCopy(estadoJornada, horasTrabajadas),
    [estadoJornada, horasTrabajadas],
  );

  const ejecutarLogout = () => {
    doLogout();
    logout();
    window.location.href = '/';
  };

  const notificarSoporte = () => {
    notification.info({
      message: 'Correo de soporte:',
      description: 'soporte@fichaeneltrabajo.es',
    });
  };

  return (
    <>
      <div className={`app-sider-footer ${collapsed ? 'app-sider-footer--collapsed' : ''}`}>
        <Tooltip title={collapsed ? 'soporte@fichaeneltrabajo.es' : ''} placement="right">
          <Button
            type="text"
            className="app-sider-footer-btn"
            icon={<PhoneOutlined />}
            onClick={notificarSoporte}
            block={!collapsed}
          >
            {!collapsed && 'Soporte'}
          </Button>
        </Tooltip>
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
