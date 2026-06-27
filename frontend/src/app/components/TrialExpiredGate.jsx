import React from 'react';
import { Button, Result } from 'antd';
import { LANDING_URL } from '../../constants/urls';
import { LANDING_ROUTES } from '../../constants/routes';
import { SUPPORT_EMAIL } from '../../constants/support';
import './TrialExpiredGate.css';

const planesHref = `${LANDING_URL}${LANDING_ROUTES.plans}`;

const TrialExpiredGate = () => (
  <div className="trial-expired-gate">
    <Result
      status="warning"
      title="Tu periodo de prueba ha finalizado"
      subTitle="Han pasado los 15 días de prueba gratuita. Elige un plan para seguir gestionando la jornada de tu equipo en Timecor."
      extra={[
        <Button type="primary" key="planes" href={planesHref} target="_blank" rel="noopener noreferrer">
          Ver planes y precios
        </Button>,
        <Button key="soporte" href={`mailto:${SUPPORT_EMAIL}`}>
          Contactar con soporte
        </Button>,
      ]}
    />
  </div>
);

export default TrialExpiredGate;
