import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  InputNumber,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  BellOutlined,
  ReloadOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { APP_ROUTES } from '../../constants/routes';
import { getIdEmpresa } from '../../utils/authSession';
import {
  activarModuloEmpresa,
  cancelarModuloEmpresa,
  getMarketplaceCatalogo,
  getMarketplaceEstadoEmpresa,
} from '../../features/marketplace/marketplaceService';
import { marketplaceModuloCoverClass } from '../../constants/marketplace';
import './MarketplacePage.css';

const { Title, Text, Paragraph } = Typography;

const moduloIcon = (codigo) => {
  if (codigo === 'alertas_fichaje') return <BellOutlined aria-hidden />;
  return <ShopOutlined aria-hidden />;
};

const estadoEtiqueta = (estado) => {
  if (estado === 'active') {
    return <Tag color="success" className="marketplace-module-card__status">Activo</Tag>;
  }
  if (estado === 'cancelled') {
    return <Tag className="marketplace-module-card__status">Cancelado</Tag>;
  }
  if (estado === 'pending') {
    return <Tag color="warning" className="marketplace-module-card__status">Pendiente</Tag>;
  }
  return null;
};

const MarketplacePage = () => {
  const navigate = useNavigate();
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

  const estadoPorCodigo = useMemo(() => {
    const map = new Map();
    (estadoEmpresa ?? []).forEach((fila) => {
      if (fila.modulo?.codigo) {
        map.set(fila.modulo.codigo, fila);
      }
    });
    return map;
  }, [estadoEmpresa]);

  const aplicarEstadoRespuesta = (data) => {
    const filas = Array.isArray(data?.modulos) ? data.modulos : data;
    if (Array.isArray(filas)) {
      setEstadoEmpresa(filas);
    } else {
      cargar();
    }
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
      aplicarEstadoRespuesta(data);
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
      aplicarEstadoRespuesta(data);
      message.success('Módulo cancelado');
    } catch (error) {
      message.error(error.message || 'No se pudo cancelar');
    } finally {
      setAccionCodigo(null);
    }
  };

  return (
    <div className="marketplace-page app-page">
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
        <Row gutter={[20, 20]} className="marketplace-page__grid">
          {catalogo.map((modulo) => {
            const filaEstado = estadoPorCodigo.get(modulo.codigo);
            const contrato = filaEstado?.contrato ?? null;
            const activo = contrato?.estado === 'active';
            const asientos = filaEstado?.asientos_activos ?? 0;
            const licencias = Number(contrato?.licencias_facturadas) || 0;
            const asientosLabel = activo
              ? `${asientos} asiento${asientos === 1 ? '' : 's'} activos`
              : licencias > 0
                ? `${licencias} asiento${licencias === 1 ? '' : 's'} al activar`
                : '0 asientos · se facturan al asignar personal';

            const precio = Number(modulo.precio_mensual_eur).toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            const coverClass = marketplaceModuloCoverClass(modulo.codigo);

            return (
              <Col xs={24} sm={12} xl={8} key={modulo.codigo}>
                <article className="marketplace-module-card">
                  <div className={`marketplace-module-card__cover ${coverClass}`}>
                    <span className="marketplace-module-card__cover-icon">
                      {moduloIcon(modulo.codigo)}
                    </span>
                    {activo ? estadoEtiqueta('active') : estadoEtiqueta(contrato?.estado)}
                  </div>
                  <div className="marketplace-module-card__body">
                    <Title level={4} className="marketplace-module-card__title">
                      {modulo.nombre}
                    </Title>
                    <Paragraph type="secondary" className="marketplace-module-card__desc">
                      {modulo.descripcion}
                    </Paragraph>
                    <Text strong className="marketplace-module-card__price">
                      {precio}
                      {' '}
                      € / usuario / mes
                    </Text>
                    <div className="marketplace-module-card__footer">
                      <Text type="secondary" className="marketplace-module-card__seats">
                        {idEmpresaConsulta ? asientosLabel : '—'}
                      </Text>
                      <Space wrap size="small">
                        {!activo ? (
                          <Button
                            type="primary"
                            size="small"
                            loading={accionCodigo === modulo.codigo}
                            onClick={() => onActivar(modulo.codigo)}
                            disabled={!idEmpresaConsulta}
                          >
                            Activar
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="small"
                              onClick={() => navigate(
                                `${APP_ROUTES.marketplaceAsignaciones}?idEmpresa=${idEmpresaConsulta}`,
                              )}
                            >
                              Canales
                            </Button>
                            <Button
                              size="small"
                              danger
                              loading={accionCodigo === modulo.codigo}
                              onClick={() => onCancelar(modulo.codigo)}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                      </Space>
                    </div>
                  </div>
                </article>
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
