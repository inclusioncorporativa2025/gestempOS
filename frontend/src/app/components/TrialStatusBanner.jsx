import React from 'react';
import { Alert, Button } from 'antd';
import { dispatchOpenFacturacion } from '../../constants/facturacion';
import './TrialStatusBanner.css';

const formatFechaFin = (fechaFin) => {
  if (!fechaFin) return null;
  return new Date(fechaFin).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const TrialStatusBanner = ({ trial }) => {
  if (!trial?.enPrueba || !trial?.activa || trial?.expirada) {
    return null;
  }

  const fechaFinTexto = formatFechaFin(trial.fechaFin);
  const dias = trial.diasRestantes ?? 0;
  const urgente = Boolean(trial.advertir);
  const textoDias = dias === 1 ? 'queda 1 día' : `quedan ${dias} días`;

  const message = fechaFinTexto
    ? `Estás en periodo gratuito hasta el ${fechaFinTexto}`
    : 'Estás en periodo gratuito';

  const description = urgente
    ? `Te ${textoDias} de prueba. Activa un plan en Facturación para seguir usando Timecor después.`
    : 'Puedes usar Timecor sin coste hasta esa fecha. Cuando finalice, podrás activar tu suscripción desde Facturación.';

  return (
    <div className="trial-status-banner" role="status">
      <Alert
        type={urgente ? 'warning' : 'info'}
        showIcon
        banner
        message={message}
        description={description}
        action={
          <Button
            type={urgente ? 'primary' : 'default'}
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
