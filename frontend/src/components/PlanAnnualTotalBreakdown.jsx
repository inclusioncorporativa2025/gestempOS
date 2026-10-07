import React from 'react';
import {
  ANNUAL_DISCOUNT_LABEL,
  ANNUAL_RENEWAL_LABEL,
  formatPrecioPlan,
  calcTotalAnualLista,
} from '../constants/plans';

const PlanAnnualTotalBreakdown = ({
  plan,
  licencias,
  className = 'facturacion-price-summary__annual-breakdown',
}) => {
  const subtotalLista = calcTotalAnualLista(plan, licencias);
  const totalEfectivo = calcTotalAnualEfectivo(plan, licencias);
  const descuento = Math.round((subtotalLista - totalEfectivo) * 100) / 100;

  return (
    <div className={className}>
      <div className="facturacion-price-summary__breakdown-row">
        <span>
          {licencias}
          {' '}
          licencias ×
          {' '}
          {formatPrecioPlan(subtotalLista / licencias)}
          {' '}
          € (12 meses)
        </span>
        <span>
          {formatPrecioPlan(subtotalLista)}
          {' '}
          €
        </span>
      </div>
      <div className="facturacion-price-summary__breakdown-row facturacion-price-summary__breakdown-row--discount">
        <span>
          Descuento primer año (
          {ANNUAL_DISCOUNT_LABEL}
          )
        </span>
        <span>
          −
          {formatPrecioPlan(descuento)}
          {' '}
          €
        </span>
      </div>
      <div className="facturacion-price-summary__breakdown-row facturacion-price-summary__breakdown-row--renewal">
        <span>
          {ANNUAL_RENEWAL_LABEL}
          {' '}
          (referencia)
        </span>
        <span>
          {formatPrecioPlan(subtotalLista)}
          {' '}
          € / año
        </span>
      </div>
    </div>
  );
};

export default PlanAnnualTotalBreakdown;
