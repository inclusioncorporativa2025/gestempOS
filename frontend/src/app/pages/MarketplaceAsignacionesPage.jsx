import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Modal,
  Progress,
  Space,
  Spin,
  Switch,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  BellOutlined,
  InfoCircleOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
import {
  MARKETPLACE_MODULO_ALERTAS,
  marketplaceNombreModulo,
} from '../../constants/marketplace';
import { APP_ROUTES } from '../../constants/routes';
import { getIdEmpresa, getIdUsuario } from '../../utils/authSession';
import { formatearTelefonoWhatsappDisplay } from '../../utils/telefonoWhatsapp';
import { useAuth } from '../../config/AuthContext';
import {
  getMarketplaceEstadoEmpresa,
  guardarAsignacionModulo,
  listarAsignacionesModulo,
} from '../../features/marketplace/marketplaceService';
import './MarketplaceAsignacionesPage.css';

const { Title, Text, Paragraph } = Typography;

const MarketplaceAsignacionesPage = ({ codigoModulo = MARKETPLACE_MODULO_ALERTAS }) => {
  const CODIGO_MODULO = codigoModulo;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const idUsuarioSesion = getIdUsuario();
  const esRoot = Number(user?.tipo_usuario) === 1;

  const idEmpresaSesion = getIdEmpresa();
  const idEmpresaQuery = Number(searchParams.get('idEmpresa'));
  const idEmpresa = (esRoot && idEmpresaQuery > 0) ? idEmpresaQuery : idEmpresaSesion;

  const [loading, setLoading] = useState(true);
  const [asignaciones, setAsignaciones] = useState([]);
  const [moduloActivo, setModuloActivo] = useState(false);
  const [guardandoId, setGuardandoId] = useState(null);
  const [whatsappUso, setWhatsappUso] = useState(null);
  const [waInfoOpen, setWaInfoOpen] = useState(false);

  const cargar = useCallback(async () => {
    if (!idEmpresa) {
      setLoading(false);
      setModuloActivo(false);
      return;
    }

    setLoading(true);
    try {
      const estado = await getMarketplaceEstadoEmpresa(idEmpresa);
      const fila = (estado.modulos ?? []).find((m) => m.modulo?.codigo === CODIGO_MODULO);
      const activo = fila?.contrato?.estado === 'active';
      setModuloActivo(activo);

      if (!activo) {
        setAsignaciones([]);
        setWhatsappUso(null);
        return;
      }

      const data = await listarAsignacionesModulo({
        idEmpresa,
        codigoModulo: CODIGO_MODULO,
      });
      setAsignaciones(data.asignaciones ?? []);
      setWhatsappUso(data.whatsapp_uso ?? null);
    } catch (error) {
      message.error(error.message || 'Error al cargar asignaciones');
      setAsignaciones([]);
      setModuloActivo(false);
    } finally {
      setLoading(false);
    }
  }, [idEmpresa]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const persistirFila = useCallback(async (row, cambios) => {
    const asignado = cambios.asignado ?? row.asignado;
    const canalEmail = cambios.canal_email ?? row.canal_email;
    const canalWhatsapp = cambios.canal_whatsapp ?? row.canal_whatsapp;

    setGuardandoId(row.id_usuario);
    try {
      const result = await guardarAsignacionModulo({
        idEmpresa,
        codigoModulo: CODIGO_MODULO,
        idUsuario: row.id_usuario,
        asignado,
        canalEmail: asignado ? canalEmail : false,
        canalWhatsapp: asignado ? canalWhatsapp : false,
      });

      setAsignaciones((prev) => prev.map((item) => (
        item.id_usuario === row.id_usuario
          ? {
            ...item,
            asignado,
            canal_email: asignado ? canalEmail : item.canal_email,
            canal_whatsapp: asignado ? canalWhatsapp : false,
          }
          : item
      )));

      if (result.asientos_activos != null) {
        message.success(`Guardado · ${result.asientos_activos} usuario(s) con módulo`);
      }
    } catch (error) {
      message.error(error.message || 'No se pudo guardar');
      await cargar();
    } finally {
      setGuardandoId(null);
    }
  }, [cargar, idEmpresa]);

  const whatsappCupoEmpresa = useMemo(() => {
    if (!whatsappUso) {
      return { usuariosWa: 0, porUsuario: 0, total: 0, enviados: 0 };
    }
    const porUsuario = Number(whatsappUso.mensajes_por_usuario) || 0;
    const topeAbs = Number(whatsappUso.tope_absoluto_empresa) || 500;
    const usuariosWa = asignaciones.filter((a) => a.asignado && a.canal_whatsapp).length;
    const calculado = usuariosWa * porUsuario;
    const total = calculado > 0 ? Math.min(topeAbs, calculado) : 0;

    return {
      usuariosWa,
      porUsuario,
      total,
      enviados: Number(whatsappUso.mensajes_enviados) || 0,
    };
  }, [asignaciones, whatsappUso]);

  const whatsappProgress = useMemo(() => {
    if (!whatsappCupoEmpresa.total) return 0;
    return Math.min(
      100,
      Math.round((whatsappCupoEmpresa.enviados / whatsappCupoEmpresa.total) * 100),
    );
  }, [whatsappCupoEmpresa]);

  const whatsappAgotado = whatsappCupoEmpresa.total > 0
    && whatsappCupoEmpresa.enviados >= whatsappCupoEmpresa.total;

  const irConfigurarTelefono = useCallback((row) => {
    const esPropio = Number(row.id_usuario) === Number(idUsuarioSesion);
    const destino = esPropio
      ? APP_ROUTES.miPerfil
      : `${APP_ROUTES.users}/${row.id_usuario}`;
    navigate(destino, { state: { focusTelefonoWhatsapp: true } });
  }, [idUsuarioSesion, navigate]);

  const columnas = useMemo(() => [
    {
      title: 'Empleado',
      key: 'empleado',
      render: (_, row) => {
        const telefono = row.telefono_whatsapp
          ? formatearTelefonoWhatsappDisplay(row.telefono_whatsapp)
          : null;
        return (
          <div className="marketplace-asignaciones-page__empleado">
            <Text strong>{row.nombre}</Text>
            <div className="marketplace-asignaciones-page__empleado-meta">
              <Text type="secondary" className="marketplace-asignaciones-page__empleado-line">
                {row.email}
              </Text>
              <span className="marketplace-asignaciones-page__empleado-sep" aria-hidden>
                ·
              </span>
              {telefono ? (
                <Text type="secondary" className="marketplace-asignaciones-page__empleado-line">
                  {telefono}
                </Text>
              ) : (
                <button
                  type="button"
                  className="marketplace-asignaciones-page__empleado-link"
                  onClick={() => irConfigurarTelefono(row)}
                >
                  Añadir móvil
                </button>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Email',
      key: 'email',
      width: 90,
      align: 'center',
      render: (_, row) => (
        <Tooltip title="Alertas de fichaje por correo">
          <span className="marketplace-asignaciones-page__switch-wrap">
            <Switch
              size="small"
              checked={row.asignado && row.canal_email}
              disabled={guardandoId === row.id_usuario}
              onChange={(checked) => persistirFila(row, {
                canal_email: checked,
                asignado: checked || row.canal_whatsapp,
              })}
            />
          </span>
        </Tooltip>
      ),
    },
    {
      title: (
        <span className="marketplace-asignaciones-page__wa-col-head">
          <span>WhatsApp</span>
          <button
            type="button"
            className="marketplace-asignaciones-page__wa-col-info"
            aria-label="Información sobre cupo WhatsApp"
            onClick={(event) => {
              event.stopPropagation();
              setWaInfoOpen(true);
            }}
          >
            <InfoCircleOutlined />
          </button>
        </span>
      ),
      key: 'whatsapp',
      width: 108,
      align: 'center',
      render: (_, row) => {
        const sinTelefono = !row.telefono_whatsapp;
        let tooltipWa = 'Avisos por WhatsApp (cuentan en el cupo mensual de la empresa)';
        if (sinTelefono) {
          tooltipWa = 'Sin móvil en ficha. Usa «Añadir móvil» en la fila del empleado.';
        }

        return (
          <Tooltip title={tooltipWa}>
            <span className="marketplace-asignaciones-page__switch-wrap">
              <Switch
                size="small"
                checked={row.asignado && row.canal_whatsapp}
                disabled={sinTelefono || guardandoId === row.id_usuario}
                onChange={(checked) => persistirFila(row, {
                  canal_whatsapp: checked,
                  asignado: row.canal_email || checked,
                })}
              />
            </span>
          </Tooltip>
        );
      },
    },
  ], [guardandoId, irConfigurarTelefono, persistirFila]);

  return (
    <div className="marketplace-asignaciones-page">
      <div className="marketplace-asignaciones-page__header">
        <div className="marketplace-asignaciones-page__header-main">
          <Title level={4} className="marketplace-asignaciones-page__title">
            <BellOutlined style={{ marginRight: 8 }} />
            {marketplaceNombreModulo(CODIGO_MODULO)}
          </Title>
          <Text type="secondary" className="marketplace-asignaciones-page__header-sub">
            Email y WhatsApp por persona asignada
          </Text>
        </div>
        {moduloActivo && whatsappUso ? (
          <div className="marketplace-asignaciones-page__wa-cupo">
            <WhatsAppOutlined
              className="marketplace-asignaciones-page__wa-icon"
              aria-hidden
            />
            <div className="marketplace-asignaciones-page__wa-cupo-body">
              <Text type="secondary" className="marketplace-asignaciones-page__wa-cupo-detail">
                {whatsappCupoEmpresa.enviados}
                {' / '}
                {whatsappCupoEmpresa.total}
                {' '}
                envíos WhatsApp
              </Text>
              <Progress
                percent={whatsappProgress}
                size="small"
                status={whatsappAgotado ? 'exception' : 'active'}
                showInfo={false}
                className="marketplace-asignaciones-page__wa-progress"
              />
            </div>
          </div>
        ) : null}
      </div>

      {!idEmpresa ? (
        <Alert
          type="warning"
          showIcon
          message="Sin empresa en sesión"
          description="Selecciona una empresa o suplanta una cuenta de cliente."
        />
      ) : null}

      {idEmpresa && !loading && !moduloActivo ? (
        <Alert
          type="info"
          showIcon
          message="Módulo no activo"
          description={
            esRoot
              ? 'Activa «Alertas de fichaje» en Marketplace para esta empresa antes de asignar usuarios.'
              : 'Tu empresa aún no tiene contratado el módulo de alertas. Contacta con administración.'
          }
        />
      ) : null}

      {moduloActivo ? (
        <>
          <Spin spinning={loading}>
            <Table
              rowKey="id_usuario"
              columns={columnas}
              dataSource={asignaciones}
              pagination={{ pageSize: 20, hideOnSinglePage: true }}
              scroll={{ x: 640 }}
              locale={{ emptyText: 'No hay personal para asignar' }}
            />
          </Spin>
        </>
      ) : null}

      <Modal
        title="Cupo WhatsApp — alertas de fichaje"
        open={waInfoOpen}
        onCancel={() => setWaInfoOpen(false)}
        footer={[
          <Button key="cerrar" type="primary" onClick={() => setWaInfoOpen(false)}>
            Entendido
          </Button>,
        ]}
        width={480}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Paragraph style={{ marginBottom: 0 }}>
            Cada usuario con WhatsApp activo en esta tabla dispone de
            {' '}
            <Text strong>{whatsappCupoEmpresa.porUsuario || '—'}</Text>
            {' '}
            mensajes al mes. El total de la empresa es la suma de todos ellos
            (ahora:
            {' '}
            <Text strong>{whatsappCupoEmpresa.usuariosWa}</Text>
            {' '}
            {whatsappCupoEmpresa.usuariosWa === 1 ? 'usuario' : 'usuarios'}
            {' → '}
            <Text strong>{whatsappCupoEmpresa.total}</Text>
            {' '}
            envíos/mes).
          </Paragraph>
          <Paragraph style={{ marginBottom: 0 }} type="secondary">
            El empleado debe tener móvil WhatsApp en su ficha. Las alertas de fichaje
            consumen un mensaje del cupo cuando se envían por este canal.
          </Paragraph>
          <Paragraph style={{ marginBottom: 0 }} type="secondary">
            Si se agota el cupo mensual, las alertas siguen por email hasta el mes siguiente.
            El contador se reinicia cada mes natural.
          </Paragraph>
        </Space>
      </Modal>
    </div>
  );
};

export default MarketplaceAsignacionesPage;
