import React from 'react';
import {
  ADMIN_CUENTA_REGALO_NOTE,
  formatPrecioPlan,
  getPlanBaseAnnual,
  getPlanBaseMonthly,
  getPlanSeatAnnual,
  getPlanSeatMonthly,
  calcTotalAnualLista,
  calcDescuentoAnualPrimerAno,
  calcTotalAnualPrimerAno,
  calcTotalMensual,
} from '../constants/plans';

const BreakdownRow = ({ label, amount, rowClassName = '' }) => (
  <div className={`facturacion-price-summary__breakdown-row ${rowClassName}`.trim()}>
    <span className="facturacion-price-summary__breakdown-label">{label}</span>
    <span className="facturacion-price-summary__breakdown-amount">{amount}</span>
  </div>
);

const AdminGratisRow = () => (
  <BreakdownRow
    label={ADMIN_CUENTA_REGALO_NOTE}
    amount="0,00 €"
    rowClassName="facturacion-price-summary__breakdown-row--included"
  />
);

const PlanBillingBreakdown = ({
  plan,
  licencias,
  ciclo = 'mensual',
  className = 'facturacion-price-summary__annual-breakdown',
}) => {
  if (ciclo === 'mensual') {
    const base = getPlanBaseMonthly(plan);
    const seat = getPlanSeatMonthly(plan);
    const seatsTotal = seat * licencias;
    const total = calcTotalMensual(plan, licencias);

    return (
      <div className={className}>
        <div className="facturacion-price-summary__breakdown-partidas">
          <BreakdownRow
            label="Cuota base del servicio TimeCor"
            amount={`${formatPrecioPlan(base)} €`}
          />
          <BreakdownRow
            label={`${licencias} usuario${licencias === 1 ? '' : 's'} × ${formatPrecioPlan(seat)} € / mes`}
            amount={`${formatPrecioPlan(seatsTotal)} €`}
          />
          <AdminGratisRow />
        </div>
        <div className="facturacion-price-summary__breakdown-total-block">
          <BreakdownRow
            label="Total mensual"
            amount={`${formatPrecioPlan(total)} € / mes`}
            rowClassName="facturacion-price-summary__breakdown-row--total"
          />
        </div>
      </div>
    );
  }

  const base = getPlanBaseAnnual(plan);
  const seat = getPlanSeatAnnual(plan);
  const seatsTotal = seat * licencias;
  const subtotalLista = calcTotalAnualLista(plan, licencias);
  const descuento = calcDescuentoAnualPrimerAno(plan, licencias);
  const totalPrimerAno = calcTotalAnualPrimerAno(plan, licencias);

  return (
    <div className={className}>
      <div className="facturacion-price-summary__breakdown-partidas">
        <BreakdownRow
          label="Cuota base anual"
          amount={`${formatPrecioPlan(base)} €`}
        />
        <BreakdownRow
          label={`${licencias} usuario${licencias === 1 ? '' : 's'} × ${formatPrecioPlan(seat)} € / año`}
          amount={`${formatPrecioPlan(seatsTotal)} €`}
        />
        <AdminGratisRow />
      </div>

      <div className="facturacion-price-summary__breakdown-subtotal">
        <BreakdownRow
          label="Subtotal"
          amount={`${formatPrecioPlan(subtotalLista)} €`}
          rowClassName="facturacion-price-summary__breakdown-row--subtotal"
        />
      </div>

      <div className="facturacion-price-summary__breakdown-adjustments">
        <BreakdownRow
          label="Descuento primer año"
          amount={`−${formatPrecioPlan(descuento)} €`}
          rowClassName="facturacion-price-summary__breakdown-row--discount"
        />
      </div>

      <div className="facturacion-price-summary__breakdown-total-block">
        <BreakdownRow
          label="Total estimado primer año (sin IVA)"
          amount={`${formatPrecioPlan(totalPrimerAno)} €`}
          rowClassName="facturacion-price-summary__breakdown-row--total"
        />
      </div>
    </div>
  );
};

export default PlanBillingBreakdown;
