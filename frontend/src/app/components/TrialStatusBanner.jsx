import React from 'react';
import { Alert, Button } from 'antd';
import { dispatchOpenFacturacion } from '../../constants/facturacion';
import './TrialStatusBanner.css';

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
        description="Cuando finalice deberás activar un plan para seguir usando Timecor."
        action={
          <Button
            type="primary"
            size="small"
            onClick={dispatchOpenFacturacion}
          >
            Ver planes
          </Button>
        }
      />
    </div>
  );
};

export default TrialStatusBanner;
