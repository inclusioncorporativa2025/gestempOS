import React from 'react';
import { ANNUAL_FREE_MONTHS_BADGE } from '../constants/plans';

const PlanBillingCycleToggle = ({
  value,
  onChange,
  className = '',
  annualBadge = ANNUAL_FREE_MONTHS_BADGE,
  variant = 'pill',
}) => {
  const esAnual = value === 'anual';

  if (variant === 'form') {
    return (
      <div
        className={`plan-billing-form-toggle ${className}`.trim()}
        role="radiogroup"
        aria-label="Ciclo de suscripción"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!esAnual}
          className={`plan-billing-form-toggle__option${!esAnual ? ' is-selected' : ''}`}
          onClick={() => onChange('mensual')}
        >
          <span className="plan-billing-form-toggle__control" aria-hidden />
          <span className="plan-billing-form-toggle__content">
            <span className="plan-billing-form-toggle__label">Mensual</span>
            <span className="plan-billing-form-toggle__hint">Facturación mes a mes</span>
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={esAnual}
          className={`plan-billing-form-toggle__option plan-billing-form-toggle__option--annual${
            esAnual ? ' is-selected' : ''
          }`}
          onClick={() => onChange('anual')}
        >
          <span className="plan-billing-form-toggle__control" aria-hidden />
          <span className="plan-billing-form-toggle__content">
            <span className="plan-billing-form-toggle__label-row">
              <span className="plan-billing-form-toggle__label">Anual</span>
              {annualBadge ? (
                <span className="plan-billing-form-toggle__badge">{annualBadge}</span>
              ) : null}
            </span>
            <span className="plan-billing-form-toggle__hint">Un pago al año</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`facturacion-billing-toggle${esAnual ? ' facturacion-billing-toggle--anual' : ''} ${className}`.trim()}
      role="group"
      aria-label="Ciclo de suscripción"
    >
      <span className="facturacion-billing-toggle__thumb" aria-hidden />
      <button
        type="button"
        className={`facturacion-billing-toggle__option${!esAnual ? ' is-active' : ''}`}
        aria-pressed={!esAnual}
        onClick={() => onChange('mensual')}
      >
        <span className="facturacion-billing-toggle__label">Mensual</span>
      </button>
      <button
        type="button"
        className={`facturacion-billing-toggle__option facturacion-billing-toggle__option--annual${
          esAnual ? ' is-active' : ''
        }`}
        aria-pressed={esAnual}
        onClick={() => onChange('anual')}
      >
        <span className="facturacion-billing-toggle__label">Anual</span>
        {annualBadge ? (
          <span className="facturacion-billing-toggle__badge">{annualBadge}</span>
        ) : null}
      </button>
    </div>
  );
};

export default PlanBillingCycleToggle;
