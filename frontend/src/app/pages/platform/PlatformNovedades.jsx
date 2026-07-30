import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, DatePicker, Form, Input, InputNumber, Modal, Select, Switch, Table, Tag, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import {
  actualizarNovedadAdmin,
  bajaNovedadAdmin,
  crearNovedadAdmin,
  listarNovedadesAdmin,
} from '../../../features/novedades/novedadesService';
import { PLAN_FEATURES, PLAN_IDS } from '../../../constants/plans';
import './Platform.css';

const { Text } = Typography;
const { TextArea } = Input;

const ROLES_OPCIONES = [
  { value: '1', label: 'ROOT (1)' },
  { value: '2', label: 'Admin plataforma (2)' },
  { value: '3', label: 'Admin empresa (3)' },
  { value: '4', label: 'Supervisor (4)' },
  { value: '5', label: 'Empleado (5)' },
  { value: '6', label: 'Inspector (6)' },
];

const PLANES_OPCIONES = PLAN_IDS.map((id) => ({
  value: id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
}));

const FEATURES_OPCIONES = Object.keys(PLAN_FEATURES).map((key) => ({
  value: key,
  label: key.replace(/_/g, ' '),
}));

const formInicial = () => ({
  titulo: '',
  resumen: '',
  contenido: '',
  roles: [],
  planes: [],
  requiere_feature: undefined,
  orden: 0,
  activo: true,
  fecha_publicacion: dayjs(),
});

const csvFromArray = (arr) => (arr?.length ? arr.join(',') : null);

const arrayFromCsv = (csv) => {
  if (!csv) return [];
  return String(csv).split(',').map((s) => s.trim()).filter(Boolean);
};

const PlatformNovedades = () => {
  const [novedades, setNovedades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarNovedadesAdmin();
      setNovedades(data.novedades || []);
    } catch (error) {
      message.error(error.message || 'No se pudo cargar el catálogo de novedades');
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
      titulo: record.titulo,
      resumen: record.resumen,
      contenido: record.contenido,
      roles: arrayFromCsv(record.roles_permitidos),
      planes: arrayFromCsv(record.planes_permitidos),
      requiere_feature: record.requiere_feature || undefined,
      orden: record.orden,
      activo: record.activo,
      fecha_publicacion: record.fecha_publicacion ? dayjs(record.fecha_publicacion) : dayjs(),
    });
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      const payload = {
        titulo: values.titulo,
        resumen: values.resumen,
        contenido: values.contenido,
        roles_permitidos: csvFromArray(values.roles),
        planes_permitidos: csvFromArray(values.planes),
        requiere_feature: values.requiere_feature || null,
        orden: values.orden,
        activo: values.activo,
        fecha_publicacion: values.fecha_publicacion?.toISOString?.() || new Date().toISOString(),
      };

      if (editando) {
        await actualizarNovedadAdmin({ id_novedad: editando.id_novedad, ...payload });
        message.success('Novedad actualizada');
      } else {
        await crearNovedadAdmin(payload);
        message.success('Novedad publicada');
      }
      setModalOpen(false);
      await cargar();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.message || 'No se pudo guardar la novedad');
    } finally {
      setGuardando(false);
    }
  };

  const handleBaja = async (record) => {
    try {
      await bajaNovedadAdmin(record.id_novedad);
      message.success('Novedad dada de baja');
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo dar de baja la novedad');
    }
  };

  const columns = [
    { title: 'Título', dataIndex: 'titulo', key: 'titulo', ellipsis: true },
    {
      title: 'Audiencia',
      key: 'audiencia',
      width: 180,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.roles_permitidos || 'Todos los roles'}
          {' · '}
          {record.planes_permitidos || 'Todos los planes'}
        </Text>
      ),
    },
    {
      title: 'Publicación',
      dataIndex: 'fecha_publicacion',
      key: 'fecha_publicacion',
      width: 110,
      render: (v) => (v ? new Date(v).toLocaleDateString('es-ES') : '—'),
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
          Publica novedades segmentadas por rol, plan y funcionalidad contratada.
        </Text>
        <Button type="primary" onClick={abrirNuevo}>
          Nueva novedad
        </Button>
      </div>

      <Table
        rowKey="id_novedad"
        loading={loading}
        dataSource={novedades}
        columns={columns}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 720 }}
      />

      <Modal
        title={editando ? 'Editar novedad' : 'Nueva novedad'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleGuardar}
        confirmLoading={guardando}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="titulo" label="Título" rules={[{ required: true, max: 120 }]}>
            <Input maxLength={120} showCount />
          </Form.Item>
          <Form.Item name="resumen" label="Resumen" rules={[{ required: true, max: 300 }]}>
            <Input maxLength={300} showCount />
          </Form.Item>
          <Form.Item name="contenido" label="Contenido" rules={[{ required: true }]}>
            <TextArea rows={6} placeholder="Texto completo de la novedad" />
          </Form.Item>
          <Form.Item name="roles" label="Roles permitidos" extra="Vacío = todos">
            <Select mode="multiple" options={ROLES_OPCIONES} allowClear placeholder="Todos los roles" />
          </Form.Item>
          <Form.Item name="planes" label="Planes permitidos" extra="Vacío = todos">
            <Select mode="multiple" options={PLANES_OPCIONES} allowClear placeholder="Todos los planes" />
          </Form.Item>
          <Form.Item name="requiere_feature" label="Requiere feature del plan">
            <Select options={FEATURES_OPCIONES} allowClear placeholder="Ninguna" />
          </Form.Item>
          <Form.Item name="fecha_publicacion" label="Fecha de publicación" rules={[{ required: true }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="orden" label="Orden (mayor = más prioritario)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="activo" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlatformNovedades;
