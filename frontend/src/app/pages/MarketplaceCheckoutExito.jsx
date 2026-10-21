import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { APP_ROUTES } from '../../constants/routes';
import { marketplaceModuloPath } from '../../constants/marketplace';
import { verificarCheckoutMarketplacePlazas } from '../../features/marketplace/marketplaceService';

const sesionPagada = (data) =>
  data?.status === 'complete' && data?.payment_status === 'paid';

const MarketplaceCheckoutExito = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [verificando, setVerificando] = useState(Boolean(sessionId));
  const [ok, setOk] = useState(!sessionId);
  const [codigoModulo, setCodigoModulo] = useState(null);

  useEffect(() => {
    if (!sessionId) return undefined;

    let cancelado = false;
    let intentos = 0;
    const maxIntentos = 8;

    const comprobar = async () => {
      try {
        const data = await verificarCheckoutMarketplacePlazas(sessionId);
        if (cancelado) return;

        if (sesionPagada(data)) {
          const codigo = data?.resultado?.codigo_modulo ?? null;
          setCodigoModulo(codigo);
          setOk(true);
          setVerificando(false);
          return;
        }

        intentos += 1;
        if (intentos < maxIntentos) {
          setTimeout(comprobar, 1500);
        } else {
          setOk(false);
          setVerificando(false);
        }
      } catch {
        if (cancelado) return;
        intentos += 1;
        if (intentos < maxIntentos) {
          setTimeout(comprobar, 1500);
        } else {
          setOk(false);
          setVerificando(false);
        }
      }
    };

    comprobar();

    return () => {
      cancelado = true;
    };
  }, [sessionId]);

  if (verificando) {
    return (
      <div className="app-page" style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Confirmando el pago…</p>
      </div>
    );
  }

  if (!ok) {
    return (
      <Result
        status="warning"
        title="Pago pendiente de confirmación"
        subTitle="Si ya has pagado, espera unos segundos y recarga. Si el problema continúa, contacta con soporte."
        extra={[
          <Button type="primary" key="marketplace" onClick={() => navigate(APP_ROUTES.marketplace)}>
            Volver al Marketplace
          </Button>,
        ]}
      />
    );
  }

  const gestionarPath = codigoModulo
    ? marketplaceModuloPath(codigoModulo)
    : APP_ROUTES.marketplace;

  return (
    <Result
      icon={<CheckCircleOutlined />}
      status="success"
      title="Pago confirmado"
      subTitle="El módulo se ha activado en tu suscripción. Ya puedes asignar plazas al personal."
      extra={[
        <Button type="primary" key="gestionar" onClick={() => navigate(gestionarPath)}>
          Gestionar módulo
        </Button>,
        <Link key="catalogo" to={APP_ROUTES.marketplace}>
          Ver catálogo
        </Link>,
      ]}
    />
  );
};

export default MarketplaceCheckoutExito;
