import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, UserDeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../../config/AuthContext';
import { esSupervisorComercialHub } from '../../../utils/hubAccess';
import { etiquetaTipoUsuario } from '../../../utils/tipoUsuarioLabel';
import {
  asignarAccesoHub,
  listarAccesosHub,
  listarPuestosHub,
  listarUsuariosInternosHub,
  revocarAccesoHub,
} from '../../../features/hub/hubService';
import './Hub.css';

const { Text } = Typography;

const COLOR_PUESTO = {
  comercial: 'blue',
  supervisor_comercial: 'purple',
  admin_hub: 'gold',
};

const HubAccesos = () => {
  const { user } = useAuth();
  const soloComerciales = esSupervisorComercialHub(user);
  const [accesos, setAccesos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [accesosData, usuariosData, puestosData] = await Promise.all([
        listarAccesosHub(),
        listarUsuariosInternosHub(),
        listarPuestosHub(),
      ]);
      setAccesos(accesosData.accesos || []);
      setUsuarios(usuariosData.usuarios || []);
      setPuestos(puestosData.puestos || []);
    } catch (error) {
      message.error(error.message || 'Error al cargar accesos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const usuariosOptions = useMemo(
    () => usuarios
      .filter((u) => Number(u.id_usuario) !== Number(user?.id_usuario))
      .map((u) => ({
        value: u.id_usuario,
        label: `${u.nombre} (${u.email}) — ${etiquetaTipoUsuario(u.tipo_usuario)}`,
      })),
    [usuarios, user?.id_usuario],
  );

  const puestosOptions = useMemo(
    () => puestos.map((p) => ({
      value: p.id_puesto,
      label: p.nombre,
    })),
    [puestos],
  );

  const abrirModal = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const asignarAcceso = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await asignarAccesoHub(values);
      message.success('Acceso asignado. El usuario debe volver a iniciar sesión.');
      setModalOpen(false);
      cargarDatos();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.message || 'No se pudo asignar el acceso');
    } finally {
      setSubmitting(false);
    }
  };

  const revocarAcceso = (record) => {
    Modal.confirm({
      title: '¿Revocar acceso al panel de ventas?',
      content: (
        <>
          Se quitará el puesto <strong>{record.puesto_nombre}</strong> a{' '}
          <strong>{record.nombre}</strong>. Deberá volver a iniciar sesión para que surta efecto.
        </>
      ),
      okText: 'Revocar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        await revocarAccesoHub(record.id);
        message.success('Acceso revocado');
        cargarDatos();
      },
    });
  };

  const columns = [
    {
      title: 'Usuario',
      key: 'usuario',
      render: (_, row) => (
        <div>
          <Text strong>{row.nombre}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{row.email}</Text>
        </div>
      ),
    },
    {
      title: 'Puesto',
      dataIndex: 'puesto_nombre',
      key: 'puesto',
      width: 180,
      render: (nombre, row) => (
        <Tag color={COLOR_PUESTO[row.puesto_codigo] || 'default'}>{nombre}</Tag>
      ),
    },
    {
      title: 'Desde',
      dataIndex: 'fecha_alta',
      key: 'fecha_alta',
      width: 130,
      render: (fecha) => dayjs(fecha).format('DD/MM/YYYY'),
    },
    {
      title: '',
      key: 'acciones',
      width: 120,
      render: (_, row) => (
        soloComerciales && row.puesto_codigo !== 'comercial' ? null : (
          <Button
            type="text"
            danger
            icon={<UserDeleteOutlined />}
            onClick={() => revocarAcceso(row)}
          >
            Revocar
          </Button>
        )
      ),
    },
  ];

  return (
    <div className="hub-section">
      <div className="hub-section__toolbar hub-section__toolbar--end">
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirModal}>
          Dar acceso
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={accesos}
        pagination={false}
        locale={{ emptyText: 'Ningún usuario con acceso al panel de ventas' }}
      />

      <Modal
        title="Dar acceso al panel de ventas"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={asignarAcceso}
        okText="Asignar"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="id_usuario"
            label="Usuario interno"
            rules={[{ required: true, message: 'Selecciona un usuario' }]}
          >
            <Select
              showSearch
              placeholder="Buscar por nombre o email"
              options={usuariosOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="id_puesto"
            label="Puesto"
            rules={[{ required: true, message: 'Selecciona un puesto' }]}
          >
            <Select placeholder="Tipo de acceso" options={puestosOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HubAccesos;
