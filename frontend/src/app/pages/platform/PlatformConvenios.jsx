import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Form, Input, InputNumber, Modal, Select, Switch, Table, Tag, Typography, message,
} from 'antd';
import {
  actualizarCatalogoConvenio,
  bajaCatalogoConvenio,
  crearCatalogoConvenio,
  listarCatalogoConvenios,
} from '../../../features/convenios/convenioService';
import './Platform.css';

const { Text } = Typography;

const MODO_OPCIONES = [
  { value: 'natural', label: 'Días naturales' },
  { value: 'laboral', label: 'Días laborables' },
];

const etiquetaModo = (modo) => (modo === 'laboral' ? 'Laborables' : 'Naturales');

const formInicial = () => ({
  codigo: '',
  nombre: '',
  modo_conteo_vacaciones: 'natural',
  dias_cupo_defecto: 30,
  excluir_festivos: false,
  permite_medio_dia: true,
  dias_semana_laborables: 5,
  tipo_jornada: 'completa',
  descripcion: '',
  orden: 0,
  activo: true,
});

const PlatformConvenios = () => {
  const [convenios, setConvenios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarCatalogoConvenios();
      setConvenios(data.convenios || []);
    } catch (error) {
      message.error(error.message || 'No se pudo cargar el catálogo de convenios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setEditando(null);
    form.setFieldsValue(formInicial());
    setModalOpen(true);
  };

  const abrirEditar = (record) => {
    setEditando(record);
    form.setFieldsValue({
      ...formInicial(),
      ...record,
      dias_cupo_defecto: Number(record.dias_cupo_defecto),
    });
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      if (editando) {
        await actualizarCatalogoConvenio({
          id_convenio: editando.id_convenio,
          ...values,
        });
        message.success('Convenio actualizado');
      } else {
        await crearCatalogoConvenio(values);
        message.success('Convenio creado');
      }
      setModalOpen(false);
      await cargar();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.message || 'No se pudo guardar el convenio');
    } finally {
      setGuardando(false);
    }
  };

  const handleBaja = async (record) => {
    try {
      await bajaCatalogoConvenio(record.id_convenio);
      message.success('Convenio dado de baja');
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo dar de baja el convenio');
    }
  };

  const columns = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    {
      title: 'Conteo vacaciones',
      dataIndex: 'modo_conteo_vacaciones',
      key: 'modo_conteo_vacaciones',
      render: etiquetaModo,
    },
    {
      title: 'Cupo defecto',
      dataIndex: 'dias_cupo_defecto',
      key: 'dias_cupo_defecto',
      width: 110,
      render: (v) => `${Number(v)} días`,
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      render: (activo) => (
        <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 160,
      render: (_, record) => (
        <>
          <Button type="link" size="small" onClick={() => abrirEditar(record)}>
            Editar
          </Button>
          {record.activo && (
            <Button type="link" size="small" danger onClick={() => handleBaja(record)}>
              Baja
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="platform-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text type="secondary">
          Plantillas de convenio disponibles para que las empresas las incorporen.
        </Text>
        <Button type="primary" onClick={abrirNuevo}>
          Nuevo convenio
        </Button>
      </div>

      <Table
        rowKey="id_convenio"
        loading={loading}
        dataSource={convenios}
        columns={columns}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
      />

      <Modal
        title={editando ? 'Editar convenio' : 'Nuevo convenio'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleGuardar}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Código" name="codigo" rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item label="Nombre" name="nombre" rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item label="Conteo de vacaciones" name="modo_conteo_vacaciones">
            <Select options={MODO_OPCIONES} />
          </Form.Item>
          <Form.Item label="Días de cupo por defecto" name="dias_cupo_defecto">
            <InputNumber min={0} max={365} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Días laborables por semana" name="dias_semana_laborables">
            <InputNumber min={1} max={7} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Excluir festivos (modo laboral)" name="excluir_festivos" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Permite medio día" name="permite_medio_dia" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Tipo jornada" name="tipo_jornada">
            <Select
              options={[
                { value: 'completa', label: 'Completa' },
                { value: 'parcial', label: 'Parcial' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Orden" name="orden">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <Form.Item label="Activo" name="activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlatformConvenios;
