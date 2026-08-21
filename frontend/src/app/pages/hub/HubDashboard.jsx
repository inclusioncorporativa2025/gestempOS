import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { obtenerMetricasHub } from '../../../features/hub/hubService';
import { etiquetaEtapaVenta } from '../../../utils/hubAccess';
import './Hub.css';

dayjs.locale('es');

const { Text } = Typography;

const formatearMes = (mes) => {
  if (!mes) return '';
  const parsed = dayjs(`${mes}-01`);
  return parsed.isValid() ? parsed.format('MMM YYYY') : mes;
};

const TagEtapa = ({ etapa, children }) => (
  <Tag bordered className={`hub-outline-tag hub-etapa-tag hub-etapa-tag--${etapa}`}>
    {children ?? etiquetaEtapaVenta(etapa)}
  </Tag>
);

const HubDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [metricas, setMetricas] = useState(null);

  const cargarMetricas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await obtenerMetricasHub();
      setMetricas(data);
    } catch (error) {
      message.error(error.message || 'Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarMetricas();
  }, [cargarMetricas]);

  const maxEvolucion = useMemo(() => {
    const items = metricas?.evolucion || [];
    return Math.max(...items.map((i) => i.total), 1);
  }, [metricas]);

  const variacionMes = useMemo(() => {
    const actual = metricas?.comparativa_meses?.actual ?? 0;
    const anterior = metricas?.comparativa_meses?.anterior ?? 0;
    if (anterior === 0) return actual > 0 ? 100 : 0;
    return Math.round(((actual - anterior) / anterior) * 100);
  }, [metricas]);

  const columnasProductividad = [
    {
      title: 'Comercial',
      key: 'comercial',
      render: (_, row) => (
        <div>
          <Text strong>{row.nombre}</Text>
          {row.es_organica ? (
            <>
              <br />
              <TagEtapa etapa="default">Registro directo / legacy</TagEtapa>
            </>
          ) : (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{row.email}</Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Ventas',
      dataIndex: 'ventas_total',
      key: 'ventas_total',
      width: 90,
      sorter: (a, b) => a.ventas_total - b.ventas_total,
    },
    {
      title: 'Activas',
      dataIndex: 'ventas_activas',
      key: 'ventas_activas',
      width: 90,
    },
    {
      title: 'Trial',
      dataIndex: 'ventas_trial',
      key: 'ventas_trial',
      width: 80,
    },
    {
      title: 'Invitaciones',
      key: 'invitaciones',
      width: 120,
      render: (_, row) => (
        row.es_organica
          ? '—'
          : `${row.invitaciones_usadas}/${row.invitaciones_total}`
      ),
    },
    {
      title: 'Conversión',
      key: 'conversion',
      width: 110,
      render: (_, row) => (
        row.tasa_conversion != null
          ? `${row.tasa_conversion}%`
          : '—'
      ),
    },
  ];

  const resumen = metricas?.resumen;

  return (
    <div className="hub-section hub-dashboard">
      <Row gutter={[16, 16]} className="hub-dashboard__kpis">
        <Col xs={12} sm={8} lg={4}>
          <Card loading={loading}>
            <Statistic title="Total clientes" value={resumen?.total ?? 0} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {resumen?.sin_comercial ?? 0} sin comercial
            </Text>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card loading={loading}>
            <Statistic title="Activas" value={resumen?.activa ?? 0} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card loading={loading}>
            <Statistic title="En trial" value={resumen?.trial ?? 0} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card loading={loading}>
            <Statistic title="Registradas" value={resumen?.registrada ?? 0} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card loading={loading}>
            <Statistic title="Canceladas" value={resumen?.cancelada ?? 0} valueStyle={{ color: '#8c8c8c' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card loading={loading}>
            <Statistic
              title="Ventas este mes"
              value={metricas?.comparativa_meses?.actual ?? 0}
              suffix={(
                <span className={`hub-dashboard__trend hub-dashboard__trend--${
                  variacionMes > 0 ? 'up' : variacionMes < 0 ? 'down' : 'flat'
                }`}
                >
                  {variacionMes > 0 && <ArrowUpOutlined />}
                  {variacionMes < 0 && <ArrowDownOutlined />}
                  {variacionMes === 0 && <MinusOutlined />}
                  {`${Math.abs(variacionMes)}%`}
                </span>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Evolución de ventas (12 meses)" loading={loading}>
            {(metricas?.evolucion || []).length === 0 ? (
              <Text type="secondary">Sin datos en el periodo</Text>
            ) : (
              <div className="hub-dashboard__chart">
                {(metricas?.evolucion || []).map((item) => (
                  <div key={item.mes} className="hub-dashboard__bar-row">
                    <span className="hub-dashboard__bar-label">{formatearMes(item.mes)}</span>
                    <div className="hub-dashboard__bar-track">
                      <div
                        className="hub-dashboard__bar-fill"
                        style={{ width: `${(item.total / maxEvolucion) * 100}%` }}
                        title={`${item.total} ventas`}
                      />
                    </div>
                    <span className="hub-dashboard__bar-value">{item.total}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="hub-dashboard__legend">
              <TagEtapa etapa="activa" />
              <TagEtapa etapa="trial" />
              <TagEtapa etapa="registrada" />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Desglose por etapa" loading={loading}>
            <div className="hub-dashboard__etapas">
              {['activa', 'trial', 'registrada', 'cancelada'].map((etapa) => {
                const total = resumen?.total || 0;
                const valor = resumen?.[etapa] ?? 0;
                const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
                return (
                  <div key={etapa} className="hub-dashboard__etapa-row">
                    <TagEtapa etapa={etapa} />
                    <div className="hub-dashboard__bar-track hub-dashboard__bar-track--sm">
                      <div
                        className="hub-dashboard__bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <Text>{valor} ({pct}%)</Text>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title="Productividad por comercial"
        loading={loading}
        className="hub-dashboard__table-card"
      >
        <Table
          rowKey={(row) => row.id_usuario ?? 'organica'}
          columns={columnasProductividad}
          dataSource={metricas?.productividad || []}
          pagination={false}
          locale={{ emptyText: 'Sin comerciales con actividad' }}
          scroll={{ x: 700 }}
        />
      </Card>
    </div>
  );
};

export default HubDashboard;
