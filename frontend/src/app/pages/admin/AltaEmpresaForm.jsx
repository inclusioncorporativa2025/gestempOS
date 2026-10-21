import React, { useEffect, useState } from 'react';
import { Form, Input, Row, Col, Button, InputNumber, Select, Tooltip, Checkbox, Typography } from 'antd';
import { Link } from 'react-router-dom';
import GradientButton from '../../components/shared/GradientButton';
import { LANDING_ROUTES } from '../../../constants/routes';
import {
  PLANS,
  DEFAULT_LICENCIAS,
  getPlanMinLicencias,
  MIN_LICENCIAS,
  USUARIOS_ACCESO_FIELD_LABEL,
  getPlanLabel,
  getPlanMinAnnual,
  formatPrecioPlan,
  getPrecioAnualLista,
  getPrecioAnualEfectivo,
  PRICE_UNIT_MONTHLY,
  PRICE_UNIT_ANNUAL,
  ANNUAL_FREE_MONTHS_BADGE,
  mensajePrimerAnoPorUsuario,
} from '../../../constants/plans';
import {
  PROVINCIAS,
  provinciaDesdeCodigoPostal,
} from '../../../constants/spanishRegions';
import './AltaEmpresa.css';

const { Text } = Typography;

const CODIGOS_CAMPANA_PAGO_INMEDIATO = new Set(['venta-privada']);
const TIPOS_CAMPANA_PAGO_INMEDIATO = new Set(['pago_inmediato', 'venta_directa']);

const esCampanaPagoInmediato = (campanaOrTipo, codigo) => {
  if (campanaOrTipo && typeof campanaOrTipo === 'object') {
    const tipo = String(campanaOrTipo.tipo || '').toLowerCase();
    const cod = String(campanaOrTipo.codigo || '').toLowerCase();
    return TIPOS_CAMPANA_PAGO_INMEDIATO.has(tipo) || CODIGOS_CAMPANA_PAGO_INMEDIATO.has(cod);
  }
  const tipo = String(campanaOrTipo || '').toLowerCase();
  const cod = String(codigo || '').toLowerCase();
  return TIPOS_CAMPANA_PAGO_INMEDIATO.has(tipo) || CODIGOS_CAMPANA_PAGO_INMEDIATO.has(cod);
};

const PLAN_UNAVAILABLE_TOOLTIP =
  'No disponible por el momento, disculpen las molestias';

const PlanBillingToggle = ({ value, onChange, disabled = false }) => (
  <div
    className={`alta-plan-billing${disabled ? ' alta-plan-billing--disabled' : ''}`}
    role="group"
    aria-label="Periodo de facturación"
  >
    <button
      type="button"
      className={`alta-plan-billing-option${value === 'mensual' ? ' alta-plan-billing-option--active' : ''}`}
      aria-pressed={value === 'mensual'}
      disabled={disabled}
      onClick={() => !disabled && onChange('mensual')}
    >
      Mensual
    </button>
    <button
      type="button"
      className={`alta-plan-billing-option${value === 'anual' ? ' alta-plan-billing-option--active' : ''}`}
      aria-pressed={value === 'anual'}
      disabled={disabled}
      onClick={() => !disabled && onChange('anual')}
    >
      Anual
      <span className="alta-plan-billing-badge">({ANNUAL_FREE_MONTHS_BADGE})</span>
    </button>
  </div>
);

