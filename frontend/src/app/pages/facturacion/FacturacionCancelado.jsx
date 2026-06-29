import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { APP_ROUTES } from '../../../constants/routes';
import { dispatchOpenFacturacion } from '../../../constants/facturacion';
import './Facturacion.css';

const FacturacionCancelado = () => {
  const navigate = useNavigate();

  return (
    <div className="facturacion-result app-page">
      <Result
        status="info"
        title="Pago cancelado"
        subTitle="No se ha realizado ningún cargo. Puedes volver a intentarlo cuando quieras."
        extra={[
          <Button
            type="primary"
            key="retry"
            onClick={() => {
              navigate(APP_ROUTES.home);
              dispatchOpenFacturacion();
            }}
          >
            Volver a intentar
          </Button>,
          <Button key="home" onClick={() => navigate(APP_ROUTES.home)}>
            Ir al inicio
          </Button>,
        ]}
      />
    </div>
  );
};

export default FacturacionCancelado;
