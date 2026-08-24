import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dropdown,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  LinkOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../../config/AuthContext';
import {
  crearInvitacionHub,
  eliminarInvitacionHub,
  eliminarVentaHub,
  listarComercialesHub,
  listarInvitacionesHub,
  listarVentasHub,
  transferirInvitacionHub,
  transferirVentaHub,
} from '../../../features/hub/hubService';
import {
  colorEstadoInvitacion,
  colorEtapaVenta,
  etiquetaEstadoInvitacion,
  etiquetaEtapaVenta,
  puedeGestionarAccesosHub,
  tienePermisoHub,
} from '../../../utils/hubAccess';
import {
  buildWhatsAppInvitacionUrl,
  telefonoValidoWhatsApp,
} from '../../../utils/hubInvitacionWhatsApp';
import './Hub.css';

const { Text, Paragraph } = Typography;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WhatsAppIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const ETAPAS = [
  { value: 'registrada', label: 'Registrada' },
  { value: 'trial', label: 'En prueba' },
  { value: 'activa', label: 'Activa' },
  { value: 'cancelada', label: 'Cancelada' },
];

const ESTADOS_INVITACION = [
  { value: 'enviada', label: 'Enviada' },
  { value: 'registrada', label: 'Registrada' },
  { value: 'expirada', label: 'Expirada' },
];

