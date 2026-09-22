import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, BellOutlined, ReloadOutlined } from '@ant-design/icons';
import { APP_ROUTES } from '../../constants/routes';
import { MARKETPLACE_MODULO_ALERTAS } from '../../constants/marketplace';
import { getIdEmpresa } from '../../utils/authSession';
import { useAuth } from '../../config/AuthContext';
import {
  getMarketplaceEstadoEmpresa,
  guardarAsignacionModulo,
  listarAsignacionesModulo,
} from '../../features/marketplace/marketplaceService';
import './MarketplaceAsignacionesPage.css';

const { Title, Text, Paragraph } = Typography;

const CODIGO_MODULO = MARKETPLACE_MODULO_ALERTAS;

const MarketplaceAsignacionesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const esRoot = Number(user?.tipo_usuario) === 1;

  const idEmpresaSesion = getIdEmpresa();
  const idEmpresaQuery = Number(searchParams.get('idEmpresa'));
  const idEmpresa = (esRoot && idEmpresaQuery > 0) ? idEmpresaQuery : idEmpresaSesion;

  const [loading, setLoading] = useState(true);
  const [moduloInfo, setModuloInfo] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [moduloActivo, setModuloActivo] = useState(false);
  const [guardandoId, setGuardandoId] = useState(null);

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
        setModuloInfo(fila?.modulo ?? null);
        setAsignaciones([]);
        return;
      }

      const data = await listarAsignacionesModulo({
        idEmpresa,
        codigoModulo: CODIGO_MODULO,
      });
      setModuloInfo(data.modulo ?? fila?.modulo);
      setAsignaciones(data.asignaciones ?? []);
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

  const asientosActivos = useMemo(
    () => asignaciones.filter((a) => a.asignado).length,
    [asignaciones],
  );

  const columnas = useMemo(() => [
    {
      title: 'Empleado',
      key: 'empleado',
      render: (_, row) => (
        <div>
          <Text strong>{row.nombre}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{row.email}</Text>
        </div>
      ),
    },
    {
      title: 'Módulo',
      key: 'asignado',
      width: 100,
      align: 'center',
      render: (_, row) => (
        <Switch
          checked={row.asignado}
          loading={guardandoId === row.id_usuario}
          onChange={(checked) => persistirFila(row, { asignado: checked })}
        />
      ),
    },
    {
      title: 'Email',
      key: 'email',
      width: 90,
      align: 'center',
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.asignado && row.canal_email}
          disabled={!row.asignado || guardandoId === row.id_usuario}
          onChange={(checked) => persistirFila(row, { canal_email: checked })}
        />
      ),
    },
    {
      title: 'WhatsApp',
      key: 'whatsapp',
      width: 110,
      align: 'center',
      render: (_, row) => {
        const sinTelefono = !row.telefono_whatsapp;
        return (
          <Tooltip
            title={
              sinTelefono
                ? 'Sin móvil WhatsApp en ficha'
                : 'Avisos por WhatsApp (cuenta en cupo mensual)'
            }
          >
            <Switch
              size="small"
              checked={row.asignado && row.canal_whatsapp}
              disabled={
                !row.asignado
                || sinTelefono
                || guardandoId === row.id_usuario
              }
              onChange={(checked) => persistirFila(row, { canal_whatsapp: checked })}
            />
          </Tooltip>
        );
      },
    },
  ], [guardandoId, persistirFila]);

  return (
    <div className="marketplace-asignaciones-page">
      <div className="marketplace-asignaciones-page__header">
        <Space direction="vertical" size={4}>
          <Title level={3} className="marketplace-asignaciones-page__title">
            <BellOutlined style={{ marginRight: 8 }} />
            Alertas de fichaje
          </Title>
          <Text type="secondary">
            Asigna el módulo y activa email o WhatsApp por empleado
          </Text>
        </Space>
        <Space wrap>
          {esRoot ? (
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(APP_ROUTES.marketplace)}
            >
              Marketplace ROOT
            </Button>
          ) : null}
          <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading}>
            Actualizar
          </Button>
        </Space>
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
          <div className="marketplace-asignaciones-page__stats">
            <Tag color="blue">
              {moduloInfo?.nombre ?? 'Alertas'}
            </Tag>
            <Text type="secondary">
              {asientosActivos}
              {' '}
              usuario(s) con módulo activo · facturación por asiento
            </Text>
          </div>
          <Paragraph type="secondary" className="marketplace-asignaciones-page__nota">
            Solo se monitorizan empleados con el módulo activo. WhatsApp consume cupo mensual
            de Meta por mensaje enviado.
          </Paragraph>
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
    </div>
  );
};

export default MarketplaceAsignacionesPage;
