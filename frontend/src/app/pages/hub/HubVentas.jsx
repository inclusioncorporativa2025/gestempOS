import React, { useCallback, useEffect, useState } from 'react';
import {
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
import './Hub.css';

const { Text, Paragraph } = Typography;

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
    setInvitacionLoading(true);
    try {
      const data = await crearInvitacionHub({
        email_previsto: invitacionForm.email_previsto || undefined,
        telefono_previsto: invitacionForm.telefono_previsto || undefined,
      });
      setInvitacionResultado(data);
      message.success('Invitación creada');
    } catch (error) {
      message.error(error.message || 'No se pudo crear la invitación');
    } finally {
      setInvitacionLoading(false);
    }
  };

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
                Generar enlace
              </Button>,
            ]
        }
      >
        {!invitacionResultado ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Paragraph type="secondary">
              Genera un enlace o código para que el cliente complete el register y quede
              atribuido a tu usuario comercial.
            </Paragraph>
            <Input
              placeholder="Email previsto (opcional)"
              value={invitacionForm.email_previsto}
              onChange={(e) => setInvitacionForm((prev) => ({
                ...prev,
                email_previsto: e.target.value,
              }))}
            />
            <Input
              placeholder="Teléfono previsto (opcional)"
              value={invitacionForm.telefono_previsto}
              onChange={(e) => setInvitacionForm((prev) => ({
                ...prev,
                telefono_previsto: e.target.value,
              }))}
            />
          </Space>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
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
