import React from 'react';
import { Form, Input, Row, Col, Button, InputNumber, Select } from 'antd';
import GradientButton from '../../components/shared/GradientButton';
import { PLANS, getPlanMinLicencias, getPlanLabel } from '../../../constants/plans';
import './AltaEmpresa.css';

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
}) => {
  const planSeleccionado = Form.useWatch('plan', form) || planId;
  const minLicencias = minLicenciasProp ?? getPlanMinLicencias(planSeleccionado);

  return (
  <Form
    form={form}
    name="altaEmpresa"
    onFinish={onFinish}
    layout="vertical"
    className={className}
  >
    <Row gutter={[16, 16]}>
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
      {showPlanSelect ? (
        <Col xs={24} sm={12}>
          <Form.Item
            name="plan"
            label="Plan contratado"
            initialValue="esencial"
            rules={[{ required: true, message: 'Selecciona un plan' }]}
          >
            <Select
              options={PLANS.map((plan) => ({
                value: plan.id,
                label: plan.name,
                disabled: plan.available === false,
              }))}
              onChange={(nuevoPlan) => {
                const min = getPlanMinLicencias(nuevoPlan);
                const actuales = form.getFieldValue('numLicencias');
                if (actuales == null || Number(actuales) < min) {
                  form.setFieldsValue({ numLicencias: min });
                }
              }}
            />
          </Form.Item>
        </Col>
      ) : null}
      <Col xs={24} sm={12}>
        <Form.Item
          name="numLicencias"
          label="Número de licencias"
          extra={
            minLicencias > 1
              ? `Mínimo ${minLicencias} licencias (plan ${getPlanLabel(planSeleccionado)})`
              : undefined
          }
          rules={[
            { required: true, message: 'Campo requerido!' },
            {
              type: 'number',
              min: minLicencias,
              message: `El mínimo es ${minLicencias} licencias`,
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
          rules={[{ required: true, message: 'Campo requerido!' }]}
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
      <Col xs={24}>
        <GradientButton type="submit" text={submitLabel} loading={loading} className="alta-btn-mr" />
        <Button onClick={onCancel}>Limpiar</Button>
      </Col>
    </Row>
  </Form>
  );
};

export default AltaEmpresaForm;
