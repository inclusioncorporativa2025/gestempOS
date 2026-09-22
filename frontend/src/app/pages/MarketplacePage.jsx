import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  InputNumber,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { BellOutlined, ReloadOutlined, ShopOutlined } from '@ant-design/icons';
import { getIdEmpresa } from '../../utils/authSession';
import {
  activarModuloEmpresa,
  cancelarModuloEmpresa,
  getMarketplaceCatalogo,
  getMarketplaceEstadoEmpresa,
} from '../../features/marketplace/marketplaceService';
import './MarketplacePage.css';

const { Title, Text, Paragraph } = Typography;

const estadoTag = (estado) => {
  if (!estado) return <Tag>No contratado</Tag>;
  if (estado === 'active') return <Tag color="success">Activo</Tag>;
  if (estado === 'cancelled') return <Tag color="default">Cancelado</Tag>;
  if (estado === 'pending') return <Tag color="warning">Pendiente</Tag>;
  return <Tag>{estado}</Tag>;
};

const MarketplacePage = () => {
  const [loading, setLoading] = useState(true);
  const [accionCodigo, setAccionCodigo] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [estadoEmpresa, setEstadoEmpresa] = useState([]);
  const [idEmpresaConsulta, setIdEmpresaConsulta] = useState(() => getIdEmpresa() || null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, estado] = await Promise.all([
        getMarketplaceCatalogo(),
        idEmpresaConsulta
          ? getMarketplaceEstadoEmpresa(idEmpresaConsulta)
          : Promise.resolve({ modulos: [] }),
      ]);
      setCatalogo(cat.modulos ?? []);
      setEstadoEmpresa(estado.modulos ?? []);
    } catch (error) {
      message.error(error.message || 'Error al cargar marketplace');
      setCatalogo([]);
      setEstadoEmpresa([]);
    } finally {
      setLoading(false);
    }
  }, [idEmpresaConsulta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const contratoPorCodigo = (codigo) => {
    const fila = estadoEmpresa.find((e) => e.modulo?.codigo === codigo);
    return fila?.contrato ?? null;
  };

  const asientosPorCodigo = (codigo) => {
    const fila = estadoEmpresa.find((e) => e.modulo?.codigo === codigo);
    return fila?.asientos_activos ?? 0;
  };

  const onActivar = async (codigo) => {
    if (!idEmpresaConsulta) {
      message.warning('Indica el id de empresa');
      return;
    }
    setAccionCodigo(codigo);
    try {
      const data = await activarModuloEmpresa({
        idEmpresa: idEmpresaConsulta,
        codigoModulo: codigo,
      });
      setEstadoEmpresa(data.modulos ?? []);
      message.success('Módulo activado');
    } catch (error) {
      message.error(error.message || 'No se pudo activar');
    } finally {
      setAccionCodigo(null);
    }
  };

  const onCancelar = async (codigo) => {
    if (!idEmpresaConsulta) {
      message.warning('Indica el id de empresa');
      return;
    }
    setAccionCodigo(codigo);
    try {
      const data = await cancelarModuloEmpresa({
        idEmpresa: idEmpresaConsulta,
        codigoModulo: codigo,
      });
      setEstadoEmpresa(data.modulos ?? []);
      message.success('Módulo cancelado');
    } catch (error) {
      message.error(error.message || 'No se pudo cancelar');
    } finally {
      setAccionCodigo(null);
    }
  };

  return (
    <div className="marketplace-page">
      <div className="marketplace-page__header">
        <Title level={3} className="marketplace-page__title">
          <ShopOutlined style={{ marginRight: 8 }} />
          Marketplace
        </Title>
        <Text type="secondary" className="marketplace-page__subtitle">
          Módulos opcionales — gestión interna ROOT
        </Text>
      </div>

      <Alert
        type="info"
        showIcon
        className="marketplace-page__banner"
        message="Vista interna ROOT"
        description="Activa módulos por empresa (sin Stripe en esta fase). Sin periodo de prueba."
      />

      <div className="marketplace-page__toolbar">
        <Space wrap align="center">
          <Text>Empresa (id_empresa):</Text>
          <InputNumber
            min={1}
            value={idEmpresaConsulta}
            onChange={setIdEmpresaConsulta}
            placeholder="ID empresa"
          />
          <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading}>
            Actualizar
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {catalogo.map((modulo) => {
            const contrato = contratoPorCodigo(modulo.codigo);
            const activo = contrato?.estado === 'active';
            const precio = Number(modulo.precio_mensual_eur).toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            return (
              <Col xs={24} lg={12} xl={10} key={modulo.codigo}>
                <Card className="marketplace-page__module-card">
                  <div className="marketplace-page__module-head">
                    <BellOutlined className="marketplace-page__module-icon" />
                    <div>
                      <Title level={4} className="marketplace-page__module-title">
                        {modulo.nombre}
                      </Title>
                      {estadoTag(contrato?.estado)}
                    </div>
                  </div>
                  <Paragraph type="secondary">{modulo.descripcion}</Paragraph>
                  <Text strong>
                    {precio}
                    {' '}
                    € / usuario / mes
                  </Text>
                  {idEmpresaConsulta ? (
                    <div className="marketplace-page__module-meta">
                      <Text type="secondary">
                        Asientos activos:
                        {' '}
                        {asientosPorCodigo(modulo.codigo)}
                      </Text>
                    </div>
                  ) : null}
                  <Space wrap className="marketplace-page__module-actions">
                    {!activo ? (
                      <Button
                        type="primary"
                        loading={accionCodigo === modulo.codigo}
                        onClick={() => onActivar(modulo.codigo)}
                        disabled={!idEmpresaConsulta}
                      >
                        Activar empresa
                      </Button>
                    ) : (
                      <Button
                        danger
                        loading={accionCodigo === modulo.codigo}
                        onClick={() => onCancelar(modulo.codigo)}
                      >
                        Cancelar módulo
                      </Button>
                    )}
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
        {!loading && !catalogo.length ? (
          <Alert type="warning" message="Catálogo vacío. Revisa marketplace_modulos en BD." />
        ) : null}
      </Spin>
    </div>
  );
};

export default MarketplacePage;
