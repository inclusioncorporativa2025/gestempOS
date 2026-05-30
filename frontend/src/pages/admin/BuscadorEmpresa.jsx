import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Col,
  Row,
  Button,
  Input,
  Table,
  Form,
  Layout,
  Typography,
  message,
  Popconfirm,
  Modal,
  Checkbox,
  Tag,
} from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import {
  crearEmpresa,
  editEmpresa,
  eliminarEmpresa,
  getEmpresasUsuarios,
  reactivarEmpresa,
} from '../../features/empresas/empresasService';
import AltaEmpresaForm from './AltaEmpresaForm';
import './BuscadorEmpresa.css';

const { Title, Text } = Typography;

const FILTRO_TODAS = 'todas';
const FILTRO_ACTIVAS = 'activas';
const FILTRO_DESACTIVADAS = 'desactivadas';

const empresaEstaActiva = (record) =>
  !record.fecha_baja && record.activo !== 0 && record.activo !== false;

const coincideBusqueda = (empresa, texto) => {
  const q = texto.trim().toLowerCase();
  if (!q) return true;
  return (
    (empresa.nombre || '').toLowerCase().includes(q) ||
    (empresa.email || '').toLowerCase().includes(q) ||
    (empresa.identificador_fiscal || '').toLowerCase().includes(q)
  );
};

