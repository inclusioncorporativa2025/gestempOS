import React from 'react';
import { Form, Input, Row, Col, Button, InputNumber } from 'antd';
import './AltaEmpresa.css';

const AltaEmpresaForm = ({ form, loading, onFinish, onCancel }) => (
  <Form form={form} name="altaEmpresa" onFinish={onFinish} layout="vertical">
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
      <Col xs={24} sm={12}>
        <Form.Item
          name="numLicencias"
          label="Numero de licencias"
          rules={[{ required: true, message: 'Campo requerido!' }]}
        >
          <InputNumber min={1} className="alta-input-number" />
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
        <Button type="primary" htmlType="submit" loading={loading} className="alta-btn-mr">
          Continuar
        </Button>
        <Button onClick={onCancel}>Limpiar</Button>
      </Col>
    </Row>
  </Form>
);

export default AltaEmpresaForm;
