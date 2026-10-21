import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Tabs,
} from 'antd';
import {
  CreditCardOutlined,
  SettingOutlined,
  CheckCircleFilled,
  StopOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import PlanUnitPrice from '../../components/PlanUnitPrice';
import PlanBillingBreakdown from '../../components/PlanBillingBreakdown';
import PlanFeaturesInfo from '../../components/PlanFeaturesInfo';
import PlanBillingCycleToggle from '../../components/PlanBillingCycleToggle';
import {
  PLANS,
  ADMIN_CUENTA_REGALO_NOTE,
  USUARIOS_ACCESO_FIELD_LABEL,
  calcTotalMensual,
  calcTotalAnualPrimerAno,
  PRICE_SUMMARY_TAX_LABEL,
  DEFAULT_LICENCIAS,
  getPlanMinLicencias,
  getPlanLabel,
  getPlanTagColor,
  normalizePlanId,
  PLAN_UNAVAILABLE_TOOLTIP,
} from '../../constants/plans';
import {
  getEstadoFacturacion,
  listarFacturasEmitidas,
  abrirDocumentoFactura,
  crearCheckout,
  crearPortal,
  cancelarSuscripcion,
  reactivarSuscripcion,
  cambiarPlan,
  previewCambiarPlan,
} from '../../features/billing/billingService';
import { TRIAL_EXPIRED_EVENT } from '../../hooks/useTrialStatus';
import { scrollFacturacionSection } from '../../constants/facturacion';
import { APP_ROUTES } from '../../constants/routes';
import FacturacionAmpliarPlazasBlock from './FacturacionAmpliarPlazasBlock';
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

const FacturacionPanel = ({
  activo = true,
  focusLicencias = false,
  licenciasSugeridasAlAbrir = null,
}) => {
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cambiarPlanLoading, setCambiarPlanLoading] = useState(false);
  const [cambiarPlanModalOpen, setCambiarPlanModalOpen] = useState(false);
  const [previewCambioPlan, setPreviewCambioPlan] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRequestId = useRef(0);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivarLoading, setReactivarLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelConfirmText, setCancelConfirmText] = useState('');
  const [estado, setEstado] = useState(null);
  const [vista, setVista] = useState('suscripcion');
  const [facturas, setFacturas] = useState([]);
  const [facturasLoading, setFacturasLoading] = useState(false);
  const [tieneClienteStripe, setTieneClienteStripe] = useState(false);
  const [plan, setPlan] = useState('esencial');
  const [ciclo, setCiclo] = useState('mensual');
  const [licencias, setLicencias] = useState(DEFAULT_LICENCIAS);

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
          data.licencias ?? 0,
          data.licencias_usadas ?? 0,
          getPlanMinLicencias(planSeleccionable),
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

  const cargarFacturas = useCallback(async () => {
    if (!activo) return;
    setFacturasLoading(true);
    try {
      const data = await listarFacturasEmitidas(5);
      setFacturas(data.facturas || []);
      setTieneClienteStripe(Boolean(data.tiene_cliente_stripe));
    } catch (error) {
      message.error(error.message || 'No se pudieron cargar las facturas');
      setFacturas([]);
    } finally {
      setFacturasLoading(false);
    }
  }, [activo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!activo || loading || !focusLicencias) return;
    if (licenciasSugeridasAlAbrir != null && Number.isFinite(licenciasSugeridasAlAbrir)) {
      setLicencias((prev) => Math.max(prev, licenciasSugeridasAlAbrir));
    }
    const timer = window.setTimeout(() => {
      const destino = document.getElementById('facturacion-ampliar-plazas')
        ? 'facturacion-ampliar-plazas'
        : 'facturacion-configurar-plan';
      scrollFacturacionSection(destino);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [activo, loading, focusLicencias, licenciasSugeridasAlAbrir]);

  const handleCambioVista = (key) => {
    setVista(key);
    if (key === 'facturas') {
      cargarFacturas();
    }
  };

  const handleAbrirFactura = async (idFactura) => {
    try {
      await abrirDocumentoFactura(idFactura);
    } catch (error) {
      message.error(error.message || 'No se pudo abrir la factura');
    }
  };

  const minLicencias = Math.max(
    getPlanMinLicencias(plan),
    estado?.licencias_usadas ?? 0,
  );
  const planInfo = PLANS.find((p) => p.id === plan) || PLANS[0];
  const planDisponible = planInfo.available !== false;

  const precioEstimado = useMemo(() => {
    if (ciclo === 'mensual') {
      return calcTotalMensual(planInfo, licencias);
    }
    return calcTotalAnualPrimerAno(planInfo, licencias);
  }, [ciclo, licencias, planInfo]);

  const handlePlanChange = (nuevoPlan) => {
    const target = PLANS.find((p) => p.id === nuevoPlan);
    if (!target || target.available === false) return;
    setPlan(nuevoPlan);
    setLicencias((prev) => Math.max(prev, getPlanMinLicencias(nuevoPlan)));
  };

  const handleCheckout = async () => {
    if (!planDisponible) {
      message.info(PLAN_UNAVAILABLE_TOOLTIP);
      return;
    }
    if (estado?.puede_cambiar_plan) {
      message.info(
        'Ya tienes suscripción activa en Stripe. Amplía plazas a la izquierda o confirma el total prorrateo aquí; no hace falta volver a pagar el plan completo.',
      );
      scrollFacturacionSection(
        document.getElementById('facturacion-ampliar-plazas')
          ? 'facturacion-ampliar-plazas'
          : 'facturacion-configurar-plan',
      );
      return;
    }
    if (licencias < minLicencias) {
      message.warning(`Indica al menos ${minLicencias} usuario(s) con acceso`);
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

  const suscripcionActiva =
    estado?.estado_suscripcion === 'active' || estado?.estado_suscripcion === 'trialing';
  const esLegacy = estado?.modo_facturacion === 'legacy' || estado?.es_legacy;

  const puedeCambiarPlan =
    Boolean(estado?.puede_cambiar_plan) && !esLegacy;
  const planActual = normalizePlanId(estado?.plan || plan);
  const licenciasActuales = estado?.licencias ?? licencias;
  const hayCambiosPendientes =
    plan !== planActual || Number(licencias) !== Number(licenciasActuales);
  const soloAmpliacionPlazas =
    plan === planActual && Number(licencias) > Number(licenciasActuales);

  const abrirConfirmacionCambioPlan = () => {
    if (!planDisponible) {
      message.info(PLAN_UNAVAILABLE_TOOLTIP);
      return;
    }
    if (licencias < minLicencias) {
      message.warning(`Indica al menos ${minLicencias} usuario(s) con acceso`);
      return;
    }
    if (!hayCambiosPendientes) {
      message.info('Selecciona un plan o número de licencias distinto al actual');
      return;
    }
    setCambiarPlanModalOpen(true);
  };

  const ejecutarCambioPlan = async () => {
    setCambiarPlanLoading(true);
    try {
      const resultado = await cambiarPlan({ plan, licencias });
      message.success(
        `Plan actualizado a ${resultado.plan_label || getPlanLabel(plan)}. `
        + 'Stripe cargará el importe prorrateado en su método de pago.',
      );
      setCambiarPlanModalOpen(false);
      setPreviewCambioPlan(null);
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo cambiar el plan');
    } finally {
      setCambiarPlanLoading(false);
    }
  };

  useEffect(() => {
    if (!activo || !puedeCambiarPlan || !hayCambiosPendientes) {
      setPreviewCambioPlan(null);
      setPreviewLoading(false);
      return undefined;
    }

    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const preview = await previewCambiarPlan({ plan, licencias });
        if (previewRequestId.current === requestId) {
          setPreviewCambioPlan(preview);
        }
      } catch {
        if (previewRequestId.current === requestId) {
          setPreviewCambioPlan(null);
        }
      } finally {
        if (previewRequestId.current === requestId) {
          setPreviewLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [activo, puedeCambiarPlan, hayCambiosPendientes, plan, licencias]);

  if (loading && !estado) {
    return (
      <div className="facturacion-panel facturacion-panel--loading">
        <Spin />
      </div>
    );
  }

  const enPruebaStripe = Boolean(estado?.en_prueba_stripe);
  const fechaFinAcceso = enPruebaStripe
    ? estado?.trial_ends_at || estado?.current_period_end
    : estado?.current_period_end;

  const modoFacturacion = String(estado?.modo_facturacion || '').toLowerCase();
  const stripeSinSuscripcionActiva =
    modoFacturacion === 'stripe' && !estado?.puede_cambiar_plan;
  const modoSuscripcionLabel = enPruebaStripe
    ? 'Prueba gratuita'
    : stripeSinSuscripcionActiva
      ? 'Pendiente de activación'
      : MODO_LABELS[estado?.modo_facturacion] || estado?.modo_facturacion || '—';

  const contenidoFacturas = (
    <section className="facturacion-panel__card facturacion-panel__card--invoices">
      <div className="facturacion-panel__card-head">
        <Text className="facturacion-panel__section-title">Últimas facturas emitidas</Text>
        {facturas.length > 0 ? (
          <Tag color="blue">{facturas.length}</Tag>
        ) : null}
      </div>

      {!tieneClienteStripe ? (
        <Text type="secondary" className="facturacion-invoices__empty">
          Las facturas estarán disponibles cuando actives la suscripción con Stripe.
        </Text>
      ) : facturasLoading ? (
        <div className="facturacion-invoices__loading">
          <Spin size="small" />
        </div>
      ) : facturas.length === 0 ? (
        <Text type="secondary" className="facturacion-invoices__empty">
          Aún no hay facturas emitidas. Se generan automáticamente al activar la suscripción.
        </Text>
      ) : (
        <ul className="facturacion-invoices__list">
          <li className="facturacion-invoices__header" aria-hidden>
            <span>Nº serie</span>
            <span>Fecha emisión</span>
            <span>Total</span>
            <span />
          </li>
          {facturas.map((factura) => (
            <li key={factura.id} className="facturacion-invoices__item">
              <span className="facturacion-invoices__numero">{factura.numero}</span>
              <span className="facturacion-invoices__fecha">
                {formatFecha(factura.fecha)}
              </span>
              <strong className="facturacion-invoices__importe">
                {formatEuro(factura.importe)} {factura.moneda}
              </strong>
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                className="facturacion-invoices__download"
                onClick={() => handleAbrirFactura(factura.id)}
              >
                Ver factura
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const contenidoSuscripcion = (
    <>
      {enPruebaStripe && !estado?.cancel_at_period_end && (
        <Alert
          type="info"
          showIcon
          className="facturacion-panel__alert"
          message="Estás en periodo de prueba"
          description={
            <>
              Tienes acceso gratuito hasta el <strong>{formatFecha(fechaFinAcceso)}</strong>.
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
              ? 'Hasta esa fecha puedes seguir usando TimeCor. No se te cobrará nada.'
              : 'Hasta esa fecha puedes seguir usando TimeCor con normalidad.'
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
            <span className="facturacion-status-admin__label">Admin</span>
            <span className="facturacion-status-admin__value">1</span>
            <span className="facturacion-status-admin__note">
              {ADMIN_CUENTA_REGALO_NOTE}
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
            {estado?.current_period_end && (suscripcionActiva || esLegacy) && !enPruebaStripe && (
              <div className="facturacion-status-list__row">
                <dt>{estado?.cancel_at_period_end ? 'Acceso hasta' : 'Próxima renovación'}</dt>
                <dd>{formatFecha(estado.current_period_end)}</dd>
              </div>
            )}
            {(estado?.ciclo_facturacion || esLegacy) && (
              <div className="facturacion-status-list__row">
                <dt>Ciclo de suscripción</dt>
                <dd>{(estado.ciclo_facturacion || 'anual') === 'anual' ? 'Anual' : 'Mensual'}</dd>
              </div>
            )}
            {stripeSinSuscripcionActiva && estado?.estado_suscripcion ? (
              <div className="facturacion-status-list__row">
                <dt>Estado en Stripe</dt>
                <dd>{ESTADO_LABELS[estado.estado_suscripcion] || estado.estado_suscripcion}</dd>
              </div>
            ) : null}
          </dl>

          {estado && puedeCambiarPlan ? (
            <FacturacionAmpliarPlazasBlock
              estado={estado}
              planActual={planActual}
              licenciasActuales={licenciasActuales}
              puedeCambiarPlan={puedeCambiarPlan}
              onActualizado={cargar}
            />
          ) : null}

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

        <section
          id="facturacion-configurar-plan"
          className="facturacion-panel__card facturacion-panel__card--checkout"
        >
          <div className="facturacion-plan-section-head">
            <Text className="facturacion-panel__section-title facturacion-panel__section-title--inline">
              {puedeCambiarPlan ? 'Cambiar de plan' : 'Configurar plan'}
            </Text>
            {!puedeCambiarPlan ? (
              <PlanBillingCycleToggle value={ciclo} onChange={setCiclo} />
            ) : null}
          </div>

          {puedeCambiarPlan ? (
            <Text type="secondary" className="facturacion-panel__hint facturacion-panel__hint--block">
              Ciclo actual:{' '}
              <strong>{ciclo === 'anual' ? 'Anual' : 'Mensual'}</strong>
              . El cambio de plan mantiene el mismo ciclo hasta la próxima renovación.
            </Text>
          ) : null}

          <div className="facturacion-plan-picker">
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
                        <span className="facturacion-plan-option__name-row">
                          <span className="facturacion-plan-option__name">{item.name}</span>
                          <PlanFeaturesInfo planName={item.name} features={item.features} />
                        </span>
                        {selected && disponible ? (
                          <CheckCircleFilled className="facturacion-plan-option__check" />
                        ) : null}
                      </span>
                      <span className="facturacion-plan-option__price">
                        <PlanUnitPrice
                          plan={item}
                          ciclo={ciclo}
                          layout="stack"
                          omitPeriodInLabels
                          classPrefix="facturacion-plan-option"
                        />
                      </span>
                      <span className="facturacion-plan-option__min">
                        Cuota base + usuarios
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
              {USUARIOS_ACCESO_FIELD_LABEL}
            </Text>
            <InputNumber
              min={minLicencias}
              value={licencias}
              onChange={(v) => setLicencias(v ?? minLicencias)}
              className="facturacion-panel__licencias-input"
            />
          </div>

          <div className="facturacion-price-summary">
            <div className="facturacion-price-summary__row">
              <div className="facturacion-price-summary__heading">
                <span>
                  {puedeCambiarPlan ? 'Total prorrateo' : 'Importe estimado'}
                </span>
                {!puedeCambiarPlan ? (
                  <span className="facturacion-price-summary__tax-label">
                    {PRICE_SUMMARY_TAX_LABEL}
                  </span>
                ) : null}
              </div>
              <strong className="facturacion-price-summary__total">
                {puedeCambiarPlan ? (
                  previewLoading ? (
                    <Spin size="small" />
                  ) : previewCambioPlan ? (
                    <>
                      {formatEuro(previewCambioPlan.importe_cobrar_ahora_eur)} €
                    </>
                  ) : (
                    '—'
                  )
                ) : (
                  <>
                    {formatEuro(precioEstimado)} €
                    <span className="facturacion-price-summary__period">
                      {ciclo === 'mensual' ? '/ mes' : '/ año'}
                    </span>
                  </>
                )}
              </strong>
            </div>
            {!puedeCambiarPlan ? (
              <PlanBillingBreakdown
                plan={planInfo}
                licencias={licencias}
                ciclo={ciclo}
              />
            ) : null}
            {puedeCambiarPlan ? (
              <Text type="secondary" className="facturacion-price-summary__note">
                {soloAmpliacionPlazas || previewCambioPlan?.cambio_solo_plazas
                  ? 'Solo se prorratean las plazas nuevas; no se vuelve a cobrar la cuota base ni el descuento del primer año. '
                  : ''}
                {previewCambioPlan?.importe_iva_eur > 0
                  ? `Incluye ${formatEuro(previewCambioPlan.importe_iva_eur)} € de IVA${previewCambioPlan.regimen_impuesto_etiqueta ? ` (${previewCambioPlan.regimen_impuesto_etiqueta})` : ''}. `
                  : previewCambioPlan?.regimen_impuesto_etiqueta
                    ? `${previewCambioPlan.regimen_impuesto_etiqueta}. `
                    : ''}
                Según los días restantes del periodo.
              </Text>
            ) : null}
          </div>

          {puedeCambiarPlan ? (
            <Button
              type="primary"
              size="large"
              block
              icon={<CreditCardOutlined />}
              loading={cambiarPlanLoading}
              disabled={!planDisponible || !hayCambiosPendientes || previewLoading || !previewCambioPlan}
              onClick={abrirConfirmacionCambioPlan}
              className="facturacion-panel__cta"
            >
              {soloAmpliacionPlazas ? 'Ampliar plazas (prorrateo)' : 'Cambiar de plan'}
            </Button>
          ) : (
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
          )}
        </section>
      </div>
    </>
  );

  return (
    <div className="facturacion-panel">
      <Tabs
        activeKey={vista}
        onChange={handleCambioVista}
        className="facturacion-panel__tabs"
        items={[
          { key: 'suscripcion', label: 'Suscripción', children: contenidoSuscripcion },
          { key: 'facturas', label: 'Facturas', children: contenidoFacturas },
        ]}
      />

      <Modal
        title="Confirmar cambio de plan"
        open={cambiarPlanModalOpen}
        onCancel={() => setCambiarPlanModalOpen(false)}
        onOk={ejecutarCambioPlan}
        okText="Confirmar cambio"
        cancelText="Cancelar"
        confirmLoading={cambiarPlanLoading}
        okButtonProps={{ disabled: !previewCambioPlan || previewLoading }}
        destroyOnClose
      >
        <p className="facturacion-cancel-modal__text">
          Pasará de <strong>{getPlanLabel(planActual)}</strong> ({licenciasActuales} licencias)
          {' '}a <strong>{getPlanLabel(plan)}</strong> ({licencias} licencias).
        </p>
        {previewCambioPlan?.lineas?.length > 0 && (
          <ul className="facturacion-preview-lines">
            {previewCambioPlan.lineas.map((linea) => (
              <li key={`${linea.descripcion}-${linea.importe_eur}`} className="facturacion-preview-lines__item">
                <span className="facturacion-preview-lines__desc">{linea.descripcion}</span>
                <span className="facturacion-preview-lines__amount">
                  {linea.importe_eur < 0 ? '−' : ''}
                  {formatEuro(Math.abs(linea.importe_eur))} €
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="facturacion-cancel-modal__text">
          <strong>Total prorrateo:</strong>{' '}
          {previewCambioPlan
            ? `${formatEuro(previewCambioPlan.importe_cobrar_ahora_eur)} €`
            : '—'}
          {previewCambioPlan?.importe_iva_eur > 0
            ? ` (IVA incl.: ${formatEuro(previewCambioPlan.importe_iva_eur)} €)`
            : null}
        </p>
        <p className="facturacion-cancel-modal__text">
          Stripe cargará este importe en su método de pago al confirmar el cambio.
        </p>
      </Modal>

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
