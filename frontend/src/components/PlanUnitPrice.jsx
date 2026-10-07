import React from 'react';
import {
  ANNUAL_DISCOUNT_LABEL,
  PRICE_UNIT_ANNUAL,
  PRICE_UNIT_MONTHLY,
  formatPrecioPlan,
  getPrecioAnualLista,
} from '../constants/plans';

/**
 * Precio unitario en tarjetas de plan (landing, facturación, renovación).
 */
const PlanUnitPrice = ({ plan, ciclo, classPrefix = 'plan-unit-price' }) => {
  if (ciclo === 'mensual') {
    return (
      <span className={`${classPrefix} ${classPrefix}--monthly`}>
        <strong>{plan.priceMonthly} €</strong>
        <span className={`${classPrefix}__unit`}>{PRICE_UNIT_MONTHLY}</span>
      </span>
    );
  }

  const lista = formatPrecioPlan(getPrecioAnualLista(plan));

  return (
    <span className={`${classPrefix} ${classPrefix}--annual`}>
      <span className={`${classPrefix}__ref`}>
        <span className={`${classPrefix}__ref-label`}>12 meses:</span>
        {' '}
        <s className={`${classPrefix}__ref-amount`}>{lista} €</s>
      </span>
      <span className={`${classPrefix}__effective`}>
        <strong>{plan.priceAnnual} €</strong>
        <span className={`${classPrefix}__unit`}>{PRICE_UNIT_ANNUAL}</span>
      </span>
      <span className={`${classPrefix}__badge`}>({ANNUAL_DISCOUNT_LABEL})</span>
    </span>
  );
};

export default PlanUnitPrice;
