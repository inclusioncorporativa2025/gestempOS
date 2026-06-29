import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography,
  Tag,
  Button,
  InputNumber,
  Input,
  Spin,
  Alert,
  message,
  Tooltip,
  Modal,
} from 'antd';
import {
  CreditCardOutlined,
  SettingOutlined,
  CheckCircleFilled,
  StopOutlined,
} from '@ant-design/icons';
import {
  PLANS,
  ANNUAL_DISCOUNT_LABEL,
  getPlanMinLicencias,
  getPlanLabel,
  getPlanTagColor,
  normalizePlanId,
  PLAN_UNAVAILABLE_TOOLTIP,
} from '../../constants/plans';
import {
  getEstadoFacturacion,
  crearCheckout,
  crearPortal,
  cancelarSuscripcion,
  reactivarSuscripcion,
} from '../../features/billing/billingService';
import { TRIAL_EXPIRED_EVENT } from '../../hooks/useTrialStatus';
import { APP_ROUTES } from '../../constants/routes';
import '../pages/facturacion/Facturacion.css';

const { Text } = Typography;

const ESTADO_LABELS = {
  active: 'Activa',
  trialing: 'En prueba',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
  unpaid: 'Impagada',
  incomplete: 'Incompleta',
};

const MODO_LABELS = {
  trial: 'Periodo de prueba',
  stripe: 'Stripe',
  legacy: 'Manual',
};

const parsePrecio = (value) =>
  parseFloat(String(value || '0').replace(',', '.'));

