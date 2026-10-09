import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Card, DatePicker, Spin, Statistic, Table, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { getWhatsappMetaGasto } from '../../../features/whatsapp/whatsappService';
import './Platform.css';

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const formatUsd = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
};

const PlatformWhatsappGasto = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [range, setRange] = useState(() => [
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const cargar = useCallback(async () => {
    if (!range?.[0] || !range?.[1]) return;
    setLoading(true);
    try {
      const result = await getWhatsappMetaGasto({
        from: range[0].format('YYYY-MM-DD'),
        to: range[1].format('YYYY-MM-DD'),
      });
      setData(result);
    } catch (error) {
      message.error(error.message || 'No se pudo cargar el gasto WhatsApp');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const breakdownColumns = [
    { title: 'Categoría', dataIndex: 'pricing_category', key: 'cat' },
    { title: 'Tipo', dataIndex: 'pricing_type', key: 'type' },
    { title: 'Volumen', dataIndex: 'volume', key: 'vol', align: 'right' },
    {
      title: 'Coste (USD)',
      dataIndex: 'cost',
      key: 'cost',
      align: 'right',
      render: (v) => formatUsd(v),
    },
  ];

  const dailyColumns = [
    { title: 'Día', dataIndex: 'date', key: 'date' },
    { title: 'Volumen', dataIndex: 'volume', key: 'vol', align: 'right' },
    {
      title: 'Coste (USD)',
      dataIndex: 'cost',
      key: 'cost',
      align: 'right',
      render: (v) => formatUsd(v),
    },
  ];

  return (
    <div className="platform-section">
      <Card
        title="Gasto WhatsApp (Meta)"
        extra={(
          <RangePicker
            value={range}
            onChange={(vals) => {
              if (vals?.[0] && vals?.[1]) setRange(vals);
            }}
            allowClear={false}
            format="DD/MM/YYYY"
          />
        )}
      >
        <Paragraph type="secondary">
          Total según
          {' '}
          <Text code>pricing_analytics</Text>
          {' '}
          de la WABA Nexcor. Solo visible para ROOT.
        </Paragraph>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : data ? (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={data.meta?.disclaimer}
            />
            <Statistic
              title={`Total periodo ${data.period?.from} — ${data.period?.to} (${data.period?.timezone})`}
              value={data.totalCost}
              precision={4}
              suffix={data.currency || 'USD'}
              style={{ marginBottom: 24 }}
            />
            <Text type="secondary">
              WABA:
              {' '}
              {data.wabaId}
              {' · '}
              Conversaciones / unidades (volumen):
              {' '}
              <Text strong>{data.totalVolume}</Text>
            </Text>

            <Card type="inner" title="Desglose por categoría" style={{ marginTop: 24 }}>
              <Table
                size="small"
                rowKey={(r) => `${r.pricing_category}-${r.pricing_type}`}
                columns={breakdownColumns}
                dataSource={data.breakdown || []}
                pagination={false}
              />
            </Card>

            {(data.daily?.length ?? 0) > 0 && (
              <Card type="inner" title="Por día" style={{ marginTop: 16 }}>
                <Table
                  size="small"
                  rowKey="date"
                  columns={dailyColumns}
                  dataSource={data.daily}
                  pagination={{ pageSize: 15, hideOnSinglePage: true }}
                />
              </Card>
            )}
          </>
        ) : null}
      </Card>
    </div>
  );
};

export default PlatformWhatsappGasto;
