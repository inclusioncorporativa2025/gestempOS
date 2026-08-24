import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { CopyOutlined, LinkOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../../config/AuthContext';
import {
  crearInvitacionHub,
  listarVentasHub,
} from '../../../features/hub/hubService';
import {
  colorEtapaVenta,
  etiquetaEtapaVenta,
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

const HubVentas = () => {
  const { user } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [limite] = useState(50);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState(null);
  const [invitacionOpen, setInvitacionOpen] = useState(false);
  const [invitacionLoading, setInvitacionLoading] = useState(false);
  const [invitacionResultado, setInvitacionResultado] = useState(null);
  const [invitacionForm, setInvitacionForm] = useState({
    email_previsto: '',
    telefono_previsto: '',
  });

  const puedeCrearInvitacion = tienePermisoHub(user, 'crear_invitacion');
  const puedeVerImportes = tienePermisoHub(user, 'ver_importes');

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

  useEffect(() => {
    setPagina(1);
  }, [busquedaDebounced, etapaFiltro]);

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
      render: (etapa) => (
        <Tag color={colorEtapaVenta(etapa)}>{etiquetaEtapaVenta(etapa)}</Tag>
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
        <div>
          <Text>{row.plan_nombre || row.modo_facturacion || '—'}</Text>
          {row.trial_ends_at && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Trial hasta {dayjs(row.trial_ends_at).format('DD/MM/YYYY')}
              </Text>
            </>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="hub-section">
      <div className="hub-section__toolbar">
        <Space wrap className="hub-section__filters">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar empresa, CIF, comercial..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="hub-section__search"
          />
          <Select
            allowClear
            placeholder="Etapa"
            value={etapaFiltro}
            onChange={setEtapaFiltro}
            options={ETAPAS}
            className="hub-section__etapa"
          />
        </Space>
        {puedeCrearInvitacion && (
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirInvitacion}>
            Invitación register
          </Button>
        )}
      </div>

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
    </div>
  );
};

export default HubVentas;
