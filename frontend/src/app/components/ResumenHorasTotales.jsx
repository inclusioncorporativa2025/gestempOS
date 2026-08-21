import React from 'react';
import {
  NOTA_COMPARATIVA_HORAS,
  detalleJornadaPactada,
  etiquetaJornadaPactada,
  lineasResumenHoras,
  valorJornadaPactada,
} from '../../utils/resumenHorasLabels';
import './ResumenHorasTotales.css';

const ResumenHorasTotales = ({
  totalHoras,
  resumenHoras,
  totalHorasEsperadas,
  className = '',
}) => {
  const etiquetaPactada = etiquetaJornadaPactada(resumenHoras);
  const valorPactado = valorJornadaPactada(resumenHoras, totalHorasEsperadas);
  const detallePactada = detalleJornadaPactada(resumenHoras);
  const lineas = lineasResumenHoras(resumenHoras);

  return (
    <div className={`resumen-horas-totales ${className}`.trim()}>
      <div className="resumen-horas-totales__row">
        <div className="resumen-horas-totales__item resumen-horas-totales__item--trabajadas">
          <span className="resumen-horas-totales__label">Horas trabajadas</span>
          <span className="resumen-horas-totales__valor">{totalHoras ?? '—'}</span>
        </div>
        <div className="resumen-horas-totales__item">
          <span className="resumen-horas-totales__label">{etiquetaPactada}</span>
          <span className="resumen-horas-totales__valor">{valorPactado ?? '—'}</span>
        </div>
      </div>

      {detallePactada && (
        <p className="resumen-horas-totales__detalle">{detallePactada}</p>
      )}

      {lineas.map((linea) => (
        <span key={linea} className="resumen-horas-totales__linea">{linea}</span>
      ))}

      <p className="resumen-horas-totales__nota">
        {resumenHoras?.nota_comparativa || NOTA_COMPARATIVA_HORAS}
      </p>
    </div>
  );
};

export default ResumenHorasTotales;
