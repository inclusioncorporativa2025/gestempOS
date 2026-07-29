import React from 'react';
import { Button } from 'antd';
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
  const textoDias = dias === 1 ? '1 día' : `${dias} días`;

  let texto = fechaFinTexto
    ? `Estás en periodo gratuito hasta el ${fechaFinTexto}.`
    : 'Estás en periodo gratuito.';

  if (urgente) {
    texto = fechaFinTexto
      ? `Periodo gratuito: te quedan ${textoDias} (hasta el ${fechaFinTexto}).`
      : `Periodo gratuito: te quedan ${textoDias}.`;
  }

  return (
    <div
      className={`trial-status-banner${urgente ? ' trial-status-banner--urgente' : ''}`}
      role="status"
    >
      <span className="trial-status-banner__text">{texto}</span>
      <Button
        type="link"
        size="small"
        className="trial-status-banner__action"
        onClick={dispatchOpenFacturacion}
      >
        Ver planes
      </Button>
    </div>
  );
};

export default TrialStatusBanner;