const BuscadorEmpresa = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [altaForm] = Form.useForm();
  const [data, setData] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(FILTRO_TODAS);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAltaModalVisible, setIsAltaModalVisible] = useState(false);
  const [altaLoading, setAltaLoading] = useState(false);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      const response = await getEmpresasUsuarios();
      const lista = Array.isArray(response) ? response : [];
      setData(lista);
    } catch {
      message.error('Error al cargar las empresas');
    } finally {
      setLoading(false);
    }
  };

  const contadores = useMemo(() => {
    const activas = data.filter(empresaEstaActiva).length;
    const desactivadas = data.length - activas;
    return { total: data.length, activas, desactivadas };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((empresa) => {
      if (filtroEstado === FILTRO_ACTIVAS && !empresaEstaActiva(empresa)) return false;
      if (filtroEstado === FILTRO_DESACTIVADAS && empresaEstaActiva(empresa)) return false;
      return coincideBusqueda(empresa, busqueda);
    });
  }, [data, filtroEstado, busqueda]);

  const formatDate = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-ES').format(new Date(date));
  };

  const tarjetasResumen = [
    { key: FILTRO_TODAS, label: 'Total', count: contadores.total, className: 'be-stat-card--total' },
    { key: FILTRO_ACTIVAS, label: 'Activas', count: contadores.activas, className: 'be-stat-card--activas' },
    {
      key: FILTRO_DESACTIVADAS,
      label: 'Desactivadas',
      count: contadores.desactivadas,
      className: 'be-stat-card--desactivadas',
    },
  ];

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      activo: empresaEstaActiva(record),
    });
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const updatedValues = await form.validateFields();
      await editEmpresa(editingRecord.id_empresa, updatedValues);
      await fetchEmpresas();
      setEditingRecord(null);
      setIsModalVisible(false);
      message.success('Empresa actualizada correctamente');
    } catch (error) {
      message.error(`Error al guardar los cambios: ${error.message}`);
    }
  };

  const handleDelete = async (id_empresa) => {
    try {
      await eliminarEmpresa(id_empresa);
      await fetchEmpresas();
      message.success('Empresa dada de baja correctamente');
    } catch (error) {
      message.error(error.message || 'Error al dar de baja la empresa');
    }
  };

  const handleReactivar = async (id_empresa) => {
    try {
      await reactivarEmpresa(id_empresa);
      await fetchEmpresas();
      message.success('Empresa reactivada correctamente');
    } catch (error) {
      message.error(error.message || 'Error al reactivar la empresa');
    }
  };

  const handleCancelModal = () => {
    setEditingRecord(null);
    setIsModalVisible(false);
  };

  const handleOpenAltaModal = () => {
    altaForm.resetFields();
    setIsAltaModalVisible(true);
  };

  const handleCancelAltaModal = () => {
    altaForm.resetFields();
    setIsAltaModalVisible(false);
  };

  const handleAltaSubmit = async (values) => {
    setAltaLoading(true);
    try {
      const data = await crearEmpresa(values);
      if (data?.emailBienvenidaEnviado === false) {
        message.warning(data.message || 'Empresa creada, pero no se pudo enviar el correo de bienvenida.');
      } else {
        message.success(data?.message || 'Empresa creada correctamente. Se ha enviado el correo de bienvenida.');
      }
      altaForm.resetFields();
      setIsAltaModalVisible(false);
      await fetchEmpresas();
    } catch (error) {
      message.error(error.message || 'Error al crear empresa');
    } finally {
      setAltaLoading(false);
    }
  };

  return (
    <Layout className="be-layout">
      <Title level={2} className="be-page-title">
        Administrar Empresas
      </Title>

      <Row gutter={[16, 16]} className="be-stats-row">
        {tarjetasResumen.map(({ key, label, count, className }) => (
          <Col xs={24} sm={8} key={key}>
            <button
              type="button"
              className={`be-stat-card ${className} ${filtroEstado === key ? 'be-stat-card--selected' : ''}`}
              onClick={() => setFiltroEstado(key)}
              aria-pressed={filtroEstado === key}
            >
              <Text className="be-stat-label">{label}</Text>
              <span className="be-stat-count">{count}</span>
            </button>
          </Col>
        ))}
      </Row>

      <Card className="be-search-card">
        <div className="be-search-toolbar">
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            placeholder="Buscar por nombre, email del responsable o identificador fiscal"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="be-search-input"
          />
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            className="be-alta-btn"
            title="Alta de empresa"
            onClick={handleOpenAltaModal}
          >
            Alta de empresa
          </Button>
        </div>
      </Card>

      <Card className="be-card-table">
        <Table
          dataSource={filteredData}
          loading={loading}
          rowKey="id_empresa"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 700 }}
          rowClassName={(record) => (empresaEstaActiva(record) ? '' : 'be-row-inactiva')}
          locale={{ emptyText: 'No hay empresas que coincidan con el filtro' }}
          columns={[
            { title: 'Nombre Empresa', dataIndex: 'nombre', key: 'nombre' },
            { title: 'Identificador Fiscal', dataIndex: 'identificador_fiscal', key: 'identificador_fiscal' },
            { title: 'Email Responsable', dataIndex: 'email', key: 'email', render: (email) => email || '—' },
            { title: 'Licencias', dataIndex: 'licencias', key: 'licencias' },
            {
              title: 'Fecha Alta',
              dataIndex: 'fecha_alta',
              key: 'fecha_alta',
              render: (fecha_alta) => formatDate(fecha_alta),
            },
            {
              title: 'Estado',
              key: 'estado',
              render: (_, record) =>
                empresaEstaActiva(record) ? (
                  <Tag color="green">Activa</Tag>
                ) : (
                  <Tag color="default">De baja</Tag>
                ),
            },
            {
              title: 'Acciones',
              key: 'acciones',
              render: (_, record) => {
                const activa = empresaEstaActiva(record);
                return (
                  <Row gutter={8} wrap>
                    {activa && (
                      <Col>
                        <Button type="link" onClick={() => handleEdit(record)}>
                          Editar
                        </Button>
                      </Col>
                    )}
                    {activa ? (
                      <Col>
                        <Popconfirm
                          title="¿Estás seguro de dar de baja esta empresa?"
                          onConfirm={() => handleDelete(record.id_empresa)}
                          okText="Sí"
                          cancelText="No"
                        >
                          <Button type="link" danger>
                            Dar de baja
                          </Button>
                        </Popconfirm>
                      </Col>
                    ) : (
                      <Col>
                        <Popconfirm
                          title="¿Reactivar esta empresa?"
                          description="Se restaurará el acceso y los vínculos con el administrador."
                          onConfirm={() => handleReactivar(record.id_empresa)}
                          okText="Reactivar"
                          cancelText="Cancelar"
                        >
                          <Button type="link" className="be-reactivar-btn">
                            Reactivar
                          </Button>
                        </Popconfirm>
                      </Col>
                    )}
                  </Row>
                );
              },
            },
          ]}
        />
      </Card>

      <Modal
        title="Alta nueva empresa"
        open={isAltaModalVisible}
        onCancel={handleCancelAltaModal}
        footer={null}
        centered
        width={720}
        destroyOnClose
        className="be-alta-modal"
        styles={{
          body: {
            padding: '16px 20px',
            maxHeight: '80vh',
            overflowY: 'auto',
          },
        }}
      >
        <AltaEmpresaForm
          form={altaForm}
          loading={altaLoading}
          onFinish={handleAltaSubmit}
          onCancel={() => altaForm.resetFields()}
        />
      </Modal>

      <Modal
        title="Editar Empresa"
        open={isModalVisible}
        onCancel={handleCancelModal}
        footer={null}
        centered
        className="be-edit-modal"
        styles={{
          body: {
            padding: '16px',
            maxHeight: '80vh',
            overflowY: 'auto',
          },
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: 'Campo requerido' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="identificador_fiscal"
                label="Identificador Fiscal"
                rules={[{ required: true, message: 'Campo requerido' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={12}>
              <Form.Item
                name="licencias"
                label="Licencias"
                rules={[{ required: true, message: 'Campo requerido' }]}
              >
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item
                name="alias"
                label="Alias"
                rules={[{ required: true, message: 'Campo requerido' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="activo" valuePropName="checked" label="Activo">
                <Checkbox>Activo</Checkbox>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Button type="primary" htmlType="submit" className="be-full-width">
                Guardar
              </Button>
            </Col>
            <Col span={12}>
              <Button onClick={handleCancelModal} className="be-full-width">
                Cancelar
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Layout>
  );
};

export default BuscadorEmpresa;
