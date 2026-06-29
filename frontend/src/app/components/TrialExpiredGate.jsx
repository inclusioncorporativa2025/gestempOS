import React from 'react';
import { Button, Result } from 'antd';
import { dispatchOpenFacturacion } from '../../constants/facturacion';
import { SUPPORT_EMAIL } from '../../constants/support';
import './TrialExpiredGate.css';

const TrialExpiredGate = () => (
  <div className="trial-expired-gate">
    <Result
      status="warning"
      title="Acceso no disponible"
      subTitle="Tu periodo de prueba ha finalizado o ha sido cancelado. Activa una suscripción para seguir gestionando la jornada de tu equipo en Timecor."
      extra={[
        <Button
          type="primary"
          key="facturacion"
          onClick={dispatchOpenFacturacion}
        >
          Elegir plan y pagar
        </Button>,
        <Button key="soporte" href={`mailto:${SUPPORT_EMAIL}`}>
          Contactar con soporte
        </Button>,
      ]}
    />
  </div>
);

export default TrialExpiredGate;
