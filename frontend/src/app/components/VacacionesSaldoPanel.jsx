import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Table, Typography, Modal, Form, Input, InputNumber, Button, message, Select, Space,
} from 'antd';
import dayjs from 'dayjs';
import {
  getSaldoVacaciones,
  guardarCupoVacaciones,
  ajustarSaldoVacaciones,
} from '../../features/vacaciones/vacacionesService';
import './VacacionesSaldoPanel.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

const etiquetaMovimiento = (tipo) => {
  if (tipo === 'consumo') return 'Consumo';
  if (tipo === 'anulacion_consumo') return 'Anulación';
  if (tipo === 'ajuste_manual') return 'Ajuste manual';
  return tipo || '—';
};

const etiquetaFraccion = (fraccion) => {
  if (fraccion === 'manana') return 'Mañana';
  if (fraccion === 'tarde') return 'Tarde';
  if (fraccion === 'completo') return 'Día completo';
  return '—';
};

const VacacionesSaldoPanel = ({
  idUsuario,
  puedeGestionar = false,
}) => {
  const anioActual = dayjs().year();
  const [anio, setAnio] = useState(anioActual);
  const [loading, setLoading] = useState(true);
  const [saldo, setSaldo] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [soportado, setSoportado] = useState(true);
  const [modalCupo, setModalCupo] = useState(false);
  const [modalAjuste, setModalAjuste] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formCupo] = Form.useForm();
  const [formAjuste] = Form.useForm();

  const opcionesAnio = Array.from({ length: 5 }, (_, i) => {
    const y = anioActual - 2 + i;
    return { value: y, label: String(y) };
  });

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    setLoading(true);
    try {
      const data = await getSaldoVacaciones(idUsuario, anio);
      setSoportado(data.soportado !== false);
      setSaldo(data.anio_actual || null);
      setMovimientos(data.movimientos || []);
    } catch (error) {
      message.error(error.message || 'No se pudo cargar el saldo de vacaciones');
    } finally {
      setLoading(false);
    }
  }, [idUsuario, anio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirCupo = () => {
    formCupo.setFieldsValue({
      anio,
      dias_asignados: saldo?.dias_asignados ?? 0,
      dias_arrastre_entrada: saldo?.dias_arrastre_entrada ?? 0,
      dias_arrastre_salida: saldo?.dias_arrastre_salida ?? 0,
      observaciones: saldo?.observaciones ?? '',
    });
    setModalCupo(true);
  };

  const handleGuardarCupo = async (values) => {
    setGuardando(true);
    try {
      await guardarCupoVacaciones(idUsuario, values);
      message.success('Cupo de vacaciones guardado');
      setModalCupo(false);
      formCupo.resetFields();
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo guardar el cupo');
    } finally {
      setGuardando(false);
    }
  };

  const handleAjuste = async (values) => {
    setGuardando(true);
    try {
      const signo = values.signo === '-' ? -1 : 1;
      const dias = signo * Math.abs(Number(values.dias) || 0);
      await ajustarSaldoVacaciones(idUsuario, {
        anio: values.anio,
        dias,
        motivo: values.motivo,
      });
      message.success('Ajuste registrado');
      setModalAjuste(false);
      formAjuste.resetFields();
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo registrar el ajuste');
    } finally {
      setGuardando(false);
    }
  };

  const columns = [
    {
      title: 'Año',
      dataIndex: 'anio',
      key: 'anio',
      width: 72,
    },
    {
      title: 'Días',
      dataIndex: 'dias',
      key: 'dias',
      width: 72,
      render: (d) => (d > 0 ? `+${d}` : d),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo_movimiento',
      key: 'tipo_movimiento',
      render: etiquetaMovimiento,
    },
    {
      title: 'Fracción',
      dataIndex: 'fraccion_dia',
      key: 'fraccion_dia',
      render: etiquetaFraccion,
    },
    {
      title: 'Periodo',
      key: 'periodo',
      render: (_, r) => {
        if (r.fecha_disfrute && r.fecha_disfrute_hasta && r.fecha_disfrute !== r.fecha_disfrute_hasta) {
          return `${dayjs(r.fecha_disfrute).format('DD/MM/YY')} – ${dayjs(r.fecha_disfrute_hasta).format('DD/MM/YY')}`;
        }
        if (r.fecha_disfrute) return dayjs(r.fecha_disfrute).format('DD/MM/YYYY');
        return '—';
      },
    },
    {
      title: 'Motivo',
      dataIndex: 'motivo',
      key: 'motivo',
      ellipsis: true,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_alta',
      key: 'fecha_alta',
      width: 130,
      render: (fecha) => (fecha ? dayjs(fecha).format('DD/MM/YYYY HH:mm') : '—'),
    },
  ];

  if (!soportado) {
    return (
      <Card className="vac-saldo-panel__card">
        <Text type="secondary">El módulo de saldo de vacaciones no está disponible.</Text>
      </Card>
    );
  }

  return (
    <div className="vac-saldo-panel">
      <Card loading={loading} className="vac-saldo-panel__card">
        <div className="vac-saldo-panel__header">
          <div>
            <Space wrap align="center" className="vac-saldo-panel__anio-row">
              <Text type="secondary">Año</Text>
              <Select
                value={anio}
                onChange={setAnio}
                options={opcionesAnio}
                style={{ width: 100 }}
              />
            </Space>
            <Text type="secondary">Días disponibles</Text>
            <Title level={3} className="vac-saldo-panel__saldo">
              {saldo?.dias_disponibles != null ? `${saldo.dias_disponibles} días` : '—'}
            </Title>
            <div className="vac-saldo-panel__resumen">
              <Text type="secondary">
                Asignados: {saldo?.dias_asignados ?? 0}
                {' · '}
                Arrastre: {saldo?.dias_arrastre_entrada ?? 0}
                {' · '}
                Consumidos: {saldo?.dias_consumidos ?? 0}
              </Text>
            </div>
          </div>
          {puedeGestionar && (
            <Space wrap>
              <Button onClick={abrirCupo}>Editar cupo</Button>
              <Button type="primary" onClick={() => {
                formAjuste.setFieldsValue({ anio, signo: '+', dias: 1 });
                setModalAjuste(true);
              }}
              >
                Ajuste manual
              </Button>
            </Space>
          )}
        </div>

        <Table
          className="vac-saldo-panel__table"
          columns={columns}
          dataSource={movimientos}
          rowKey={(row) => `${row.id_movimiento}-${row.fecha_alta}`}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: 'Sin movimientos de vacaciones' }}
          size="small"
        />
      </Card>

      <Modal
        title="Cupo anual de vacaciones"
        open={modalCupo}
        onCancel={() => setModalCupo(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={formCupo} layout="vertical" onFinish={handleGuardarCupo}>
          <Form.Item name="anio" label="Año" rules={[{ required: true }]}>
            <InputNumber min={2000} max={2100} className="vac-saldo-panel__full" />
          </Form.Item>
          <Form.Item name="dias_asignados" label="Días asignados del año">
            <InputNumber min={0} max={365} step={0.5} className="vac-saldo-panel__full" />
          </Form.Item>
          <Form.Item name="dias_arrastre_entrada" label="Días arrastrados (años anteriores)">
            <InputNumber min={0} max={365} step={0.5} className="vac-saldo-panel__full" />
          </Form.Item>
          <Form.Item name="dias_arrastre_salida" label="Días que pasan al año siguiente">
            <InputNumber min={0} max={365} step={0.5} className="vac-saldo-panel__full" />
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones">
            <TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={guardando} block>
            Guardar cupo
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Ajuste manual de vacaciones"
        open={modalAjuste}
        onCancel={() => setModalAjuste(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={formAjuste}
          layout="vertical"
          onFinish={handleAjuste}
          initialValues={{ signo: '+', dias: 1 }}
        >
          <Form.Item name="anio" label="Año" rules={[{ required: true }]}>
            <InputNumber min={2000} max={2100} className="vac-saldo-panel__full" />
          </Form.Item>
          <Space wrap>
            <Form.Item label="Signo" name="signo" rules={[{ required: true }]}>
              <Select
                style={{ width: 140 }}
                options={[
                  { value: '+', label: 'Sumar (+)' },
                  { value: '-', label: 'Restar (−)' },
                ]}
              />
            </Form.Item>
            <Form.Item label="Días" name="dias" rules={[{ required: true }]}>
              <InputNumber min={0.5} max={365} step={0.5} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item
            label="Motivo"
            name="motivo"
            rules={[{ required: true, message: 'Indica el motivo del ajuste' }]}
          >
            <TextArea rows={3} placeholder="Ej.: Regularización de arrastre 2024" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={guardando} block>
            Registrar ajuste
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default VacacionesSaldoPanel;
