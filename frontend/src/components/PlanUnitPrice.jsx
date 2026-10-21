import React from 'react';
import {
  PRICE_BASE_ANNUAL_LABEL,
  PRICE_BASE_BILLING_LABEL,
  PRICE_BASE_MONTHLY_LABEL,
  PRICE_UNIT_ANNUAL,
  PRICE_UNIT_BILLING_LABEL,
  PRICE_UNIT_MONTHLY,
  formatPrecioPlan,
  getPlanBaseAnnual,
  getPlanBaseMonthly,
  getPlanSeatAnnual,
  getPlanSeatMonthly,
} from '../constants/plans';

const PriceCol = ({ amount, unitLabel, classPrefix }) => (
  <span className={`${classPrefix}__col`}>
    <strong className={`${classPrefix}__amount`}>{amount}</strong>
    <span className={`${classPrefix}__unit`}>{unitLabel}</span>
  </span>
);

/**
 * Precio en tarjetas de plan (landing, facturación, renovación): base + licencia/usuario.
 * @param {'columns'|'stack'} layout — columns: base | usuario (landing); stack: base arriba, usuario abajo.
 */
const PlanUnitPrice = ({
  plan,
  ciclo,
  classPrefix = 'plan-unit-price',
  layout = 'columns',
  /** Sin «/ mes» ni «/ año» (p. ej. facturación con toggle arriba). */
  omitPeriodInLabels = false,
}) => {
  const baseUnitLabel = omitPeriodInLabels
    ? PRICE_BASE_BILLING_LABEL
    : ciclo === 'mensual'
      ? PRICE_BASE_MONTHLY_LABEL
      : PRICE_BASE_ANNUAL_LABEL;
  const seatUnitLabel = omitPeriodInLabels
    ? PRICE_UNIT_BILLING_LABEL
    : ciclo === 'mensual'
      ? PRICE_UNIT_MONTHLY
      : PRICE_UNIT_ANNUAL;

  const colsClass =
    layout === 'stack'
      ? `${classPrefix}__cols ${classPrefix}__cols--stack`
      : `${classPrefix}__cols`;

  if (ciclo === 'mensual') {
    const base = formatPrecioPlan(getPlanBaseMonthly(plan));
    const seat = plan.priceSeatMonthly ?? plan.priceMonthly;

    return (
      <span className={`${classPrefix} ${classPrefix}--monthly ${classPrefix}--base-seat`}>
        <span className={colsClass}>
          <PriceCol
            classPrefix={classPrefix}
            amount={`${base} €`}
            unitLabel={baseUnitLabel}
          />
          <PriceCol
            classPrefix={classPrefix}
            amount={`+ ${seat} €`}
            unitLabel={seatUnitLabel}
          />
        </span>
      </span>
    );
  }

  const base = formatPrecioPlan(getPlanBaseAnnual(plan));
  const seat = formatPrecioPlan(getPlanSeatAnnual(plan));

  return (
    <span className={`${classPrefix} ${classPrefix}--annual ${classPrefix}--base-seat`}>
      <span className={colsClass}>
        <PriceCol
          classPrefix={classPrefix}
          amount={`${base} €`}
          unitLabel={baseUnitLabel}
        />
        <PriceCol
          classPrefix={classPrefix}
          amount={`+ ${seat} €`}
          unitLabel={seatUnitLabel}
        />
      </span>
    </span>
  );
};

export default PlanUnitPrice;
