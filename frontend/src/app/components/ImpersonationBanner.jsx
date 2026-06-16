import React from 'react';
import { Alert, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { useAuth } from '../../config/AuthContext';
import './ImpersonationBanner.css';

const ImpersonationBanner = () => {
  const { user, impersonating, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!impersonating || !user) {
    return null;
  }

  const handleExit = () => {
    stopImpersonation();
    navigate(APP_ROUTES.platformEmpresas);
  };

  return (
    <Alert
      className="impersonation-banner"
      type="warning"
      showIcon
      message={
        <>
          Sesión temporal como <strong>{user.nombre}</strong> ({user.email})
          {user.impersonado_por_email ? (
            <>
              {' '}
              — iniciada por {user.impersonado_por_nombre || user.impersonado_por_email}
            </>
          ) : null}
        </>
      }
      action={
        <Button size="small" type="primary" ghost onClick={handleExit}>
          Volver a mi cuenta
        </Button>
      }
    />
  );
};

export default ImpersonationBanner;
