import React from 'react';
import { Alert, Button } from 'antd';
import { LANDING_URL } from '../../constants/urls';
import { LANDING_ROUTES } from '../../constants/routes';
import './TrialStatusBanner.css';

const planesHref = `${LANDING_URL}${LANDING_ROUTES.plans}`;

const TrialStatusBanner = ({ trial }) => {
  if (!trial?.advertir || trial?.expirada) {
    return null;
  }

  const dias = trial.diasRestantes ?? 0;
  const textoDias =
    dias === 1 ? 'queda 1 día' : `quedan ${dias} días`;

  return (
    <div className="trial-status-banner" role="status">
      <Alert
        type="warning"
        showIcon
        message={`Periodo de prueba: ${textoDias}`}
        description="Cuando finalice deberás elegir un plan para seguir usando Timecor."
        action={
          <Button type="primary" size="small" href={planesHref} target="_blank" rel="noopener noreferrer">
            Ver planes
          </Button>
        }
      />
    </div>
  );
};

export default TrialStatusBanner;
