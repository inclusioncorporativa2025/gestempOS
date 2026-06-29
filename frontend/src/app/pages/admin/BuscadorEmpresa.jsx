import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Tooltip,
  Select,
  InputNumber,
} from 'antd';
import GradientButton from '../../components/shared/GradientButton';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  RedoOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  crearEmpresa,
  editEmpresa,
  eliminarEmpresa,
  getEmpresasUsuarios,
  purgarEmpresaPermanente,
  reactivarEmpresa,
} from '../../../features/empresas/empresasService';
import { getTipoUsuario } from '../../../utils/authSession';
import AltaEmpresaForm from './AltaEmpresaForm';
import {
  PLANS,
  getPlanLabel,
  getPlanMinLicencias,
  getPlanTagColor,
  normalizePlanId,
} from '../../../constants/plans';
import './BuscadorEmpresa.css';

const { Title, Text } = Typography;

const FILTRO_TODAS = 'todas';
const FILTRO_ACTIVAS = 'activas';
const FILTRO_DESACTIVADAS = 'desactivadas';

const empresaDadaDeBaja = (record) =>
  Boolean(record.fecha_baja) || record.activo === 0 || record.activo === false;

const empresaFacturacionBloquea = (record) => {
  const estado = String(record.estado_suscripcion || '').toLowerCase();
  const modo = String(record.modo_facturacion || '').toLowerCase();

  if (estado === 'canceled') return true;
  if (modo === 'trial' && !record.stripe_subscription_id) return true;

  if (estado === 'trialing' && record.trial_ends_at) {
    if (new Date(record.trial_ends_at) <= new Date()) return true;
  }

  if (
    modo === 'stripe' &&
    estado &&
    !['active', 'trialing', 'past_due'].includes(estado)
  ) {
    return true;
  }

  return false;
};

const empresaEstaActiva = (record) =>
  !empresaDadaDeBaja(record) && !empresaFacturacionBloquea(record);

const renderEstadoEmpresa = (record) => {
  if (empresaDadaDeBaja(record)) {
    return <Tag color="default">De baja</Tag>;
  }

  const estado = String(record.estado_suscripcion || '').toLowerCase();
  const modo = String(record.modo_facturacion || '').toLowerCase();

  if (estado === 'canceled') {
    return <Tag color="red">Suscripción cancelada</Tag>;
  }
  if (modo === 'trial' && !record.stripe_subscription_id) {
    return <Tag color="orange">Pendiente de pago</Tag>;
  }
  if (estado === 'trialing') {
    return <Tag color="blue">En prueba</Tag>;
  }
  if (estado === 'past_due') {
    return <Tag color="orange">Pago pendiente</Tag>;
  }
  if (record.cancel_at_period_end) {
    return <Tag color="gold">Cancelación programada</Tag>;
  }

  return <Tag color="green">Activa</Tag>;
};

const sumarLicencias = (empresas) =>
  empresas.reduce((acc, empresa) => acc + (Number(empresa.licencias) || 0), 0);

const coincideBusqueda = (empresa, texto) => {
  const q = texto.trim().toLowerCase();
  if (!q) return true;
  return (
    (empresa.nombre || '').toLowerCase().includes(q) ||
    (empresa.email || '').toLowerCase().includes(q) ||
    (empresa.identificador_fiscal || '').toLowerCase().includes(q)
  );
};