const formatFecha = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatEuro = (amount) =>
  amount.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const FacturacionPanel = ({ activo = true }) => {
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivarLoading, setReactivarLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelConfirmText, setCancelConfirmText] = useState('');
  const [estado, setEstado] = useState(null);
  const [plan, setPlan] = useState('esencial');
  const [ciclo, setCiclo] = useState('mensual');
  const [licencias, setLicencias] = useState(5);

  const cargar = useCallback(async () => {
    if (!activo) return;
    setLoading(true);
    try {
      const data = await getEstadoFacturacion();
      setEstado(data);
      const planActual = normalizePlanId(data.plan);
      const planDef = PLANS.find((p) => p.id === planActual);
      const planSeleccionable =
        planDef?.available !== false ? planActual : 'esencial';
      setPlan(planSeleccionable);
      setLicencias(
        Math.max(
          data.licencias || 0,
          data.min_licencias || getPlanMinLicencias(planSeleccionable),
        ),
      );
      if (data.ciclo_facturacion === 'anual') {
        setCiclo('anual');
      }
    } catch (error) {
      message.error(error.message || 'No se pudo cargar la suscripción');
    } finally {
      setLoading(false);
    }
  }, [activo]);

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

  const handlePlanChange = (nuevoPlan) => {
    const target = PLANS.find((p) => p.id === nuevoPlan);
    if (!target || target.available === false) return;
    setPlan(nuevoPlan);
    const min = getPlanMinLicencias(nuevoPlan);
    setLicencias((prev) => Math.max(prev, min));
  };

  const handleCheckout = async () => {
    if (!planDisponible) {
      message.info(PLAN_UNAVAILABLE_TOOLTIP);
      return;
    }
    if (licencias < minLicencias) {
      message.warning(`Mínimo ${minLicencias} licencias para el plan ${getPlanLabel(plan)}`);
      return;
    }

    setCheckoutLoading(true);
    try {
      const { url } = await crearCheckout({ plan, ciclo, licencias });
      if (url) {
        window.location.href = url;
      } else {
        message.error('No se recibió la URL de pago');
      }
    } catch (error) {
      message.error(error.message || 'Error al iniciar el pago');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const returnUrl = `${window.location.origin}${APP_ROUTES.home}`;
      const { url } = await crearPortal(returnUrl);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      message.error(error.message || 'No se pudo abrir el portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelarSuscripcion = () => {
    setCancelConfirmText('');
    setCancelModalOpen(true);
  };

  const ejecutarCancelacion = async () => {
    if (cancelConfirmText.trim().toLowerCase() !== 'cancelar') {
      message.warning('Escribe "cancelar" para confirmar');
      return;
    }

    setCancelLoading(true);
    try {
      const resultado = await cancelarSuscripcion();
      const enPrueba = estado?.estado_suscripcion === 'trialing';

      if (enPrueba || resultado?.acceso_cortado) {
        message.success(
          'Prueba cancelada. Ya no tienes acceso a la plataforma y no se te cobrará nada.',
        );
        window.dispatchEvent(
          new CustomEvent(TRIAL_EXPIRED_EVENT, {
            detail: {
              trial: { expirada: true, cancelada: true, requierePlan: true },
            },
          }),
        );
      } else {
        message.success(
          'Suscripción cancelada. Mantienes el acceso hasta el final del periodo.',
        );
      }

      setCancelModalOpen(false);
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo cancelar la suscripción');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReactivarSuscripcion = async () => {
    setReactivarLoading(true);
    try {
      await reactivarSuscripcion();
      message.success('Suscripción reactivada. Se renovará automáticamente.');
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo reactivar la suscripción');
    } finally {
      setReactivarLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="facturacion-panel facturacion-panel--loading">
        <Spin />
      </div>
    );
  }

  const suscripcionActiva =
    estado?.estado_suscripcion === 'active' || estado?.estado_suscripcion === 'trialing';

  const enPruebaStripe = Boolean(estado?.en_prueba_stripe);
  const fechaFinAcceso = enPruebaStripe
    ? estado?.trial_ends_at || estado?.current_period_end
    : estado?.current_period_end;

  const modoSuscripcionLabel = enPruebaStripe
    ? 'Prueba gratuita'
    : MODO_LABELS[estado?.modo_facturacion] || estado?.modo_facturacion || '—';

  return (
    <div className="facturacion-panel">
      {enPruebaStripe && !estado?.cancel_at_period_end && (
        <Alert
          type="info"
          showIcon
          className="facturacion-panel__alert"
          message="Estás en periodo de prueba"
          description={
            <>
              Tienes acceso gratuito hasta el <strong>{formatFecha(fechaFinAcceso)}</strong>.
              Puedes cancelar en cualquier momento antes sin compromiso: no se te cobrará nada,
              pero perderás el acceso de forma inmediata.
            </>
          }
        />
      )}

      {estado?.trial?.advertir && !suscripcionActiva && (
        <Alert
          type="warning"
          showIcon
          className="facturacion-panel__alert"
          message={`Periodo de prueba: quedan ${estado.trial.diasRestantes} día(s). Activa una suscripción antes de que finalice.`}
        />
      )}

      {estado?.cancel_at_period_end && suscripcionActiva && (
        <Alert
          type="info"
          showIcon
          className="facturacion-panel__alert"
          message={`Cancelación programada para el ${formatFecha(
            enPruebaStripe
              ? estado.trial_ends_at || estado.current_period_end
              : estado.current_period_end,
          )}`}
          description={
            enPruebaStripe
              ? 'Hasta esa fecha puedes seguir usando Timecor. No se te cobrará nada.'
              : 'Hasta esa fecha puedes seguir usando Timecor con normalidad.'
          }
        />
      )}

      <div className="facturacion-panel__grid">
        <section className="facturacion-panel__card facturacion-panel__card--status">
          <div className="facturacion-panel__card-head">
            <Text className="facturacion-panel__section-title">Tu suscripción</Text>
            {estado?.estado_suscripcion ? (
              <Tag color={suscripcionActiva ? 'green' : 'orange'}>
                {ESTADO_LABELS[estado.estado_suscripcion] || estado.estado_suscripcion}
              </Tag>
            ) : null}
          </div>

          <div className="facturacion-status-highlight">
            <Tag color={getPlanTagColor(estado?.plan || plan)} className="facturacion-status-highlight__plan">
              {estado?.plan_label || getPlanLabel(plan)}
            </Tag>
            <Text type="secondary" className="facturacion-status-highlight__modo">
              {modoSuscripcionLabel}
            </Text>
          </div>

          <div className="facturacion-status-metrics">
            <div className="facturacion-status-metric">
              <span className="facturacion-status-metric__value">
                {estado?.licencias_usadas ?? 0}
              </span>
              <span className="facturacion-status-metric__label">En uso</span>
            </div>
            <div className="facturacion-status-metric">
              <span className="facturacion-status-metric__value">
                {estado?.licencias ?? 0}
              </span>
              <span className="facturacion-status-metric__label">Contratadas</span>
            </div>
            <div className="facturacion-status-metric">
              <span className="facturacion-status-metric__value">
                {estado?.plazas_libres ?? '—'}
              </span>
              <span className="facturacion-status-metric__label">Libres</span>
            </div>
          </div>

          <div className="facturacion-status-admin">
            <span className="facturacion-status-admin__label">Administrador</span>
            <span className="facturacion-status-admin__value">1</span>
            <span className="facturacion-status-admin__note">
              Te regalamos el administrador. No cuenta como licencia.
            </span>
          </div>

          <dl className="facturacion-status-list">
            {estado?.trial_ends_at && enPruebaStripe && (
              <div className="facturacion-status-list__row">
                <dt>Fin de la prueba</dt>
                <dd>{formatFecha(estado.trial_ends_at)}</dd>
              </div>
            )}
            {estado?.trial_ends_at && !suscripcionActiva && (
              <div className="facturacion-status-list__row">
                <dt>Fin de prueba</dt>
                <dd>{formatFecha(estado.trial_ends_at)}</dd>
              </div>
            )}
            {estado?.current_period_end && suscripcionActiva && !enPruebaStripe && (
              <div className="facturacion-status-list__row">
                <dt>{estado?.cancel_at_period_end ? 'Acceso hasta' : 'Próxima renovación'}</dt>
                <dd>{formatFecha(estado.current_period_end)}</dd>
              </div>
            )}
            {estado?.ciclo_facturacion && (
              <div className="facturacion-status-list__row">
                <dt>Ciclo de suscripción</dt>
                <dd>{estado.ciclo_facturacion === 'anual' ? 'Anual' : 'Mensual'}</dd>
              </div>
            )}
          </dl>

          {(estado?.puede_portal || estado?.puede_cancelar) && (
            <div className="facturacion-panel__card-footer">
              {estado?.puede_cancelar && !estado?.cancel_at_period_end ? (
                <Button
                  block
                  danger
                  type="default"
                  icon={<StopOutlined />}
                  loading={cancelLoading}
                  onClick={handleCancelarSuscripcion}
                  className="facturacion-panel__cancel-btn"
                >
                  {enPruebaStripe ? 'Cancelar prueba gratuita' : 'Cancelar la suscripción'}
                </Button>
              ) : null}
              {estado?.puede_cancelar && estado?.cancel_at_period_end ? (
                <Button
                  block
                  type="primary"
                  loading={reactivarLoading}
                  onClick={handleReactivarSuscripcion}
                >
                  {enPruebaStripe ? 'Mantener la prueba gratuita' : 'Mantener la suscripción'}
                </Button>
              ) : null}
              {estado?.puede_portal ? (
                <Button
                  block
                  icon={<SettingOutlined />}
                  loading={portalLoading}
                  onClick={handlePortal}
                >
                  Gestiona tu actual suscripción
                </Button>
              ) : null}
            </div>
          )}
        </section>

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
            <Text type="secondary" className="facturacion-panel__field-label">
              Plan
            </Text>
            <div className="facturacion-plan-picker__grid">
              {PLANS.map((item) => {
                const selected = plan === item.id;
                const disponible = item.available !== false;
                const content = (
                  <span className="facturacion-plan-option-wrap">
                    <span
                      className="facturacion-plan-option__badge-slot"
                      aria-hidden={disponible}
                    >
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
                        Mín. {item.minLicenses} licencias
                      </span>
                    </button>
                  </span>
                );

                if (!disponible) {
                  return (
                    <Tooltip key={item.id} title={PLAN_UNAVAILABLE_TOOLTIP}>
                      {content}
                    </Tooltip>
                  );
                }

                return <React.Fragment key={item.id}>{content}</React.Fragment>;
              })}
            </div>
          </div>

          <div className="facturacion-panel__field">
            <Text type="secondary" className="facturacion-panel__field-label">
              Número de licencias
            </Text>
            <InputNumber
              min={minLicencias}
              value={licencias}
              onChange={(v) => setLicencias(v ?? minLicencias)}
              className="facturacion-panel__licencias-input"
            />
            <Text type="secondary" className="facturacion-panel__hint">
              Mínimo {minLicencias}. Te regalamos el administrador; no cuenta como licencia.
            </Text>
          </div>

          <div className="facturacion-price-summary">
            <div className="facturacion-price-summary__row">
              <span>Importe estimado</span>
              <strong className="facturacion-price-summary__total">
                {formatEuro(precioEstimado)} €
                <span className="facturacion-price-summary__period">
                  {ciclo === 'mensual' ? '/ mes' : '/ año'}
                </span>
              </strong>
            </div>
            <Text type="secondary" className="facturacion-price-summary__note">
              {ciclo === 'anual'
                ? `Precio con descuento anual (${ANNUAL_DISCOUNT_LABEL}) en el primer año.`
                : `${planInfo.priceMonthly} € por usuario al mes.`}
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            block
            icon={<CreditCardOutlined />}
            loading={checkoutLoading}
            disabled={!planDisponible}
            onClick={handleCheckout}
            className="facturacion-panel__cta"
          >
            {suscripcionActiva ? 'Actualizar suscripción' : 'Activar suscripción'}
          </Button>
        </section>
      </div>

      <Modal
        title={enPruebaStripe ? '¿Cancelar la prueba gratuita?' : '¿Cancelar la suscripción?'}
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onOk={ejecutarCancelacion}
        okText={enPruebaStripe ? 'Cancelar prueba' : 'Cancelar suscripción'}
        cancelText="Volver"
        okButtonProps={{
          danger: true,
          disabled: cancelConfirmText.trim().toLowerCase() !== 'cancelar',
        }}
        confirmLoading={cancelLoading}
        destroyOnClose
      >
        <p className="facturacion-cancel-modal__text">
          {enPruebaStripe ? (
            <>
              No se te cobrará nada. Al confirmar, <strong>perderás el acceso a la plataforma de
              forma inmediata</strong> y la suscripción no se activará automáticamente.
            </>
          ) : (
            <>
              Seguirás teniendo acceso hasta el{' '}
              <strong>{formatFecha(fechaFinAcceso)}</strong>. Después de esa fecha no se
              renovará automáticamente.
            </>
          )}
        </p>
        <Text type="secondary" className="facturacion-cancel-modal__label">
          Escribe <strong>cancelar</strong> para confirmar:
        </Text>
        <Input
          value={cancelConfirmText}
          onChange={(e) => setCancelConfirmText(e.target.value)}
          placeholder="cancelar"
          autoComplete="off"
          className="facturacion-cancel-modal__input"
        />
      </Modal>
    </div>
  );
};

export default FacturacionPanel;
