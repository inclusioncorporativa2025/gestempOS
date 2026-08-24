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
  Pagination,
  Spin,
  Dropdown,
  DatePicker,
} from 'antd';
import GradientButton from '../../components/shared/GradientButton';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  RedoOutlined,
  DeleteOutlined,
  CopyOutlined,
  MoreOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  crearEmpresa,
  editEmpresa,
  eliminarEmpresa,
  getEmpresasUsuarios,
  generarEnlacePagoEmpresa,
  purgarEmpresaPermanente,
  reactivarEmpresa,
  extenderPeriodoPruebaEmpresa,
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

const MOBILE_BREAKPOINT = 950;
const PAGE_SIZE = 10;

const FILTRO_TODAS = 'todas';
const FILTRO_ACTIVAS = 'activas';
const FILTRO_DESACTIVADAS = 'desactivadas';

const empresaDadaDeBaja = (record) =>
  Boolean(record.fecha_baja) || record.activo === 0 || record.activo === false;

const trialSinSuscripcion = (record) =>
  String(record.modo_facturacion || '').toLowerCase() === 'trial'
  && !record.stripe_subscription_id;

const trialExpiradoSinSuscripcion = (record) => {
  if (!trialSinSuscripcion(record) || !record.trial_ends_at) return false;
  return new Date(record.trial_ends_at) <= new Date();
};

const trialActivoSinTarjeta = (record) =>
  trialSinSuscripcion(record) && !trialExpiradoSinSuscripcion(record);