const BuscadorEmpresa = ({ embedded = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [purgeCif, setPurgeCif] = useState('');
  const [purgeLoading, setPurgeLoading] = useState(false);
  const esRoot = Number(getTipoUsuario()) === 1;

  useEffect(() => {
    fetchEmpresas();
  }, []);

  useEffect(() => {
    if (location.state?.abrirAltaEmpresa) {
      setIsAltaModalVisible(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

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
    const empresasActivas = data.filter(empresaEstaActiva);
    const empresasDesactivadas = data.filter((e) => !empresaEstaActiva(e));
    return {
      total: data.length,
      activas: empresasActivas.length,
      desactivadas: empresasDesactivadas.length,
      licenciasTotal: sumarLicencias(data),
      licenciasActivas: sumarLicencias(empresasActivas),
      licenciasDesactivadas: sumarLicencias(empresasDesactivadas),
    };
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
    {
      key: FILTRO_TODAS,
      label: 'Total',
      count: contadores.total,
      licenciasLabel: 'Total licencias',
      licencias: contadores.licenciasTotal,
      className: 'be-stat-card--total',
    },
    {
      key: FILTRO_ACTIVAS,
      label: 'Activas',
      count: contadores.activas,
      licenciasLabel: 'Total activas',
      licencias: contadores.licenciasActivas,
      className: 'be-stat-card--activas',
    },
    {
      key: FILTRO_DESACTIVADAS,
      label: 'Desactivadas',
      count: contadores.desactivadas,
      licenciasLabel: 'Total desactivadas',
      licencias: contadores.licenciasDesactivadas,
      className: 'be-stat-card--desactivadas',
    },
  ];

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      plan: normalizePlanId(record.plan),
      activo: empresaEstaActiva(record),
    });
    setIsModalVisible(true);
  };

  const planSeleccionado = Form.useWatch('plan', form);
  const minLicenciasEdicion = getPlanMinLicencias(planSeleccionado || 'esencial');

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

  const abrirPurga = (record) => {
    setPurgeTarget(record);
    setPurgeCif('');
  };

  const cerrarPurga = () => {
    if (purgeLoading) return;
    setPurgeTarget(null);
    setPurgeCif('');
  };

  const confirmarPurga = async () => {
    if (!purgeTarget) return;
    setPurgeLoading(true);
    try {
      const resultado = await purgarEmpresaPermanente(
        purgeTarget.id_empresa,
        purgeCif.trim(),
      );
      message.success(resultado.message || 'Empresa eliminada permanentemente');
      cerrarPurga();
      await fetchEmpresas();
    } catch (error) {
      message.error(error.message || 'Error al purgar la empresa');
    } finally {
      setPurgeLoading(false);
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
    <Layout className={embedded ? 'be-layout be-layout--embedded' : 'be-layout'}>
      {!embedded && (
        <Title level={2} className="be-page-title">
          Administrar Empresas
        </Title>
      )}

      <Row gutter={[16, 16]} className="be-stats-row">
        {tarjetasResumen.map(({ key, label, count, licenciasLabel, licencias, className }) => (
          <Col xs={24} sm={8} key={key}>
            <button
              type="button"
              className={`be-stat-card ${className} ${filtroEstado === key ? 'be-stat-card--selected' : ''}`}
              onClick={() => setFiltroEstado(key)}
              aria-pressed={filtroEstado === key}
            >
              <Text className="be-stat-label">{label}</Text>
              <span className="be-stat-count">{count}</span>
              <span className="be-stat-licencias-block">
                <span className="be-stat-licencias-label">{licenciasLabel}</span>
                <span className="be-stat-licencias">{licencias}</span>
              </span>
            </button>
          </Col>
        ))}
      </Row>

      <Card className="be-search-card">
        <div className="be-search-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar por nombre, email del responsable o identificador fiscal"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="be-search-input"
          />
          <GradientButton
            text="Alta de empresa"
            iconStart={<PlusOutlined />}
            className="be-alta-btn"
            size="small"
            title="Alta de empresa"
            onClick={handleOpenAltaModal}
          />
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
            {
              title: 'Plan',
              dataIndex: 'plan',
              key: 'plan',
              render: (plan) => (
                <Tag color={getPlanTagColor(plan)}>{getPlanLabel(plan)}</Tag>
              ),
            },
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
              render: (_, record) => renderEstadoEmpresa(record),
            },
            {
              title: 'Acciones',
              key: 'acciones',
              render: (_, record) => {
                const activa = empresaEstaActiva(record);
                const dadaDeBaja = empresaDadaDeBaja(record);
                return (
                  <div className="be-acciones">
                    {!dadaDeBaja && (
                      <Tooltip title="Editar">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          className="be-accion-btn be-accion-btn--edit"
                          onClick={() => handleEdit(record)}
                          aria-label="Editar"
                        />
                      </Tooltip>
                    )}
                    {dadaDeBaja ? (
                      <Popconfirm
                        title="¿Reactivar esta empresa?"
                        description="Se restaurará el acceso y los vínculos con el administrador."
                        onConfirm={() => handleReactivar(record.id_empresa)}
                        okText="Reactivar"
                        cancelText="Cancelar"
                      >
                        <Tooltip title="Reactivar">
                          <Button
                            type="text"
                            icon={<RedoOutlined />}
                            className="be-accion-btn be-accion-btn--reactivar"
                            aria-label="Reactivar"
                          />
                        </Tooltip>
                      </Popconfirm>
                    ) : activa ? (
                      <Popconfirm
                        title="¿Estás seguro de dar de baja esta empresa?"
                        onConfirm={() => handleDelete(record.id_empresa)}
                        okText="Sí"
                        cancelText="No"
                      >
                        <Tooltip title="Dar de baja">
                          <Button
                            type="text"
                            danger
                            icon={<StopOutlined />}
                            className="be-accion-btn"
                            aria-label="Dar de baja"
                          />
                        </Tooltip>
                      </Popconfirm>
                    ) : null}
                    {esRoot && (
                      <Tooltip title="Borrar permanentemente (pruebas)">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          className="be-accion-btn"
                          onClick={() => abrirPurga(record)}
                          aria-label="Borrar permanentemente"
                        />
                      </Tooltip>
                    )}
                  </div>
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
          showPlanSelect
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
                  onChange={(planId) => {
                    const min = getPlanMinLicencias(planId);
                    const actuales = form.getFieldValue('licencias');
                    if (actuales == null || Number(actuales) < min) {
                      form.setFieldsValue({ licencias: min });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item
                name="licencias"
                label="Licencias"
                extra={`Mínimo ${minLicenciasEdicion} para el plan seleccionado`}
                rules={[
                  { required: true, message: 'Campo requerido' },
                  {
                    type: 'number',
                    min: minLicenciasEdicion,
                    message: `Mínimo ${minLicenciasEdicion} licencias`,
                  },
                ]}
              >
                <InputNumber min={minLicenciasEdicion} className="be-full-width" />
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
              <GradientButton type="submit" text="Guardar" className="be-full-width" />
            </Col>
            <Col span={12}>
              <Button onClick={handleCancelModal} className="be-full-width">
                Cancelar
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Borrar empresa permanentemente"
        open={Boolean(purgeTarget)}
        onCancel={cerrarPurga}
        onOk={confirmarPurga}
        okText="Eliminar para siempre"
        okButtonProps={{
          danger: true,
          loading: purgeLoading,
          disabled:
            !purgeCif.trim()
            || purgeCif.trim().toUpperCase()
              !== String(purgeTarget?.identificador_fiscal || '').trim().toUpperCase(),
        }}
        cancelButtonProps={{ disabled: purgeLoading }}
        destroyOnClose
      >
        <p>
          Se eliminarán <strong>todos los datos</strong> de{' '}
          <strong>{purgeTarget?.nombre}</strong>: fichajes, usuarios exclusivos,
          facturación y registros asociados. <strong>No se puede deshacer.</strong>
        </p>
        <p>Escribe el CIF de la empresa para confirmar:</p>
        <Input
          value={purgeCif}
          onChange={(e) => setPurgeCif(e.target.value)}
          placeholder={purgeTarget?.identificador_fiscal || 'B12345678'}
          autoComplete="off"
        />
      </Modal>
    </Layout>
  );
};

export default BuscadorEmpresa;
