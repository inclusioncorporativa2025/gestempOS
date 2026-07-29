import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Table, Typography, Modal, Form, Input, InputNumber, Button, message, Space, Select,
} from 'antd';
import dayjs from 'dayjs';
import { getBolsaHoras, ajustarBolsaHoras } from '../../features/user/usuarioService';
import './BolsaHorasPanel.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

const etiquetaMovimiento = (tipo) => (
  tipo === 'ajuste_manual' ? 'Ajuste manual' : 'Cálculo mensual'
);

const BolsaHorasPanel = ({
  idUsuario,
  mesSincronizar = null,
  puedeAjustar = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [saldo, setSaldo] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    setLoading(true);
    try {
      const data = await getBolsaHoras(idUsuario, mesSincronizar);
      setSaldo(data.saldo);
      setMovimientos(data.movimientos || []);
    } catch (error) {
      message.error(error.message || 'No se pudo cargar la bolsa de horas');
    } finally {
      setLoading(false);
    }
  }, [idUsuario, mesSincronizar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleAjuste = async (values) => {
    const horas = Number(values.horas) || 0;
    const minutos = Number(values.minutos) || 0;
    const signo = values.signo === '-' ? -1 : 1;
    const totalMinutos = signo * (Math.abs(horas) * 60 + Math.abs(minutos));

    setGuardando(true);
    try {
      await ajustarBolsaHoras(idUsuario, totalMinutos, values.motivo);
      message.success('Ajuste registrado');
      setModalAbierto(false);
      form.resetFields();
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo registrar el ajuste');
    } finally {
      setGuardando(false);
    }
  };

  const columns = [
    {
      title: 'Periodo',
      dataIndex: 'mes',
      key: 'mes',
      render: (mes, record) => mes || etiquetaMovimiento(record.tipo_movimiento),
    },
    {
      title: 'Movimiento',
      dataIndex: 'minutos_texto',
      key: 'minutos_texto',
    },
    {
      title: 'Motivo',
      dataIndex: 'motivo',
      key: 'motivo',
      ellipsis: true,
    },
    {
      title: 'Saldo',
      dataIndex: 'saldo_tras_movimiento',
      key: 'saldo_tras_movimiento',
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_alta',
      key: 'fecha_alta',
      render: (fecha) => (fecha ? dayjs(fecha).format('DD/MM/YYYY HH:mm') : '—'),
    },
  ];

  return (
    <div className="bolsa-horas-panel">
      <Card loading={loading} className="bolsa-horas-panel__card">
        <div className="bolsa-horas-panel__header">
          <div>
            <Text type="secondary">Saldo acumulado</Text>
            <Title level={3} className="bolsa-horas-panel__saldo">
              {saldo?.saldo_bolsa ?? '—'}
            </Title>
            <Text type="secondary">
              Positivo = horas a favor del personal · Negativo = horas pendientes de compensar
            </Text>
          </div>
          {puedeAjustar && (
            <Button type="primary" onClick={() => setModalAbierto(true)}>
              Ajuste manual
            </Button>
          )}
        </div>

        <Table
          className="bolsa-horas-panel__table"
          columns={columns}
          dataSource={movimientos}
          rowKey={(row) => `${row.id_movimiento}-${row.fecha_alta}`}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: 'Sin movimientos en la bolsa' }}
          size="small"
        />
      </Card>

      <Modal
        title="Ajuste manual de bolsa"
        open={modalAbierto}
        onCancel={() => setModalAbierto(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAjuste}
          initialValues={{ signo: '+', horas: 0, minutos: 0 }}
        >
          <Space wrap className="bolsa-horas-panel__ajuste-campos">
            <Form.Item label="Signo" name="signo" rules={[{ required: true }]}>
              <Select
                style={{ width: 140 }}
                options={[
                  { value: '+', label: 'Sumar (+)' },
                  { value: '-', label: 'Restar (−)' },
                ]}
              />
            </Form.Item>
            <Form.Item label="Horas" name="horas">
              <InputNumber min={0} max={999} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item label="Minutos" name="minutos">
              <InputNumber min={0} max={59} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item
            label="Motivo"
            name="motivo"
            rules={[{ required: true, message: 'Indica el motivo del ajuste' }]}
          >
            <TextArea rows={3} placeholder="Ej.: Compensación acordada con dirección" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={guardando} block>
            Registrar ajuste
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default BolsaHorasPanel;
