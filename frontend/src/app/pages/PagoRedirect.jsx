import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Spin, Typography } from 'antd';
import { APP_ROUTES } from '../../constants/routes';
import './PagoRedirect.css';

const { Title, Paragraph, Text } = Typography;

const API_BASE = (process.env.REACT_APP_API_BASE_URL || '/api/').replace(/\/?$/, '/');

const PagoRedirect = () => {
  const { codigo } = useParams();
  const [searchParams] = useSearchParams();
  const [estado, setEstado] = useState('loading');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const path = window.location.pathname;
    if (path.endsWith('/caducado')) {
      setEstado('caducado');
      setMensaje('El enlace de pago ha caducado. Solicita uno nuevo a tu comercial.');
      return;
    }
    if (path.endsWith('/error')) {
      setEstado('error');
      setMensaje('No se pudo abrir el enlace de pago.');
      return;
    }

    if (!codigo) {
      setEstado('error');
      setMensaje('Enlace de pago no válido.');
      return;
    }

    const resolver = async () => {
      try {
        const response = await fetch(
          `${API_BASE}pago/${encodeURIComponent(codigo)}/resolver`,
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setEstado(response.status === 410 ? 'caducado' : 'error');
          setMensaje(data.message || 'No se pudo abrir el enlace de pago.');
          return;
        }
        if (data?.url) {
          window.location.replace(data.url);
          return;
        }
        setEstado('error');
        setMensaje('No se recibió la URL de pago.');
      } catch {
        setEstado('error');
        setMensaje('Error de conexión al resolver el enlace de pago.');
      }
    };

    resolver();
  }, [codigo, searchParams]);

  if (estado === 'loading') {
    return (
      <div className="pago-redirect-page gradient-bg">
        <div className="pago-redirect-panel">
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
            Redirigiendo a la pasarela de pago…
          </Paragraph>
        </div>
      </div>
    );
  }

  return (
    <div className="pago-redirect-page gradient-bg">
      <div className="pago-redirect-panel">
        <Title level={3}>
          {estado === 'caducado' ? 'Enlace caducado' : 'Enlace no disponible'}
        </Title>
        <Paragraph>{mensaje}</Paragraph>
        {searchParams.get('codigo') && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Referencia: {searchParams.get('codigo')}
          </Text>
        )}
        <Link to={APP_ROUTES.login}>Volver al inicio de sesión</Link>
      </div>
    </div>
  );
};

export default PagoRedirect;