const empresaFacturacionBloquea = (record) => {
  const estado = String(record.estado_suscripcion || '').toLowerCase();
  const modo = String(record.modo_facturacion || '').toLowerCase();

  if (estado === 'canceled') return true;
  if (trialExpiradoSinSuscripcion(record)) return true;

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

const empresaRequiereEnlacePago = (record) =>
  record.requiere_enlace_pago === 1
  || record.requiere_enlace_pago === true
  || trialExpiradoSinSuscripcion(record);

const empresaPuedeAmpliarPrueba = (record) => {
  const modo = String(record.modo_facturacion || '').toLowerCase();
  const estado = String(record.estado_suscripcion || '').toLowerCase();

  if (modo === 'legacy') return false;
  if (modo === 'trial') return true;
  if (estado === 'trialing') return true;

  return false;
};

const renderEnPrueba = (record) => (
  <div>
    <Tag color="blue">En prueba</Tag>
    {record.trial_ends_at && (
      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
        Finaliza el {dayjs(record.trial_ends_at).format('DD/MM/YYYY')}
      </Text>
    )}
  </div>
);

const renderEstadoEmpresa = (record) => {
  if (empresaDadaDeBaja(record)) {
    return <Tag color="default">De baja</Tag>;
  }

  const estado = String(record.estado_suscripcion || '').toLowerCase();
  const modo = String(record.modo_facturacion || '').toLowerCase();

  if (estado === 'canceled') {
    return <Tag color="red">Suscripción cancelada</Tag>;
  }
  if (trialActivoSinTarjeta(record)) {
    return renderEnPrueba(record);
  }
  if (trialExpiradoSinSuscripcion(record)) {
    return <Tag color="orange">Pendiente de pago</Tag>;
  }
  if (estado === 'trialing') {
    return renderEnPrueba(record);
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
  const [paymentLinkLoadingId, setPaymentLinkLoadingId] = useState(null);
  const [trialExtendTarget, setTrialExtendTarget] = useState(null);
  const [trialExtendDate, setTrialExtendDate] = useState(null);
  const [trialExtendLoading, setTrialExtendLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [mobilePage, setMobilePage] = useState(1);
  const esRoot = Number(getTipoUsuario()) === 1;

  useEffect(() => {
    fetchEmpresas();
  }, []);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setMobilePage(1);
  }, [busqueda, filtroEstado, data.length]);

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

  const filteredDataMobile = useMemo(() => {
    const start = (mobilePage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, mobilePage]);

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

  const copiarEnlacePagoEmpresa = async (record) => {
    setPaymentLinkLoadingId(record.id_empresa);
    try {
      const resultado = await generarEnlacePagoEmpresa(record.id_empresa);
      if (!resultado?.url) {
        throw new Error('No se recibió la URL de pago');
      }
      await navigator.clipboard.writeText(resultado.url);
      const destino = resultado.email || record.email || 'el administrador';
      message.success(`Enlace copiado. Envíalo a ${destino}`);
    } catch (error) {
      message.error(error.message || 'No se pudo copiar el enlace de pago');
    } finally {
      setPaymentLinkLoadingId(null);
    }
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

  const abrirModalAmpliarPrueba = (record) => {
    const actual = record.trial_ends_at ? dayjs(record.trial_ends_at) : null;
    setTrialExtendTarget(record);
    setTrialExtendDate(actual && actual.isAfter(dayjs(), 'day') ? actual.add(7, 'day') : dayjs().add(7, 'day'));
  };

  const cerrarModalAmpliarPrueba = () => {
    if (trialExtendLoading) return;
    setTrialExtendTarget(null);
    setTrialExtendDate(null);
  };

  const confirmarAmpliarPrueba = async () => {
    if (!trialExtendTarget || !trialExtendDate) {
      message.error('Selecciona la nueva fecha de fin de prueba');
      return;
    }

    if (!trialExtendDate.isAfter(dayjs(), 'day')) {
      message.error('La nueva fecha debe ser posterior a hoy');
      return;
    }

    const finActual = trialExtendTarget.trial_ends_at
      ? dayjs(trialExtendTarget.trial_ends_at)
      : null;

    if (
      finActual
      && finActual.isAfter(dayjs(), 'day')
      && !trialExtendDate.isAfter(finActual, 'day')
    ) {
      message.error('La nueva fecha debe ser posterior al fin de prueba actual');
      return;
    }

    setTrialExtendLoading(true);
    try {
      await extenderPeriodoPruebaEmpresa(
        trialExtendTarget.id_empresa,
        trialExtendDate.endOf('day').toISOString(),
      );
      message.success('Periodo de prueba ampliado correctamente');
      cerrarModalAmpliarPrueba();
      await fetchEmpresas();
    } catch (error) {
      message.error(error.message || 'No se pudo ampliar el periodo de prueba');
    } finally {
      setTrialExtendLoading(false);
    }
  };

  const renderAccionesEmpresa = (record) => {
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
        <Dropdown
          menu={{
            items: [
              ...(empresaPuedeAmpliarPrueba(record)
                ? [{
                    key: 'extender-prueba',
                    label: 'Aumentar periodo de prueba',
                    icon: <FieldTimeOutlined />,
                    onClick: () => abrirModalAmpliarPrueba(record),
                  }]
                : []),
            ],
          }}
          trigger={['click']}
          placement="bottomRight"
          disabled={!empresaPuedeAmpliarPrueba(record)}
        >
          <Tooltip title="Más acciones">
            <Button
              type="text"
              icon={<MoreOutlined className="be-accion-btn__more-vertical" />}
              className="be-accion-btn"
              aria-label="Más acciones"
              disabled={!empresaPuedeAmpliarPrueba(record)}
            />
          </Tooltip>
        </Dropdown>
      </div>
    );
  };

  const columns = [
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
      title: 'Pago',
      key: 'enlace_pago',
      width: 56,
      align: 'center',
      render: (_, record) => {
        if (!empresaRequiereEnlacePago(record)) {
          return '—';
        }
        return (
          <Tooltip title="Copiar enlace de pago">
            <Button
              type="text"
              icon={<CopyOutlined />}
              loading={paymentLinkLoadingId === record.id_empresa}
              onClick={() => copiarEnlacePagoEmpresa(record)}
              aria-label="Copiar enlace de pago"
              className="be-accion-btn be-accion-btn--copy"
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => renderAccionesEmpresa(record),
    },
  ];

  const renderEmpresaCard = (record) => (
    <article
      key={record.id_empresa}
      className={[
        'be-mobile-card',
        !empresaEstaActiva(record) ? 'be-mobile-card--inactive' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="be-mobile-card__header">
        <h3 className="be-mobile-card__nombre">{record.nombre}</h3>
        <div className="be-mobile-card__badges">
          {renderEstadoEmpresa(record)}
          <Tag color={getPlanTagColor(record.plan)}>{getPlanLabel(record.plan)}</Tag>
        </div>
      </div>
      <dl className="be-mobile-card__meta">
        <div className="be-mobile-card__pair">
          <div className="be-mobile-card__field">
            <dt>CIF</dt>
            <dd>{record.identificador_fiscal || '—'}</dd>
          </div>
          <div className="be-mobile-card__field">
            <dt>Email</dt>
            <dd>
              {record.email ? (
                <a href={`mailto:${record.email}`} className="be-mobile-card__email">
                  {record.email}
                </a>
              ) : '—'}
            </dd>
          </div>
        </div>
        <div className="be-mobile-card__pair">
          <div className="be-mobile-card__field">
            <dt>Licencias</dt>
            <dd>{record.licencias ?? '—'}</dd>
          </div>
          <div className="be-mobile-card__field">
            <dt>Alta</dt>
            <dd>{formatDate(record.fecha_alta) || '—'}</dd>
          </div>
        </div>
      </dl>
      {empresaRequiereEnlacePago(record) && (
        <Button
          type="default"
          size="small"
          icon={<CopyOutlined />}
          loading={paymentLinkLoadingId === record.id_empresa}
          onClick={() => copiarEnlacePagoEmpresa(record)}
          className="be-mobile-card__pago-btn"
        >
          Copiar enlace de pago
        </Button>
      )}
      <div className="be-mobile-card__acciones">
        {renderAccionesEmpresa(record)}
      </div>
    </article>
  );

  const renderStatCard = ({ key, label, count, licenciasLabel, licencias, className }) => (
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
  );

  return (
    <Layout className={embedded ? 'be-layout be-layout--embedded' : 'be-layout'}>
      {!embedded && (
        <Title level={2} className="be-page-title">
          Administrar Empresas
        </Title>
      )}

      <div className="be-stats-grid">
        <div className="be-stats-grid__total">
          {renderStatCard(tarjetasResumen[0])}
        </div>
        <div className="be-stats-grid__split">
          {renderStatCard(tarjetasResumen[1])}
          {renderStatCard(tarjetasResumen[2])}
        </div>
      </div>

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
        {isMobile ? (
          <div className="be-mobile-list">
            {loading ? (
              <div className="be-mobile-loading">
                <Spin />
              </div>
            ) : filteredData.length === 0 ? (
              <p className="be-mobile-empty">No hay empresas que coincidan con el filtro</p>
            ) : (
              <>
                {filteredDataMobile.map((record) => renderEmpresaCard(record))}
                {filteredData.length > PAGE_SIZE && (
                  <Pagination
                    className="be-mobile-pagination"
                    current={mobilePage}
                    pageSize={PAGE_SIZE}
                    total={filteredData.length}
                    onChange={setMobilePage}
                    showSizeChanger={false}
                    hideOnSinglePage
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <Table
            dataSource={filteredData}
            loading={loading}
            rowKey="id_empresa"
            pagination={{ pageSize: PAGE_SIZE, showSizeChanger: false }}
            scroll={{ x: 700 }}
            rowClassName={(record) => (empresaEstaActiva(record) ? '' : 'be-row-inactiva')}
            locale={{ emptyText: 'No hay empresas que coincidan con el filtro' }}
            columns={columns}
          />
        )}
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

      <Modal
        title="Aumentar periodo de prueba"
        open={Boolean(trialExtendTarget)}
        onCancel={cerrarModalAmpliarPrueba}
        onOk={confirmarAmpliarPrueba}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={trialExtendLoading}
        destroyOnClose
        centered
      >
        {trialExtendTarget && (
          <>
            <p>
              Empresa: <strong>{trialExtendTarget.nombre}</strong>
            </p>
            <p>
              Fin de prueba actual:{' '}
              <strong>
                {trialExtendTarget.trial_ends_at
                  ? formatDate(trialExtendTarget.trial_ends_at)
                  : 'Sin fecha registrada'}
              </strong>
            </p>
            <Form layout="vertical" className="be-trial-extend-form">
              <Form.Item label="Nueva fecha de fin de prueba" required>
                <DatePicker
                  className="be-full-width"
                  value={trialExtendDate}
                  onChange={setTrialExtendDate}
                  format="DD/MM/YYYY"
                  disabledDate={(current) => {
                    if (!current) return false;
                    const finActual = trialExtendTarget?.trial_ends_at
                      ? dayjs(trialExtendTarget.trial_ends_at)
                      : null;
                    const min = finActual && finActual.isAfter(dayjs(), 'day')
                      ? finActual.endOf('day')
                      : dayjs().endOf('day');
                    return !current.isAfter(min, 'day');
                  }}
                  placeholder="Selecciona una fecha"
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </Layout>
  );
};

export default BuscadorEmpresa;
