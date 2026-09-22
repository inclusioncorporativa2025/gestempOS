import React from 'react';
import { Alert, Card, Col, Row, Tag, Typography } from 'antd';
import { BellOutlined, ShopOutlined } from '@ant-design/icons';
import './MarketplacePage.css';

const { Title, Text, Paragraph } = Typography;

/** Catálogo v1 (solo alertas). Precios orientativos hasta Stripe. */
const MODULOS_CATALOGO = [
  {
    codigo: 'alertas_fichaje',
    nombre: 'Alertas de fichaje',
    descripcion:
      'Aviso cuando un empleado no registra la entrada en su horario. '
      + 'Email y WhatsApp configurables por persona asignada.',
    precioUsuarioMes: '—',
    estado: 'preview',
    notas: [
      'Add-on para cualquier plan (Esencial, RRHH o Completo).',
      'El plan Completo no incluye este módulo.',
      'Sin periodo de prueba (evita abuso y coste Meta en WhatsApp).',
      'Facturación por usuario asignado al módulo.',
    ],
  },
];

const MarketplacePage = () => (
  <div className="marketplace-page">
    <div className="marketplace-page__header">
      <Title level={3} className="marketplace-page__title">
        <ShopOutlined style={{ marginRight: 8 }} />
        Marketplace
      </Title>
      <Text type="secondary" className="marketplace-page__subtitle">
        Módulos opcionales para ampliar TimeCor
      </Text>
    </div>

    <Alert
      type="info"
      showIcon
      className="marketplace-page__banner"
      message="Vista interna ROOT"
      description="La tienda aún no está disponible para clientes. Solo usuarios ROOT pueden ver este catálogo mientras se implementa contratación y alertas."
    />

    <Row gutter={[16, 16]}>
      {MODULOS_CATALOGO.map((modulo) => (
        <Col xs={24} lg={12} xl={10} key={modulo.codigo}>
          <Card className="marketplace-page__module-card">
            <div className="marketplace-page__module-head">
              <BellOutlined className="marketplace-page__module-icon" />
              <div>
                <Title level={4} className="marketplace-page__module-title">
                  {modulo.nombre}
                </Title>
                <Tag color="processing">Próximamente</Tag>
              </div>
            </div>
            <Paragraph type="secondary">{modulo.descripcion}</Paragraph>
            <Text strong>
              Precio orientativo:
              {' '}
              {modulo.precioUsuarioMes}
              {' '}
              € / usuario / mes
            </Text>
            <ul className="marketplace-page__module-list">
              {modulo.notas.map((nota) => (
                <li key={nota}>
                  <Text type="secondary">{nota}</Text>
                </li>
              ))}
            </ul>
          </Card>
        </Col>
      ))}
    </Row>
  </div>
);

export default MarketplacePage;