const HubVentas = () => {
  const { user } = useAuth();
  const [vistaActiva, setVistaActiva] = useState('clientes');
  const [ventas, setVentas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [limite] = useState(50);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState(null);
  const [invitaciones, setInvitaciones] = useState([]);
  const [totalInvitaciones, setTotalInvitaciones] = useState(0);
  const [loadingInvitaciones, setLoadingInvitaciones] = useState(false);
  const [paginaInvitaciones, setPaginaInvitaciones] = useState(1);
  const [estadoInvitacionFiltro, setEstadoInvitacionFiltro] = useState(null);
  const [invitacionOpen, setInvitacionOpen] = useState(false);
  const [invitacionLoading, setInvitacionLoading] = useState(false);
  const [invitacionResultado, setInvitacionResultado] = useState(null);
  const [invitacionForm, setInvitacionForm] = useState({
    email_previsto: '',
    telefono_previsto: '',
  });
  const [comerciales, setComerciales] = useState([]);
  const [transferModal, setTransferModal] = useState(null);
  const [transferComercialId, setTransferComercialId] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);

  const puedeCrearInvitacion = tienePermisoHub(user, 'crear_invitacion');
  const puedeVerImportes = tienePermisoHub(user, 'ver_importes');
  const puedeGestionarCartera = puedeGestionarAccesosHub(user);
  const mostrarComercialInv = Number(user?.tipo_usuario) === 1
    || tienePermisoHub(user, 'ver_equipo')
    || tienePermisoHub(user, 'ver_todas');

  useEffect(() => {
    const timer = setTimeout(() => setBusquedaDebounced(busqueda.trim()), 400);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const cargarVentas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarVentasHub({
        pagina,
        limite,
        q: busquedaDebounced || undefined,
        etapa: etapaFiltro || undefined,
      });
      setVentas(data.ventas || []);
      setTotal(data.total || 0);
    } catch (error) {
      message.error(error.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [pagina, limite, busquedaDebounced, etapaFiltro]);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  const cargarInvitaciones = useCallback(async () => {
    setLoadingInvitaciones(true);
    try {
      const data = await listarInvitacionesHub({
        pagina: paginaInvitaciones,
        limite,
        q: busquedaDebounced || undefined,
        estado: estadoInvitacionFiltro || undefined,
      });
      setInvitaciones(data.invitaciones || []);
      setTotalInvitaciones(data.total || 0);
    } catch (error) {
      message.error(error.message || 'Error al cargar invitaciones');
    } finally {
      setLoadingInvitaciones(false);
    }
  }, [paginaInvitaciones, limite, busquedaDebounced, estadoInvitacionFiltro]);

  useEffect(() => {
    if (vistaActiva === 'invitaciones') {
      cargarInvitaciones();
    }
  }, [vistaActiva, cargarInvitaciones]);

  useEffect(() => {
    setPagina(1);
    setPaginaInvitaciones(1);
  }, [busquedaDebounced, etapaFiltro, estadoInvitacionFiltro]);

  useEffect(() => {
    if (!puedeGestionarCartera) return undefined;

    let cancelado = false;
    listarComercialesHub({ soloComercial: true })
      .then((data) => {
        if (!cancelado) setComerciales(data.comerciales || []);
      })
      .catch(() => {
        if (!cancelado) message.error('No se pudieron cargar los comerciales');
      });

    return () => { cancelado = true; };
  }, [puedeGestionarCartera]);

  const opcionesComerciales = useMemo(
    () => (comerciales || []).map((c) => ({
      value: c.id_usuario,
      label: `${c.nombre} (${c.email})`,
    })),
    [comerciales],
  );

  const abrirTransferModal = (tipo, registro) => {
    setTransferModal({ tipo, registro });
    setTransferComercialId(null);
  };

  const cerrarTransferModal = () => {
    setTransferModal(null);
    setTransferComercialId(null);
  };

  const confirmarTransferencia = async () => {
    if (!transferModal || !transferComercialId) {
      message.warning('Selecciona un comercial de destino');
      return;
    }

    setTransferLoading(true);
    try {
      if (transferModal.tipo === 'venta') {
        await transferirVentaHub(transferModal.registro.id_venta, transferComercialId);
        message.success('Cliente transferido');
        await cargarVentas();
      } else {
        await transferirInvitacionHub(transferModal.registro.id_invitacion, transferComercialId);
        message.success('Invitación transferida');
        await cargarInvitaciones();
        if (transferModal.registro.usado) {
          await cargarVentas();
        }
      }
      cerrarTransferModal();
    } catch (error) {
      message.error(error.message || 'No se pudo completar la transferencia');
    } finally {
      setTransferLoading(false);
    }
  };

  const eliminarCliente = async (idVenta) => {
    try {
      await eliminarVentaHub(idVenta);
      message.success('Cliente eliminado del panel');
      await cargarVentas();
    } catch (error) {
      message.error(error.message || 'No se pudo eliminar el cliente');
    }
  };

  const eliminarInvitacion = async (idInvitacion) => {
    try {
      await eliminarInvitacionHub(idInvitacion);
      message.success('Invitación eliminada');
      await cargarInvitaciones();
    } catch (error) {
      message.error(error.message || 'No se pudo eliminar la invitación');
    }
  };

  const renderAccionesCartera = (tipo, row) => {
    if (!puedeGestionarCartera) return null;

    const esInvitacionUsada = tipo === 'invitacion' && row.estado === 'registrada';

    const menuItems = [
      {
        key: 'transferir',
        label: 'Transferir',
        icon: <SwapOutlined />,
        onClick: () => abrirTransferModal(tipo === 'venta' ? 'venta' : 'invitacion', row),
      },
      {
        key: 'eliminar',
        label: 'Eliminar',
        icon: <DeleteOutlined />,
        danger: true,
        disabled: esInvitacionUsada,
        onClick: () => {
          Modal.confirm({
            title: tipo === 'venta'
              ? '¿Eliminar este cliente del panel de ventas?'
              : '¿Eliminar esta invitación?',
            content: tipo === 'venta'
              ? 'La empresa seguirá existiendo; solo se quita la atribución comercial.'
              : 'Esta acción no se puede deshacer.',
            okText: 'Eliminar',
            cancelText: 'Cancelar',
            okButtonProps: { danger: true },
            onOk: () => (
              tipo === 'venta'
                ? eliminarCliente(row.id_venta)
                : eliminarInvitacion(row.id_invitacion)
            ),
          });
        },
      },
    ];

    return (
      <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined className="hub-acciones-more" />}
          aria-label="Acciones"
        />
      </Dropdown>
    );
  };

  const copiarTexto = async (texto, okMsg) => {
    try {
      await navigator.clipboard.writeText(texto);
      message.success(okMsg);
    } catch {
      message.error('No se pudo copiar al portapapeles');
    }
  };

  const abrirInvitacion = () => {
    setInvitacionResultado(null);
    setInvitacionForm({ email_previsto: '', telefono_previsto: '' });
    setInvitacionOpen(true);
  };

  const crearInvitacion = async () => {
    const email = invitacionForm.email_previsto.trim().toLowerCase();
    const telefono = invitacionForm.telefono_previsto.trim();
    const tieneEmail = email.length > 0;
    const tieneTelefono = telefono.length > 0;

    if (!tieneEmail && !tieneTelefono) {
      message.warning('Indica al menos un email o un teléfono del cliente');
      return;
    }
    if (tieneEmail && !EMAIL_RE.test(email)) {
      message.warning('El email del cliente no es válido');
      return;
    }
    if (tieneTelefono && !telefonoValidoWhatsApp(telefono)) {
      message.warning('El teléfono no es válido (mínimo 9 dígitos)');
      return;
    }

    setInvitacionLoading(true);
    try {
      const data = await crearInvitacionHub({
        email_previsto: tieneEmail ? email : undefined,
        telefono_previsto: tieneTelefono ? telefono : undefined,
      });
      setInvitacionResultado(data);

      if (data.email_enviado) {
        message.success(`Invitación enviada por correo a ${data.email_destino}`);
      } else if (data.email_error) {
        message.warning(data.email_error);
      } else {
        message.success('Invitación creada');
      }

      setVistaActiva('invitaciones');
      setPaginaInvitaciones(1);
      try {
        const invData = await listarInvitacionesHub({
          pagina: 1,
          limite,
          q: busquedaDebounced || undefined,
          estado: estadoInvitacionFiltro || undefined,
        });
        setInvitaciones(invData.invitaciones || []);
        setTotalInvitaciones(invData.total || 0);
      } catch {
        /* el useEffect recargará al cambiar de pestaña */
      }
    } catch (error) {
      message.error(error.message || 'No se pudo crear la invitación');
    } finally {
      setInvitacionLoading(false);
    }
  };

  const whatsappUrl = useMemo(() => {
    if (!invitacionResultado?.telefono_previsto) return null;
    return buildWhatsAppInvitacionUrl({
      telefono: invitacionResultado.telefono_previsto,
      registerUrl: invitacionResultado.register_url,
      codigoCorto: invitacionResultado.codigo_corto,
      fechaExpiracionLabel: dayjs(invitacionResultado.fecha_expiracion).format('DD/MM/YYYY HH:mm'),
      comercialNombre: user?.nombre,
    });
  }, [invitacionResultado, user?.nombre]);

  const columns = [
    {
      title: 'Empresa',
      key: 'empresa',
      render: (_, row) => (
        <div>
          <Text strong>{row.empresa_nombre}</Text>
          {row.empresa_alias && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{row.empresa_alias}</Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Contacto',
      key: 'contacto',
      render: (_, row) => (
        <div>
          <Text>{row.empresa_email || '—'}</Text>
          {row.empresa_telefono && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{row.empresa_telefono}</Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Comercial',
      key: 'comercial',
      render: (_, row) => (
        <div>
          <Text>{row.comercial_nombre}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{row.comercial_email}</Text>
        </div>
      ),
    },
    {
      title: 'Etapa',
      dataIndex: 'etapa',
      key: 'etapa',
      width: 120,
      render: (etapa, row) => (
        <div>
          <Tag color={colorEtapaVenta(etapa)}>{etiquetaEtapaVenta(etapa)}</Tag>
          {etapa === 'trial' && row.trial_ends_at && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
              Finaliza el {dayjs(row.trial_ends_at).format('DD/MM/YYYY')}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Canal',
      dataIndex: 'canal',
      key: 'canal',
      width: 100,
    },
    {
      title: 'Alta',
      dataIndex: 'fecha_venta',
      key: 'fecha_venta',
      width: 130,
      render: (fecha) => dayjs(fecha).format('DD/MM/YYYY'),
    },
  ];

  if (puedeVerImportes) {
    columns.push({
      title: 'Facturación',
      key: 'facturacion',
      width: 160,
      render: (_, row) => (
        <Text>{row.plan_nombre || row.modo_facturacion || '—'}</Text>
      ),
    });
  }

  if (puedeGestionarCartera) {
    columns.push({
      title: 'Acciones',
      key: 'acciones',
      width: 72,
      align: 'center',
      fixed: 'right',
      render: (_, row) => renderAccionesCartera('venta', row),
    });
  }

  const columnasInvitaciones = [
    {
      title: 'Contacto',
      key: 'contacto',
      render: (_, row) => (
        <div>
          {row.email_previsto && <Text>{row.email_previsto}</Text>}
          {row.telefono_previsto && (
            <>
              {row.email_previsto && <br />}
              <Text type="secondary" style={{ fontSize: 12 }}>{row.telefono_previsto}</Text>
            </>
          )}
          {!row.email_previsto && !row.telefono_previsto && '—'}
        </div>
      ),
    },
    {
      title: 'Código',
      dataIndex: 'codigo_corto',
      key: 'codigo_corto',
      width: 120,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (estado) => (
        <Tag color={colorEstadoInvitacion(estado)}>{etiquetaEstadoInvitacion(estado)}</Tag>
      ),
    },
    {
      title: 'Canal',
      dataIndex: 'canal',
      key: 'canal',
      width: 90,
      render: (canal) => {
        const map = { email: 'Email', telefono: 'Teléfono', mixto: 'Email + WA' };
        return map[canal] || canal;
      },
    },
  ];

  if (mostrarComercialInv) {
    columnasInvitaciones.push({
      title: 'Comercial',
      key: 'comercial',
      render: (_, row) => (
        <div>
          <Text>{row.comercial_nombre}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{row.comercial_email}</Text>
        </div>
      ),
    });
  }

  columnasInvitaciones.push(
    {
      title: 'Empresa',
      key: 'empresa',
      render: (_, row) => (
        row.empresa_nombre ? (
          <div>
            <Text>{row.empresa_nombre}</Text>
            {row.empresa_alias && (
              <>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{row.empresa_alias}</Text>
              </>
            )}
          </div>
        ) : '—'
      ),
    },
    {
      title: 'Etapa venta',
      dataIndex: 'venta_etapa',
      key: 'venta_etapa',
      width: 120,
      render: (etapa) => (
        etapa ? (
          <Tag color={colorEtapaVenta(etapa)}>{etiquetaEtapaVenta(etapa)}</Tag>
        ) : '—'
      ),
    },
    {
      title: 'Enviada',
      dataIndex: 'fecha_creacion',
      key: 'fecha_creacion',
      width: 110,
      render: (fecha) => dayjs(fecha).format('DD/MM/YYYY'),
    },
    {
      title: 'Válida hasta',
      dataIndex: 'fecha_expiracion',
      key: 'fecha_expiracion',
      width: 120,
      render: (fecha) => (fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Registrada',
      dataIndex: 'fecha_uso',
      key: 'fecha_uso',
      width: 110,
      render: (fecha) => (fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'),
    },
  );

  if (puedeGestionarCartera) {
    columnasInvitaciones.push({
      title: 'Acciones',
      key: 'acciones',
      width: 72,
      align: 'center',
      fixed: 'right',
      render: (_, row) => renderAccionesCartera('invitacion', row),
    });
  }

  const filtrosToolbar = (
    <Space wrap className="hub-section__filters">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder={
          vistaActiva === 'clientes'
            ? 'Buscar empresa, CIF, comercial...'
            : 'Buscar email, teléfono, código...'
        }
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="hub-section__search"
      />
      {vistaActiva === 'clientes' ? (
        <Select
          allowClear
          placeholder="Etapa"
          value={etapaFiltro}
          onChange={setEtapaFiltro}
          options={ETAPAS}
          className="hub-section__etapa"
        />
      ) : (
        <Select
          allowClear
          placeholder="Estado invitación"
          value={estadoInvitacionFiltro}
          onChange={setEstadoInvitacionFiltro}
          options={ESTADOS_INVITACION}
          className="hub-section__etapa"
        />
      )}
    </Space>
  );

  return (
    <div className="hub-section">
      <div className="hub-section__toolbar">
        {filtrosToolbar}
        {puedeCrearInvitacion && (
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirInvitacion}>
            Nueva invitación
          </Button>
        )}
      </div>

      <Tabs
        activeKey={vistaActiva}
        onChange={setVistaActiva}
        items={[
          {
            key: 'clientes',
            label: 'Mis clientes',
            children: (
              <>
                <Text type="secondary" className="hub-section__count">
                  {total} cliente{total === 1 ? '' : 's'} atribuido{total === 1 ? '' : 's'}
                </Text>
                <Table
                  rowKey="id_venta"
                  loading={loading}
                  columns={columns}
                  dataSource={ventas}
                  pagination={{
                    current: pagina,
                    pageSize: limite,
                    total,
                    showSizeChanger: false,
                    onChange: setPagina,
                  }}
                  scroll={{ x: 900 }}
                />
              </>
            ),
          },
          {
            key: 'invitaciones',
            label: 'Invitaciones',
            children: (
              <>
                <Text type="secondary" className="hub-section__count">
                  {totalInvitaciones} invitación{totalInvitaciones === 1 ? '' : 'es'}
                </Text>
                <Table
                  rowKey="id_invitacion"
                  loading={loadingInvitaciones}
                  columns={columnasInvitaciones}
                  dataSource={invitaciones}
                  pagination={{
                    current: paginaInvitaciones,
                    pageSize: limite,
                    total: totalInvitaciones,
                    showSizeChanger: false,
                    onChange: setPaginaInvitaciones,
                  }}
                  scroll={{ x: 1000 }}
                  locale={{ emptyText: 'Sin invitaciones enviadas' }}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title="Invitación de registro"
        open={invitacionOpen}
        onCancel={() => setInvitacionOpen(false)}
        footer={
          invitacionResultado
            ? [
              <Button key="close" onClick={() => setInvitacionOpen(false)}>
                Cerrar
              </Button>,
            ]
            : [
              <Button key="cancel" onClick={() => setInvitacionOpen(false)}>
                Cancelar
              </Button>,
              <Button
                key="create"
                type="primary"
                loading={invitacionLoading}
                onClick={crearInvitacion}
              >
                Crear invitación
              </Button>,
            ]
        }
      >
        {!invitacionResultado ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Paragraph type="secondary">
              Indica el email y/o teléfono del cliente. Si pones email, enviaremos la invitación
              automáticamente. Con teléfono podrás compartirla por WhatsApp.
            </Paragraph>
            <Input
              type="email"
              placeholder="Email del cliente"
              value={invitacionForm.email_previsto}
              onChange={(e) => setInvitacionForm((prev) => ({
                ...prev,
                email_previsto: e.target.value,
              }))}
            />
            <Input
              type="tel"
              placeholder="Teléfono del cliente (WhatsApp)"
              value={invitacionForm.telefono_previsto}
              onChange={(e) => setInvitacionForm((prev) => ({
                ...prev,
                telefono_previsto: e.target.value,
              }))}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Debes rellenar al menos uno de los dos campos.
            </Text>
          </Space>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {invitacionResultado.email_enviado && (
              <Alert
                type="success"
                showIcon
                message={`Correo enviado a ${invitacionResultado.email_destino}`}
              />
            )}
            {invitacionResultado.email_error && (
              <Alert type="warning" showIcon message={invitacionResultado.email_error} />
            )}
            {whatsappUrl && (
              <Button
                type="primary"
                className="hub-btn-whatsapp"
                icon={<WhatsAppIcon />}
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                block
              >
                Enviar por WhatsApp
              </Button>
            )}
            <div>
              <Text type="secondary">Enlace</Text>
              <Input
                readOnly
                value={invitacionResultado.register_url}
                addonAfter={(
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copiarTexto(invitacionResultado.register_url, 'Enlace copiado')}
                  />
                )}
              />
            </div>
            <div>
              <Text type="secondary">Código corto</Text>
              <Input
                readOnly
                value={invitacionResultado.codigo_corto}
                addonAfter={(
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copiarTexto(
                      invitacionResultado.codigo_corto,
                      'Código copiado',
                    )}
                  />
                )}
              />
            </div>
            <Text type="secondary">
              <LinkOutlined /> Válido hasta{' '}
              {dayjs(invitacionResultado.fecha_expiracion).format('DD/MM/YYYY HH:mm')}
            </Text>
          </Space>
        )}
      </Modal>

      <Modal
        title={
          transferModal?.tipo === 'venta'
            ? 'Transferir cliente a otro comercial'
            : 'Transferir invitación a otro comercial'
        }
        open={Boolean(transferModal)}
        onCancel={cerrarTransferModal}
        onOk={confirmarTransferencia}
        okText="Transferir"
        confirmLoading={transferLoading}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Paragraph type="secondary">
            {transferModal?.tipo === 'venta'
              ? 'El cliente seguirá en el panel, pero quedará atribuido al comercial seleccionado.'
              : 'La invitación pasará al comercial seleccionado. Si ya generó un registro, también se actualizará la venta vinculada.'}
          </Paragraph>
          <Select
            showSearch
            placeholder="Selecciona comercial"
            value={transferComercialId}
            onChange={setTransferComercialId}
            options={opcionesComerciales.filter(
              (opt) => opt.value !== transferModal?.registro?.comercial_id,
            )}
            optionFilterProp="label"
            style={{ width: '100%' }}
          />
        </Space>
      </Modal>
    </div>
  );
};

export default HubVentas;