const PlanCardPicker = ({
  value,
  onChange,
  onPlanChange,
  billingPeriod = 'mensual',
  readOnly = false,
}) => (
  <div className="alta-plan-picker" role="radiogroup" aria-label="Elige tu plan">
    {PLANS.map((plan) => {
      const selected = value === plan.id;
      const esAnual = billingPeriod === 'anual';
      const bloqueado = readOnly && !selected;
      const selectPlan = () => {
        if (readOnly || !plan.available) return;
        onChange?.(plan.id);
        onPlanChange?.(plan.id);
      };
      const card = (
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={!plan.available || bloqueado}
          className={[
            'alta-plan-option',
            `alta-plan-option--${plan.variant}`,
            selected ? 'alta-plan-option--selected' : '',
            plan.featured ? 'alta-plan-option--featured' : '',
            !plan.available ? 'alta-plan-option--disabled' : '',
            bloqueado ? 'alta-plan-option--locked' : '',
          ].filter(Boolean).join(' ')}
          onClick={selectPlan}
        >
          <span className="alta-plan-option-name">{plan.name}</span>
          <span className="alta-plan-option-price">
            desde{' '}
            {esAnual ? (
              <>
                <s>{formatPrecioPlan(getPrecioAnualLista(plan))} €</s>
                {' → '}
                <strong>{formatPrecioPlan(getPrecioAnualEfectivo(plan))} €</strong>
              </>
            ) : (
              <strong>{plan.priceMonthly} €</strong>
            )}
            <span className="alta-plan-option-unit">
              {esAnual ? PRICE_UNIT_ANNUAL : PRICE_UNIT_MONTHLY}
            </span>
            {esAnual && (
              <>
                <span className="alta-plan-option-first-year">
                  {mensajePrimerAnoPorUsuario(plan)}
                </span>
              </>
            )}
          </span>
          <span className="alta-plan-option-min">
            Cuota base + usuarios
            {esAnual && (
              <span className="alta-plan-option-min-total">
                {' '}· desde {getPlanMinAnnual(plan)} €/año
              </span>
            )}
          </span>
          {!plan.available && (
            <span className="alta-plan-option-unavailable">No disponible</span>
          )}
        </button>
      );

      if (!plan.available) {
        return (
          <Tooltip key={plan.id} title={PLAN_UNAVAILABLE_TOOLTIP}>
            <span className="alta-plan-option-wrap">{card}</span>
          </Tooltip>
        );
      }

      return (
        <span key={plan.id} className="alta-plan-option-wrap">
          {card}
        </span>
      );
    })}
  </div>
);

