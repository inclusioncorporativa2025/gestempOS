import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Col,
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
  ShopOutlined,
} from '@ant-design/icons';
import { getIdEmpresa } from '../../utils/authSession';
import {
  getMarketplaceCatalogo,
  getMarketplaceEstadoEmpresa,
} from '../../features/marketplace/marketplaceService';
import {
  marketplaceDescripcionCatalogoModulo,
  marketplaceEtiquetaPrecioPlaza,
  marketplaceModuloContratoActivo,
  marketplaceModuloCoverClass,
  marketplaceModuloCoverImage,
  marketplaceModuloCoverImageAlt,
  marketplaceModuloPath,
  marketplaceNombreModulo,
  marketplaceNormalizarCiclo,
} from '../../constants/marketplace';
import { getEstadoFacturacion } from '../../features/billing/billingService';
import MarketplaceContratarPlazasModal from '../../features/marketplace/MarketplaceContratarPlazasModal';
import './MarketplacePage.css';

const { Title, Text, Paragraph } = Typography;

const moduloIcon = (codigo) => {
  if (codigo === 'alertas_fichaje') return <BellOutlined aria-hidden />;
  return <ShopOutlined aria-hidden />;
};

const estadoEtiquetaCatalogo = (activo) => (
  activo ? (
    <Tag color="success" className="marketplace-module-card__status">Activo</Tag>
  ) : (
    <Tag className="marketplace-module-card__status">No activo</Tag>
  )
);

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [catalogo, setCatalogo] = useState([]);
  const [estadoEmpresa, setEstadoEmpresa] = useState([]);
  const [contratarModulo, setContratarModulo] = useState(null);
  const [cicloFacturacion, setCicloFacturacion] = useState('mensual');
  const idEmpresa = getIdEmpresa();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, estado, facturacion] = await Promise.all([
        getMarketplaceCatalogo(),
        idEmpresa
          ? getMarketplaceEstadoEmpresa(idEmpresa)
          : Promise.resolve({ modulos: [] }),
        getEstadoFacturacion().catch(() => null),
      ]);
      setCatalogo(cat.modulos ?? []);
      setEstadoEmpresa(estado.modulos ?? []);
      if (facturacion?.ciclo_facturacion) {
        setCicloFacturacion(marketplaceNormalizarCiclo(facturacion.ciclo_facturacion));
      }
    } catch (error) {
      message.error(error.message || 'Error al cargar marketplace');
      setCatalogo([]);
      setEstadoEmpresa([]);
    } finally {
      setLoading(false);
    }
  }, [idEmpresa]);

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

  return (
    <div className="marketplace-page app-page">
      <Spin spinning={loading}>
        <Row gutter={[20, 20]} className="marketplace-page__grid">
          {catalogo.map((modulo) => {
            const filaEstado = estadoPorCodigo.get(modulo.codigo);
            const activo = marketplaceModuloContratoActivo(filaEstado);
            const estadoLabel = activo ? 'Activo' : 'No activo';
            const precioLabel = marketplaceEtiquetaPrecioPlaza(modulo, cicloFacturacion);

            const coverClass = marketplaceModuloCoverClass(modulo.codigo);
            const coverImage = marketplaceModuloCoverImage(modulo.codigo);

            return (
              <Col
                xs={24}
                sm={12}
                lg={8}
                xl={6}
                className="marketplace-page__card-col"
                key={modulo.codigo}
              >
                <article className="marketplace-module-card">
                  <div
                    className={[
                      'marketplace-module-card__cover',
                      coverClass,
                      coverImage ? 'marketplace-module-card__cover--image' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {coverImage ? (
                      <img
                        className="marketplace-module-card__cover-img"
                        src={coverImage}
                        alt={marketplaceModuloCoverImageAlt(modulo.codigo)}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="marketplace-module-card__cover-icon">
                        {moduloIcon(modulo.codigo)}
                      </span>
                    )}
                    {estadoEtiquetaCatalogo(activo)}
                  </div>
                  <div className="marketplace-module-card__body">
                    <Title level={4} className="marketplace-module-card__title">
                      {modulo.nombre}
                    </Title>
                    <Paragraph type="secondary" className="marketplace-module-card__desc">
                      {marketplaceDescripcionCatalogoModulo(modulo.codigo, modulo.descripcion)}
                    </Paragraph>
                    <Text strong className="marketplace-module-card__price">
                      {precioLabel ?? '—'}
                    </Text>
                    <div className="marketplace-module-card__footer">
                      <div className="marketplace-module-card__seats">
                        <Text type={activo ? undefined : 'secondary'} strong={activo}>
                          {estadoLabel}
                        </Text>
                      </div>
                      <Space wrap size="small">
                        {activo ? (
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => navigate(marketplaceModuloPath(modulo.codigo))}
                          >
                            Gestionar
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => setContratarModulo(modulo)}
                          >
                            Contratar
                          </Button>
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
          <Alert type="warning" message="No hay módulos disponibles en el catálogo." />
        ) : null}
      </Spin>

      <MarketplaceContratarPlazasModal
        open={Boolean(contratarModulo)}
        onClose={() => setContratarModulo(null)}
        codigoModulo={contratarModulo?.codigo}
        nombreModulo={
          contratarModulo
            ? marketplaceNombreModulo(contratarModulo.codigo)
            : ''
        }
        precioMensualEur={contratarModulo?.precio_mensual_eur}
        precioAnualEur={contratarModulo?.precio_anual_eur}
        cicloFacturacionEmpresa={cicloFacturacion}
        plazasActuales={
          contratarModulo
            ? Number(estadoPorCodigo.get(contratarModulo.codigo)?.contrato?.licencias_facturadas) || 0
            : 0
        }
        idEmpresa={idEmpresa}
      />
    </div>
  );
};

export default MarketplacePage;
