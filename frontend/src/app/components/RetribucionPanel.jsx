import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import {
  getRetribucion,
  guardarRetribucion,
} from '../../features/nominas/nominasService';
import './RetribucionPanel.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

const formatearImporte = (valor, moneda = 'EUR') => {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: moneda || 'EUR',
  }).format(n);
};

const formatearFecha = (fecha) => (
  fecha && dayjs(fecha).isValid() ? dayjs(fecha).format('DD/MM/YYYY') : '—'
);

const RetribucionPanel = ({ idUsuario, soloLectura = false }) => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const [vigente, setVigente] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    setLoading(true);
    try {
      const data = await getRetribucion(idUsuario);
      setSoportado(data.soportado !== false);
      setVigente(data.vigente || null);
      setHistorial(data.historial || []);
      form.setFieldsValue({
        salario_bruto_mensual: data.vigente?.salario_bruto_mensual ?? null,
        fecha_desde: data.vigente?.fecha_desde
          ? dayjs(data.vigente.fecha_desde)
          : dayjs().startOf('month'),
        observaciones: data.vigente?.observaciones ?? '',
      });
    } catch (error) {
      message.error(error.message || 'No se pudo cargar la retribución');
    } finally {
      setLoading(false);
    }
  }, [form, idUsuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleGuardar = async (values) => {
    setGuardando(true);
    try {
      const data = await guardarRetribucion(idUsuario, {
        salario_bruto_mensual: values.salario_bruto_mensual,
        fecha_desde: values.fecha_desde?.format('YYYY-MM-DD'),
        observaciones: values.observaciones,
      });
      message.success('Salario base guardado');
      setSoportado(data.soportado !== false);
      setVigente(data.vigente || data.retribucion || null);
      setHistorial(data.historial || []);
      form.setFieldsValue({
        salario_bruto_mensual: data.vigente?.salario_bruto_mensual ?? values.salario_bruto_mensual,
        fecha_desde: data.vigente?.fecha_desde
          ? dayjs(data.vigente.fecha_desde)
          : values.fecha_desde,
        observaciones: data.vigente?.observaciones ?? values.observaciones,
      });
    } catch (error) {
      message.error(error.message || 'No se pudo guardar el salario');
    } finally {
      setGuardando(false);
    }
  };

  if (!soportado) {
    return (
      <Card className="retribucion-panel">
        <Text type="secondary">
          El módulo de retribución no está disponible. Ejecute el script SQL
          {' '}
          <code>usuarios_retribucion.sql</code>
          {' '}
          en el servidor.
        </Text>
      </Card>
    );
  }

  const columnasHistorial = [
    {
      title: 'Desde',
      dataIndex: 'fecha_desde',
      key: 'fecha_desde',
      render: formatearFecha,
    },
    {
      title: 'Hasta',
      dataIndex: 'fecha_hasta',
      key: 'fecha_hasta',
      render: (valor) => (valor ? formatearFecha(valor) : 'Vigente'),
    },
    {
      title: 'Salario bruto / mes',
      key: 'salario',
      render: (_, row) => formatearImporte(row.salario_bruto_mensual, row.moneda),
    },
    {
      title: 'Observaciones',
      dataIndex: 'observaciones',
      key: 'observaciones',
      render: (text) => text || '—',
    },
  ];

  return (
    <div className="retribucion-panel">
      <Card loading={loading} className="retribucion-panel__card">
        <Title level={5} className="retribucion-panel__title">
          {soloLectura ? 'Retribución de referencia' : 'Salario base mensual'}
        </Title>
        <Text type="secondary" className="retribucion-panel__hint">
          {soloLectura
            ? 'Importe base acordado en tu contrato. El cobro real de cada mes figura en tu nómina oficial (PDF).'
            : 'Se usa para la previsión de coste bruto. Si cambias el importe con una nueva fecha de efecto, el salario anterior queda en el histórico.'}
        </Text>

        {vigente && (
          <div className="retribucion-panel__vigente">
            <Text strong>Vigente: </Text>
            <Text>
              {formatearImporte(vigente.salario_bruto_mensual, vigente.moneda)}
              {' '}
              desde
              {' '}
              {formatearFecha(vigente.fecha_desde)}
            </Text>
          </div>
        )}

        {!soloLectura && (
        <Form
          form={form}
          layout="vertical"
          className="retribucion-panel__form"
          onFinish={handleGuardar}
        >
          <div className="retribucion-panel__form-grid">
            <Form.Item
              label="Salario bruto mensual (€)"
              name="salario_bruto_mensual"
              rules={[
                { required: true, message: 'Indica el salario bruto mensual' },
              ]}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                className="retribucion-panel__input-number"
                placeholder="0,00"
              />
            </Form.Item>

            <Form.Item
              label="Fecha de efecto"
              name="fecha_desde"
              rules={[{ required: true, message: 'Indica la fecha de efecto' }]}
            >
              <DatePicker
                format="DD/MM/YYYY"
                className="retribucion-panel__date"
              />
            </Form.Item>
          </div>

          <Form.Item label="Observaciones" name="observaciones">
            <TextArea rows={2} maxLength={500} showCount placeholder="Opcional" />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={guardando}>
              Guardar salario
            </Button>
          </Space>
        </Form>
        )}
      </Card>

      {!soloLectura && (
      <Card
        title="Histórico de salarios"
        className="retribucion-panel__card retribucion-panel__historial"
        loading={loading}
      >
        <Table
          columns={columnasHistorial}
          dataSource={historial}
          rowKey={(row) => `${row.empresa_id}-${row.id_retribucion}`}
          pagination={{ pageSize: 6 }}
          locale={{ emptyText: 'Sin registros de salario' }}
          scroll={{ x: 640 }}
        />
      </Card>
      )}
    </div>
  );
};

export default RetribucionPanel;