const AltaEmpresaForm = ({
  form,
  loading,
  onFinish,
  onCancel,
  submitLabel = 'Continuar',
  className = '',
  planId = 'esencial',
  minLicencias: minLicenciasProp,
  showPlanSelect = false,
  planSelectVariant = 'select',
  registroPublico = false,
  requireTermsAcceptance = false,
  collectFiscalAddress = false,
  showCampanaSelect = false,
  campanas = [],
  invitacionPagoInmediato = false,
  invitacionPlan = null,
  bloquearCicloFacturacion = false,
  nombreEmpresaLabel = 'Nombre de la empresa',
  aliasEmpresaLabel = 'Alias de la empresa',
}) => {
  const planEfectivo = registroPublico ? 'rrhh' : planId;
  const mostrarSelectorPlan = showPlanSelect && !registroPublico;
  const planSeleccionado = Form.useWatch('plan', form) || planEfectivo;
  const cicloFacturacion = Form.useWatch('cicloFacturacion', form) || 'mensual';
  const idCampanaSeleccionada = Form.useWatch('id_campana', form);
  const campanaSeleccionada = campanas.find(
    (c) => Number(c.id_campana) === Number(idCampanaSeleccionada),
  );
  const esPagoInmediato = esCampanaPagoInmediato(campanaSeleccionada)
    || invitacionPagoInmediato;
  const mostrarResumenPlanVentaPrivada = registroPublico && invitacionPagoInmediato;
  const mostrarCicloFacturacion = registroPublico
    || esPagoInmediato
    || (mostrarSelectorPlan && planSelectVariant === 'cards');
  const minLicencias = minLicenciasProp ?? MIN_LICENCIAS;
  const isCompact = !registroPublico && planSelectVariant === 'cards';
  const rowGutter = isCompact ? [12, 0] : [16, 16];

  const handlePlanChange = (_nuevoPlan) => {
    const actuales = form.getFieldValue('numLicencias');
    if (actuales == null || Number(actuales) < MIN_LICENCIAS) {
      form.setFieldsValue({ numLicencias: DEFAULT_LICENCIAS });
    }
  };

  const watchedValues = Form.useWatch([], form);
  const [canSubmit, setCanSubmit] = useState(!requireTermsAcceptance);

  useEffect(() => {
    if (!requireTermsAcceptance) {
      setCanSubmit(true);
      return;
    }

    form
      .validateFields({ validateOnly: true })
      .then(() => setCanSubmit(true))
      .catch(() => setCanSubmit(false));
  }, [form, watchedValues, requireTermsAcceptance, minLicencias]);

  useEffect(() => {
    if (!registroPublico || invitacionPagoInmediato) return;
    const actuales = form.getFieldValue('numLicencias');
    form.setFieldsValue({
      plan: 'rrhh',
      cicloFacturacion: form.getFieldValue('cicloFacturacion') || 'mensual',
      ...(actuales == null || Number(actuales) < MIN_LICENCIAS
        ? { numLicencias: DEFAULT_LICENCIAS }
        : {}),
    });
  }, [form, registroPublico, invitacionPagoInmediato]);

  useEffect(() => {
    if (!invitacionPagoInmediato || !invitacionPlan) return;
    const actuales = form.getFieldValue('numLicencias');
    form.setFieldsValue({
      plan: invitacionPlan,
      ...(actuales == null || Number(actuales) < MIN_LICENCIAS
        ? { numLicencias: DEFAULT_LICENCIAS }
        : {}),
    });
  }, [form, invitacionPagoInmediato, invitacionPlan]);

  const handleCodigoPostalChange = (event) => {
    const cp = String(event?.target?.value || '').replace(/\s/g, '');
    const provinciaCp = provinciaDesdeCodigoPostal(cp);
    if (provinciaCp) {
      form.setFieldsValue({ provincia: provinciaCp });
    }
  };

  return (
  <Form
    form={form}
    name="altaEmpresa"
    onFinish={onFinish}
    layout="vertical"
    className={className}
    initialValues={{
      plan: planEfectivo,
      cicloFacturacion: 'mensual',
      numLicencias: DEFAULT_LICENCIAS,
      ...(requireTermsAcceptance ? { acceptTerms: false } : {}),
    }}
  >
    {mostrarResumenPlanVentaPrivada ? (
      <>
        <div className="alta-plan-billing-row">
          <div className="alta-plan-resumen-registro-header">
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, textAlign: 'center' }}>
              Facturación acordada con tu comercial
            </Text>
            <PlanBillingToggle
              value={cicloFacturacion}
              disabled={bloquearCicloFacturacion}
              onChange={(ciclo) => {
                if (bloquearCicloFacturacion) return;
                form.setFieldsValue({ cicloFacturacion: ciclo });
              }}
            />
          </div>
        </div>
        <Form.Item
          name="plan"
          label="Plan contratado"
          className="alta-plan-form-item"
        >
          <PlanCardPicker
            readOnly={bloquearCicloFacturacion}
            onPlanChange={handlePlanChange}
            billingPeriod={cicloFacturacion}
          />
        </Form.Item>
      </>
    ) : null}

    {mostrarSelectorPlan && planSelectVariant === 'cards' ? (
      <>
        <Form.Item name="cicloFacturacion" hidden>
          <Input type="hidden" />
        </Form.Item>
        <div className="alta-plan-billing-row">
          <PlanBillingToggle
            value={cicloFacturacion}
            onChange={(ciclo) => {
              if (bloquearCicloFacturacion) return;
              form.setFieldsValue({ cicloFacturacion: ciclo });
            }}
          />
        </div>
        <Form.Item
          name="plan"
          label="Elige tu plan"
          rules={[{ required: true, message: 'Selecciona un plan' }]}
          className="alta-plan-form-item"
        >
          <PlanCardPicker
            onPlanChange={handlePlanChange}
            billingPeriod={cicloFacturacion}
          />
        </Form.Item>
      </>
    ) : null}

    {mostrarSelectorPlan && planSelectVariant === 'select' && mostrarCicloFacturacion ? (
      <Row gutter={rowGutter}>
        <Col xs={24}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
            Facturación
          </Text>
          <PlanBillingToggle
            value={cicloFacturacion}
            onChange={(ciclo) => {
              if (bloquearCicloFacturacion) return;
              form.setFieldsValue({ cicloFacturacion: ciclo });
            }}
          />
          {esPagoInmediato && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
              Venta privada: sin periodo de prueba. Se generará enlace de pago Stripe al crear la empresa.
            </Text>
          )}
        </Col>
      </Row>
    ) : null}

    <Form.Item name="cicloFacturacion" hidden>
      <Input type="hidden" />
    </Form.Item>
    {!showCampanaSelect ? (
      <Form.Item name="id_campana" hidden>
        <Input type="hidden" />
      </Form.Item>
    ) : null}

    <Row gutter={rowGutter}>
      <Col xs={24} sm={12}>
        <Form.Item
          name="nombre_empresa"
          label={nombreEmpresaLabel}
          rules={[{ required: true, message: 'Campo requerido!' }]}
        >
          <Input placeholder="Ej. Empresa.SA" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name="alias"
          label={aliasEmpresaLabel}
          rules={[{ required: true, message: 'Campo requerido!' }]}
        >
          <Input placeholder="Ej. Empresa1" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name="CIF"
          label="CIF"
          rules={[{ required: true, message: 'Campo requerido!' }]}
        >
          <Input placeholder="Ej.12345678A" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name="Administrador"
          label="Administrador"
          rules={[{ required: true, message: 'Campo requerido!' }]}
        >
          <Input placeholder="Nombre Completo" />
        </Form.Item>
      </Col>
      {mostrarSelectorPlan && planSelectVariant === 'select' ? (
        <Col xs={24} sm={12}>
          <Form.Item
            name="plan"
            label="Plan contratado"
            rules={[{ required: true, message: 'Selecciona un plan' }]}
          >
            <Select
              options={PLANS.map((plan) => ({
                value: plan.id,
                label: plan.name,
                disabled: plan.available === false,
              }))}
              onChange={handlePlanChange}
            />
          </Form.Item>
        </Col>
      ) : null}
      <Col xs={24} sm={12}>
        <Form.Item
          name="numLicencias"
          label={USUARIOS_ACCESO_FIELD_LABEL}
          rules={[
            { required: true, message: 'Campo requerido!' },
            {
              type: 'number',
              min: MIN_LICENCIAS,
              message: 'Indica al menos 1 usuario con acceso',
            },
          ]}
        >
          <InputNumber min={MIN_LICENCIAS} className="alta-input-number" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name="email"
          label="Email contacto"
          rules={[
            { required: true, message: 'Campo requerido!' },
            { type: 'email', message: 'Introduce un correo electrónico válido' },
          ]}
        >
          <Input placeholder="Ej. ejemplo@ejemplo.com" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name="dni"
          label="DNI"
          rules={[{ required: true, message: 'Campo requerido!' }]}
        >
          <Input placeholder="Ej. 12345678A" />
        </Form.Item>
      </Col>
      {collectFiscalAddress ? (
        <>
          <Col xs={24}>
            <p className="alta-fiscal-note">
              Necesitamos la dirección fiscal para calcular el IVA y emitir facturas.
            </p>
          </Col>
          <Col xs={24}>
            <Form.Item
              name="direccion"
              label="Dirección fiscal"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <Input placeholder="Calle, número, piso…" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="codigo_postal"
              label="Código postal"
              rules={[
                { required: true, message: 'Campo requerido' },
                {
                  pattern: /^\d{5}$/,
                  message: 'Introduce un CP español de 5 dígitos',
                },
              ]}
            >
              <Input
                placeholder="28001"
                maxLength={5}
                inputMode="numeric"
                onChange={handleCodigoPostalChange}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="ciudad"
              label="Ciudad"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <Input placeholder="Ej. Madrid" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="provincia"
              label="Provincia"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <Select
                showSearch
                placeholder="Selecciona provincia"
                optionFilterProp="label"
                options={PROVINCIAS.map((prov) => ({
                  value: prov.name,
                  label: prov.name,
                }))}
              />
            </Form.Item>
          </Col>
        </>
      ) : null}
      {!registroPublico ? (
        <Col xs={24} sm={12}>
          <Form.Item
            name="clienteLegacy"
            valuePropName="checked"
            initialValue={false}
          >
            <Checkbox disabled={esPagoInmediato}>
              Cliente histórico (sin periodo de prueba)
            </Checkbox>
          </Form.Item>
        </Col>
      ) : null}
      {showCampanaSelect && !registroPublico ? (
        <Col xs={24}>
          <Form.Item name="id_campana" label="Campaña comercial">
            <Select
              allowClear
              placeholder="Opcional"
              options={campanas.map((c) => ({
                value: Number(c.id_campana),
                label: esCampanaPagoInmediato(c)
                  ? `${c.nombre} (sin prueba · pago inmediato)`
                  : c.dias_prueba
                    ? `${c.nombre} (${c.dias_prueba} días prueba)`
                    : c.nombre,
              }))}
            />
          </Form.Item>
        </Col>
      ) : null}
      {requireTermsAcceptance ? (
        <Col xs={24}>
          <Form.Item
            name="acceptTerms"
            valuePropName="checked"
            className="alta-terms-item"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error('Debes aceptar los términos y condiciones para continuar'),
                      ),
              },
            ]}
          >
            <Checkbox>
              <span className="alta-terms-label">
                He leído y acepto los{' '}
                <Link
                  to={LANDING_ROUTES.terms}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  términos y condiciones
                </Link>{' '}
                y la{' '}
                <Link
                  to={LANDING_ROUTES.privacy}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  política de privacidad
                </Link>
                .
              </span>
            </Checkbox>
          </Form.Item>
        </Col>
      ) : null}
      <Col xs={24} className="alta-form-actions">
        <GradientButton
          type="submit"
          text={submitLabel}
          loading={loading}
          disabled={requireTermsAcceptance && !canSubmit}
          className="alta-btn-mr"
        />
        <Button onClick={onCancel}>Limpiar</Button>
      </Col>
    </Row>
  </Form>
  );
};

export { PlanCardPicker, PlanBillingToggle };
export default AltaEmpresaForm;
