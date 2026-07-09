import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, InputNumber, Spin, Typography, message } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import GradientButton from '../../components/shared/GradientButton';
import {
  PLANS,
  ANNUAL_DISCOUNT_LABEL,
  getPlanMinLicencias,
  getPlanLabel,
  normalizePlanId,
  PLAN_UNAVAILABLE_TOOLTIP,
  PRICES_EXCLUDE_TAX_NOTE,
} from '../../constants/plans';
import {
  crearCheckoutRenovacion,
  getRenovacionInfo,
} from '../../features/billing/billingService';
import '../facturacion/Facturacion.css';

const { Text, Title } = Typography;

const parsePrecio = (value) =>
  parseFloat(String(value || '0').replace(',', '.'));

const RenovarSuscripcion = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const planUrl = normalizePlanId(searchParams.get('plan') || 'esencial');
  const cicloUrl = searchParams.get('ciclo') === 'mensual' ? 'mensual' : 'anual';

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [plan, setPlan] = useState(planUrl);
  const [ciclo, setCiclo] = useState(cicloUrl);
  const [licencias, setLicencias] = useState(5);
  const autoCheckoutRef = useRef(false);

  const cargar = useCallback(async () => {
    if (!token) {
      setError('Enlace de renovación no válido');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getRenovacionInfo(token);
      setInfo(data);
      const planInicial = normalizePlanId(searchParams.get('plan') || data.empresa?.plan_actual || 'esencial');
      setPlan(planInicial);
      setCiclo(searchParams.get('ciclo') === 'mensual' ? 'mensual' : 'anual');
      setLicencias(Math.max(data.licencias || 0, getPlanMinLicencias(planInicial)));
    } catch (err) {
      setError(err.message || 'No se pudo cargar la renovación');
    } finally {
      setLoading(false);
    }
  }, [token, searchParams]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const minLicencias = getPlanMinLicencias(plan);
  const planInfo = PLANS.find((p) => p.id === plan) || PLANS[0];
  const planDisponible = planInfo.available !== false;

  const precioEstimado = useMemo(() => {
    const unitario =
      ciclo === 'mensual'
        ? parsePrecio(planInfo.priceMonthly)
        : parsePrecio(planInfo.priceAnnual);
    return unitario * licencias;
  }, [ciclo, licencias, planInfo.priceAnnual, planInfo.priceMonthly]);

  const iniciarCheckout = useCallback(async () => {
    if (!planDisponible) {
      message.info(PLAN_UNAVAILABLE_TOOLTIP);
      return;
    }
    if (licencias < minLicencias) {
      message.warning(`Mínimo ${minLicencias} licencias para ${getPlanLabel(plan)}`);
      return;
    }

    setCheckoutLoading(true);
    try {
      const { url } = await crearCheckoutRenovacion({
        token,
        plan,
        ciclo,
        licencias,
      });
      if (url) {
        window.location.href = url;
      } else {
        message.error('No se recibió la URL de pago');
      }
    } catch (err) {
      message.error(err.message || 'Error al iniciar el pago');
    } finally {
      setCheckoutLoading(false);
    }
  }, [ciclo, licencias, minLicencias, plan, planDisponible, token]);

  useEffect(() => {
    if (loading || error || !info || autoCheckoutRef.current) return;
    const planParam = searchParams.get('plan');
    const cicloParam = searchParams.get('ciclo');
    if (!planParam || !cicloParam) return;

    const planDef = PLANS.find((p) => p.id === normalizePlanId(planParam));
    if (!planDef?.available) return;

    autoCheckoutRef.current = true;
    iniciarCheckout();
  }, [error, info, iniciarCheckout, loading, searchParams]);

  const handlePlanChange = (nuevoPlan) => {
    const target = PLANS.find((p) => p.id === nuevoPlan);
    if (!target || target.available === false) return;
    setPlan(nuevoPlan);
    setLicencias((prev) => Math.max(prev, getPlanMinLicencias(nuevoPlan)));
  };

  if (loading) {
    return (
      <div className="facturacion-result app-page">
        <Spin size="large" tip="Cargando renovación..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="facturacion-result app-page">
        <Alert type="error" message={error} showIcon />
      </div>
    );
  }

  return (
    <div className="facturacion-page app-page">
      <Title level={3}>Renueva tu suscripción</Title>
      <Text className="facturacion-page__lead">
        {info?.empresa?.nombre
          ? `${info.empresa.nombre}: `
          : ''}
        tu periodo manual finaliza el <strong>{info?.period_end_label}</strong>.
        Elige plan y activa el pago automático con tarjeta (Stripe).
      </Text>

      <Alert
        type="info"
        showIcon
        className="facturacion-panel__alert"
        message={`Plan anual: ${ANNUAL_DISCOUNT_LABEL}.`}
        description="Precios por licencia (usuario). El administrador no cuenta como licencia."
      />

      <div className="facturacion-panel" style={{ marginTop: 24 }}>
        <div className="facturacion-panel__grid" style={{ gridTemplateColumns: '1fr' }}>
          <section className="facturacion-panel__card facturacion-panel__card--checkout">
            <Text className="facturacion-panel__section-title">Configurar plan</Text>

            <div className="facturacion-billing-toggle" role="group" aria-label="Ciclo de suscripción">
              <button
                type="button"
                className={`facturacion-billing-toggle__option${ciclo === 'mensual' ? ' is-active' : ''}`}
                onClick={() => setCiclo('mensual')}
              >
                Mensual
              </button>
              <button
                type="button"
                className={`facturacion-billing-toggle__option${ciclo === 'anual' ? ' is-active' : ''}`}
                onClick={() => setCiclo('anual')}
              >
                Anual
                <span className="facturacion-billing-toggle__badge">{ANNUAL_DISCOUNT_LABEL}</span>
              </button>
            </div>

            <div className="facturacion-plan-picker">
              <div className="facturacion-plan-picker__grid">
                {PLANS.map((item) => {
                  const selected = plan === item.id;
                  const disponible = item.available !== false;
                  return (
                    <span key={item.id} className="facturacion-plan-option-wrap">
                      <span className="facturacion-plan-option__badge-slot" aria-hidden={disponible}>
                        {!disponible ? (
                          <span className="facturacion-plan-option__badge">Próximamente</span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        disabled={!disponible}
                        className={`facturacion-plan-option facturacion-plan-option--${item.variant}${
                          selected ? ' is-selected' : ''
                        }${!disponible ? ' is-unavailable' : ''}`}
                        onClick={() => handlePlanChange(item.id)}
                      >
                        <span className="facturacion-plan-option__head">
                          <span className="facturacion-plan-option__name">{item.name}</span>
                          {selected && disponible ? (
                            <CheckCircleFilled className="facturacion-plan-option__check" />
                          ) : null}
                        </span>
                        <span className="facturacion-plan-option__price">
                          {ciclo === 'mensual'
                            ? `${item.priceMonthly} €`
                            : `${item.priceAnnual} €`}
                          <span className="facturacion-plan-option__unit">
                            {ciclo === 'mensual' ? '/ usuario / mes' : '/ usuario / año'}
                          </span>
                        </span>
                        <span className="facturacion-plan-option__min">
                          Mín. {item.minLicencias} licencias
                        </span>
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="facturacion-panel__field">
              <Text type="secondary" className="facturacion-panel__field-label">
                Número de licencias
              </Text>
              <InputNumber
                min={minLicencias}
                max={9999}
                value={licencias}
                onChange={(v) => setLicencias(Number(v) || minLicencias)}
                className="facturacion-panel__licencias-input"
              />
              <Text type="secondary" className="facturacion-panel__hint">
                En uso: {info?.licencias_usadas ?? 0}. Mínimo {minLicencias} para {getPlanLabel(plan)}.
              </Text>
            </div>

            <div className="facturacion-price-summary">
              <div className="facturacion-price-summary__row">
                <Text>Importe estimado</Text>
                <strong className="facturacion-price-summary__total">
                  {precioEstimado.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  €
                  <span className="facturacion-price-summary__period">
                    {ciclo === 'mensual' ? ' / mes' : ' / año'}
                  </span>
                </strong>
              </div>
              <Text type="secondary" className="facturacion-price-summary__note">
                {PRICES_EXCLUDE_TAX_NOTE}
                {ciclo === 'anual' ? ` ${ANNUAL_DISCOUNT_LABEL} en el primer año facturado.` : ''}
              </Text>
            </div>

            <GradientButton
              type="button"
              text="Pagar con tarjeta (Stripe)"
              block
              loading={checkoutLoading}
              onClick={iniciarCheckout}
              className="facturacion-panel__cta"
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default RenovarSuscripcion;
