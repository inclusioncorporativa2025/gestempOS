import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { BarChartOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { getInformeProductividad } from '../../features/informes/productividadService';
import { usePlan } from '../../hooks/usePlan';
import { PLANS } from '../../constants/plans';
import './ProductividadPage.css';

dayjs.locale('es');

const { Title, Text, Paragraph } = Typography;

const formatMinutos = (minutos) => {
  if (minutos == null) return '—';
  const abs = Math.abs(Number(minutos));
  const horas = Math.floor(abs / 60);
  const mins = abs % 60;
  if (horas > 0 && mins > 0) return `${horas}h ${mins}m`;
  if (horas > 0) return `${horas}h`;
  return `${mins}m`;
};

const exportarCsv = (informe) => {
  if (!informe?.empleados?.length) {
    message.warning('No hay datos para exportar');
    return;
  }

  const headers = [
    'Nombre',
    'Email',
    'Horas trabajadas',
    'Horas pactadas',
    'Cumplimiento %',
    'Delta',
    'Horas extra (min)',
    'Déficit (min)',
    'Días ausencia',
    'Absentismo %',
    'Retraso medio (min)',
  ];

  const filas = informe.empleados.map((row) => [
    row.nombre,
    row.email,
    row.horas_trabajadas,
    row.horas_pactadas,
    row.cumplimiento_pct ?? '',
    row.delta,
    row.horas_extra_min ?? 0,
    row.deficit_min ?? 0,
    row.dias_ausencia ?? 0,
    row.absentismo_pct ?? '',
    row.puntualidad_media_min ?? '',
  ]);

  const csv = [headers, ...filas]
    .map((linea) => linea.map((celda) => `"${String(celda ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `productividad-${informe.mes}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const ProductividadPage = () => {
  const { tieneFeature, planInfo } = usePlan();
  const puedeVerInforme = tieneFeature('informes_productividad');
  const planCompleto = PLANS.find((p) => p.id === 'completo');

  const [mesSeleccionado, setMesSeleccionado] = useState(() => dayjs().startOf('month'));
  const [loading, setLoading] = useState(false);
  const [informe, setInforme] = useState(null);

  const cargarInforme = useCallback(async () => {
    if (!puedeVerInforme) return;
    setLoading(true);
    try {
      const data = await getInformeProductividad(mesSeleccionado.format('YYYY-MM'));
      setInforme(data);
    } catch (error) {
      message.error(error.message || 'Error al cargar el informe');
      setInforme(null);
    } finally {
      setLoading(false);
    }
  }, [mesSeleccionado, puedeVerInforme]);

  useEffect(() => {
    cargarInforme();
  }, [cargarInforme]);

  const mesLabel = mesSeleccionado.locale('es').format('MMMM [de] YYYY');

  const columnas = useMemo(() => [
    {
      title: 'Empleado',
      key: 'empleado',
      fixed: 'left',
      width: 220,
      render: (_, row) => (
        <div>
          <Text strong>{row.nombre}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{row.email}</Text>
        </div>
      ),
    },
    {
      title: 'Cumplimiento',
      dataIndex: 'cumplimiento_pct',
      key: 'cumplimiento_pct',
      width: 120,
      sorter: (a, b) => (a.cumplimiento_pct ?? -1) - (b.cumplimiento_pct ?? -1),
      render: (valor, row) => {
        if (!row.jornada_configurada || valor == null) {
          return <Text type="secondary">Sin jornada</Text>;
        }
        let color = 'success';
        if (valor < 85) color = 'error';
        else if (valor < 95) color = 'warning';
        return <Tag color={color}>{valor}%</Tag>;
      },
    },
    {
      title: 'Trabajadas',
      dataIndex: 'horas_trabajadas',
      key: 'horas_trabajadas',
      width: 110,
    },
    {
      title: 'Pactadas',
      dataIndex: 'horas_pactadas',
      key: 'horas_pactadas',
      width: 110,
    },
    {
      title: 'Delta',
      dataIndex: 'delta',
      key: 'delta',
      width: 100,
    },
    {
      title: 'Extra',
      key: 'extra',
      width: 90,
      render: (_, row) => (row.horas_extra_min > 0 ? formatMinutos(row.horas_extra_min) : '—'),
    },
    {
      title: 'Absentismo',
      key: 'absentismo',
      width: 110,
      sorter: (a, b) => (a.absentismo_pct ?? 0) - (b.absentismo_pct ?? 0),
      render: (_, row) => (
        row.absentismo_pct != null
          ? `${row.absentismo_pct}% (${row.dias_ausencia} d.)`
          : '—'
      ),
    },
    {
      title: 'Retraso medio',
      key: 'puntualidad',
      width: 120,
      render: (_, row) => (
        row.puntualidad_media_min != null
          ? `${row.puntualidad_media_min} min`
          : <Text type="secondary">N/D</Text>
      ),
    },
  ], []);

  if (!puedeVerInforme) {
    return (
      <div className="productividad-page">
        <Title level={3}>Informes de productividad</Title>
        <Alert
          type="info"
          showIcon
          message="Disponible en el plan Completo"
          description={
            <>
              Los informes de rendimiento y productividad del equipo están incluidos en el plan{' '}
              <strong>{planCompleto?.name ?? 'Completo'}</strong>
              {' '}
              (desde
              {' '}
              {planCompleto?.priceMonthly ?? '5,90'}
              {' '}
              €/usuario/mes).
              Tu plan actual:
              {' '}
              <strong>{planInfo?.name ?? 'Esencial'}</strong>
              .
            </>
          }
        />
      </div>
    );
  }

  const resumen = informe?.resumen;

  return (
    <div className="productividad-page">
      <div className="productividad-page__header">
        <div className="productividad-page__title-block">
          <Title level={3} className="productividad-page__title">
            <BarChartOutlined style={{ marginRight: 8 }} />
            Informes de productividad
          </Title>
          <Text type="secondary" className="productividad-page__subtitle">
            Rendimiento del equipo en
            {' '}
            {mesLabel}
          </Text>
        </div>

        <div className="productividad-page__actions">
          <DatePicker
            picker="month"
            value={mesSeleccionado}
            onChange={(value) => value && setMesSeleccionado(value.startOf('month'))}
            allowClear={false}
            format="MM/YYYY"
          />
          <Button icon={<ReloadOutlined />} onClick={cargarInforme} loading={loading}>
            Actualizar
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => exportarCsv(informe)}
            disabled={!informe?.empleados?.length}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      <Paragraph type="secondary" className="productividad-page__nota">
        Comparativa orientativa según jornada pactada y fichajes registrados. El registro válido
        para inspección son los fichajes diarios.
      </Paragraph>

      <Row gutter={[16, 16]} className="productividad-page__kpis">
        <Col xs={24} sm={12} lg={6}>
          <Card className="productividad-page__kpi-card">
            <Statistic
              title="Empleados analizados"
              value={resumen?.total_empleados ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="productividad-page__kpi-card">
            <Statistic
              title="Cumplimiento medio"
              value={resumen?.media_cumplimiento_pct ?? '—'}
              suffix={resumen?.media_cumplimiento_pct != null ? '%' : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="productividad-page__kpi-card">
            <Statistic
              title="Absentismo medio"
              value={resumen?.media_absentismo_pct ?? '—'}
              suffix={resumen?.media_absentismo_pct != null ? '%' : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="productividad-page__kpi-card">
            <Statistic
              title="Retraso medio entrada"
              value={resumen?.media_retraso_min ?? '—'}
              suffix={resumen?.media_retraso_min != null ? 'min' : undefined}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          rowKey="id_usuario"
          columns={columnas}
          dataSource={informe?.empleados ?? []}
          loading={loading}
          pagination={{ pageSize: 15, hideOnSinglePage: true }}
          scroll={{ x: 980 }}
          locale={{ emptyText: 'No hay personal activo para analizar en este mes' }}
        />
      </Card>
    </div>
  );
};

export default ProductividadPage;
