import React, { useEffect, useState } from 'react';
import { Form, Input, Row, Col, Button, InputNumber, Select, Tooltip, Checkbox } from 'antd';
import { Link } from 'react-router-dom';
import GradientButton from '../../components/shared/GradientButton';
import { LANDING_ROUTES } from '../../../constants/routes';
import {
  PLANS,
  getPlanMinLicencias,
  getPlanLabel,
  getPlanMinAnnual,
  PRICE_UNIT_MONTHLY,
  PRICE_UNIT_ANNUAL,
  ANNUAL_FREE_MONTHS_BADGE,
  LICENSE_IS_USER_NOTE,
} from '../../../constants/plans';
import './AltaEmpresa.css';

const PLAN_UNAVAILABLE_TOOLTIP =
  'No disponible por el momento, disculpen las molestias';

const PlanBillingToggle = ({ value, onChange }) => (
  <div className="alta-plan-billing" role="group" aria-label="Periodo de facturación">
    <button
      type="button"
      className={`alta-plan-billing-option${value === 'mensual' ? ' alta-plan-billing-option--active' : ''}`}
      aria-pressed={value === 'mensual'}
      onClick={() => onChange('mensual')}
    >
      Mensual
    </button>
    <button
      type="button"
      className={`alta-plan-billing-option${value === 'anual' ? ' alta-plan-billing-option--active' : ''}`}
      aria-pressed={value === 'anual'}
      onClick={() => onChange('anual')}
    >
      Anual
      <span className="alta-plan-billing-badge">({ANNUAL_FREE_MONTHS_BADGE})</span>
    </button>
  </div>
);

const PlanCardPicker = ({ value, onChange, onPlanChange, billingPeriod = 'mensual' }) => (
  <div className="alta-plan-picker" role="radiogroup" aria-label="Elige tu plan">
    {PLANS.map((plan) => {
      const selected = value === plan.id;
      const esAnual = billingPeriod === 'anual';
      const selectPlan = () => {
        if (!plan.available) return;
        onChange?.(plan.id);
        onPlanChange?.(plan.id);
      };
      const card = (
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={!plan.available}
          className={[
            'alta-plan-option',
            `alta-plan-option--${plan.variant}`,
            selected ? 'alta-plan-option--selected' : '',
            plan.featured ? 'alta-plan-option--featured' : '',
            !plan.available ? 'alta-plan-option--disabled' : '',
          ].filter(Boolean).join(' ')}
          onClick={selectPlan}
        >
          <span className="alta-plan-option-name">{plan.name}</span>
          <span className="alta-plan-option-price">
            desde <strong>{esAnual ? plan.priceAnnual : plan.priceMonthly} €</strong>
            <span className="alta-plan-option-unit">
              {esAnual ? PRICE_UNIT_ANNUAL : PRICE_UNIT_MONTHLY}
            </span>
            {esAnual && (
              <span className="alta-plan-option-annual-badge">{ANNUAL_FREE_MONTHS_BADGE}</span>
            )}
          </span>
          <span className="alta-plan-option-min">
            Mín. {plan.minLicenses} usuarios
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
  requireTermsAcceptance = false,
}) => {
  const planSeleccionado = Form.useWatch('plan', form) || planId;
  const cicloFacturacion = Form.useWatch('cicloFacturacion', form) || 'mensual';
  const minLicencias = minLicenciasProp ?? getPlanMinLicencias(planSeleccionado);
  const isCompact = planSelectVariant === 'cards';
  const rowGutter = isCompact ? [12, 0] : [16, 16];
  const usuariosExtra = isCompact
    ? `Mínimo ${minLicencias} usuarios (plan ${getPlanLabel(planSeleccionado)})`
    : `Mínimo ${minLicencias} usuarios (plan ${getPlanLabel(planSeleccionado)}). ${LICENSE_IS_USER_NOTE}`;

  const handlePlanChange = (nuevoPlan) => {
    const min = getPlanMinLicencias(nuevoPlan);
    const actuales = form.getFieldValue('numLicencias');
    if (actuales == null || Number(actuales) < min) {
      form.setFieldsValue({ numLicencias: min });
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

  return (
  <Form
    form={form}
    name="altaEmpresa"
    onFinish={onFinish}
    layout="vertical"
    className={className}
    initialValues={{
      plan: planId,
      cicloFacturacion: 'mensual',
      numLicencias: getPlanMinLicencias(planId),
      ...(requireTermsAcceptance ? { acceptTerms: false } : {}),
    }}
  >
    {showPlanSelect && planSelectVariant === 'cards' ? (
      <>
        <Form.Item name="cicloFacturacion" hidden>
          <Input type="hidden" />
        </Form.Item>
        <div className="alta-plan-billing-row">
          <PlanBillingToggle
            value={cicloFacturacion}
            onChange={(ciclo) => form.setFieldsValue({ cicloFacturacion: ciclo })}
          />
        </div>
        <Form.Item
          name="plan"
          label="Elige tu plan"
          rules={[{ required: true, message: 'Selecciona un plan' }]}
          className="alta-plan-form-item"
          extra={LICENSE_IS_USER_NOTE}
        >
          <PlanCardPicker
            onPlanChange={handlePlanChange}
            billingPeriod={cicloFacturacion}
          />
        </Form.Item>
      </>
    ) : null}

    <Row gutter={rowGutter}>
      <Col xs={24} sm={12}>
        <Form.Item
          name="nombre_empresa"
          label="Nombre de la empresa"
          rules={[{ required: true, message: 'Campo requerido!' }]}
        >
          <Input placeholder="Ej. Empresa.SA" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name="alias"
          label="Alias de la empresa"
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
      {showPlanSelect && planSelectVariant === 'select' ? (
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
          label="Número de usuarios"
          extra={usuariosExtra}
          rules={[
            { required: true, message: 'Campo requerido!' },
            {
              type: 'number',
              min: minLicencias,
              message: `El mínimo es ${minLicencias} usuarios`,
            },
          ]}
        >
          <InputNumber min={minLicencias} className="alta-input-number" />
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

export default AltaEmpresaForm;
