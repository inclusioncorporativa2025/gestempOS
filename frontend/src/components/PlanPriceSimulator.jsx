import React, { useMemo } from 'react';
import { Slider } from 'antd';
import PlanBillingBreakdown from './PlanBillingBreakdown';
import PlanBillingCycleToggle from './PlanBillingCycleToggle';
import {
  PLANS,
  calcTotalMensual,
  calcTotalAnualPrimerAno,
  formatPrecioPlan,
  PRICE_SUMMARY_TAX_LABEL,
  MIN_LICENCIAS,
  SIMULATOR_BILLING_QUESTION,
  SIMULATOR_WORKERS_QUESTION,
  SIMULATOR_PLAN_QUESTION,
  SIMULATOR_WORKERS_SLIDER_MAX,
  SIMULATOR_SEO_TITLE,
} from '../constants/plans';

const PlanPriceSimulator = ({
  planId,
  onPlanIdChange,
  ciclo = 'mensual',
  licencias,
  onLicenciasChange,
  className = '',
  title = SIMULATOR_SEO_TITLE,
  showPlanPicker = true,
  showBillingToggle = false,
  onCicloChange,
  annualBadgeLabel,
}) => {
  const availablePlans = useMemo(
    () => PLANS.filter((p) => p.available !== false),
    [],
  );

  const plan = useMemo(() => {
    const picked = availablePlans.find((p) => p.id === planId);
    return picked || availablePlans[0] || PLANS[0];
  }, [availablePlans, planId]);

  const qty = Math.max(MIN_LICENCIAS, Number(licencias) || MIN_LICENCIAS);

  const total = useMemo(() => {
    if (ciclo === 'mensual') {
      return calcTotalMensual(plan, qty);
    }
    return calcTotalAnualPrimerAno(plan, qty);
  }, [ciclo, plan, qty]);

  return (
    <section className={`plan-price-simulator ${className}`.trim()} aria-labelledby="plan-price-simulator-title">
      <h3 id="plan-price-simulator-title" className="plan-price-simulator__title">
        {title}
      </h3>

      <div className="plan-price-simulator__layout">
        <form className="plan-price-simulator__form" onSubmit={(e) => e.preventDefault()} noValidate>
          {showBillingToggle ? (
            <fieldset className="plan-price-simulator__group">
              <legend className="plan-price-simulator__question">
                {SIMULATOR_BILLING_QUESTION}
              </legend>
              <PlanBillingCycleToggle
                variant="form"
                className="plan-price-simulator__billing-toggle"
                value={ciclo}
                onChange={onCicloChange}
                annualBadge={annualBadgeLabel}
              />
            </fieldset>
          ) : null}

          <fieldset className="plan-price-simulator__group">
            <legend className="plan-price-simulator__question">
              {SIMULATOR_WORKERS_QUESTION}
            </legend>
            <div className="plan-price-simulator__slider-wrap">
              <output
                className="plan-price-simulator__slider-value"
                htmlFor="plan-price-simulator-licencias"
              >
                <strong>{qty}</strong>
                {' '}
                {qty === 1 ? 'persona' : 'personas'}
              </output>
              <Slider
                id="plan-price-simulator-licencias"
                min={MIN_LICENCIAS}
                max={SIMULATOR_WORKERS_SLIDER_MAX}
                value={Math.min(qty, SIMULATOR_WORKERS_SLIDER_MAX)}
                onChange={(v) => onLicenciasChange?.(v)}
                aria-label={SIMULATOR_WORKERS_QUESTION}
                tooltip={{ open: false }}
              />
              <div className="plan-price-simulator__slider-scale" aria-hidden>
                <span>{MIN_LICENCIAS}</span>
                <span>{SIMULATOR_WORKERS_SLIDER_MAX}</span>
              </div>
            </div>
          </fieldset>

          {showPlanPicker ? (
            <fieldset className="plan-price-simulator__group">
              <legend className="plan-price-simulator__question">
                {SIMULATOR_PLAN_QUESTION}
              </legend>
              <div className="plan-price-simulator__plans" role="radiogroup" aria-label={SIMULATOR_PLAN_QUESTION}>
                {availablePlans.map((item) => {
                  const selected = plan.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`plan-price-simulator__plan plan-price-simulator__plan--${item.variant}${
                        selected ? ' is-selected' : ''
                      }`}
                      onClick={() => onPlanIdChange?.(item.id)}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
        </form>

        <div className="facturacion-price-summary plan-price-simulator__summary">
          <div className="facturacion-price-summary__row">
            <div className="facturacion-price-summary__heading">
              <span>Importe estimado</span>
              <span className="facturacion-price-summary__tax-label">
                {PRICE_SUMMARY_TAX_LABEL}
              </span>
            </div>
            <strong className="facturacion-price-summary__total">
              {formatPrecioPlan(total)}
              {' '}
              €
              <span className="facturacion-price-summary__period">
                {ciclo === 'mensual' ? '/ mes' : '/ año'}
              </span>
            </strong>
          </div>
          <PlanBillingBreakdown plan={plan} licencias={qty} ciclo={ciclo} />
        </div>
      </div>
    </section>
  );
};

export default PlanPriceSimulator;
