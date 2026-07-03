import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Segmented,
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

const calcularMensualDesdeAnual = (anual, pagas) => {
  const brutoAnual = Number(anual);
  const numPagas = Number(pagas);
  if (!Number.isFinite(brutoAnual) || brutoAnual <= 0 || ![12, 14].includes(numPagas)) {
    return null;
  }
  return Math.round((brutoAnual / numPagas) * 100) / 100;
};

const esRetribucionAnual = (row) => (
  row?.salario_bruto_anual != null && [12, 14].includes(Number(row.numero_pagas))
);

const textoVigente = (vigente) => {
  if (!vigente) return null;
  const mensual = formatearImporte(vigente.salario_bruto_mensual, vigente.moneda);
  if (esRetribucionAnual(vigente)) {
    const anual = formatearImporte(vigente.salario_bruto_anual, vigente.moneda);
    return `${anual}/año en ${vigente.numero_pagas} pagas → ${mensual}/mes`;
  }
  return `${mensual}/mes`;
};

const RetribucionPanel = ({ idUsuario, soloLectura = false }) => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const [vigente, setVigente] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [form] = Form.useForm();

  const modoRetribucion = Form.useWatch('modo_retribucion', form) || 'mensual';
  const salarioAnual = Form.useWatch('salario_bruto_anual', form);
  const numeroPagas = Form.useWatch('numero_pagas', form) || 12;

  const mensualCalculado = useMemo(
    () => (modoRetribucion === 'anual'
      ? calcularMensualDesdeAnual(salarioAnual, numeroPagas)
      : null),
    [modoRetribucion, salarioAnual, numeroPagas],
  );

  const aplicarValoresFormulario = useCallback((data) => {
    const vig = data.vigente;
    const esAnual = esRetribucionAnual(vig);
    form.setFieldsValue({
      modo_retribucion: esAnual ? 'anual' : 'mensual',
      salario_bruto_mensual: esAnual ? null : (vig?.salario_bruto_mensual ?? null),
      salario_bruto_anual: esAnual ? vig.salario_bruto_anual : null,
      numero_pagas: esAnual ? vig.numero_pagas : 12,
      fecha_desde: vig?.fecha_desde ? dayjs(vig.fecha_desde) : dayjs().startOf('month'),
      observaciones: vig?.observaciones ?? '',
    });
  }, [form]);

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    setLoading(true);
    try {
      const data = await getRetribucion(idUsuario);
      setSoportado(data.soportado !== false);
      setVigente(data.vigente || null);
      setHistorial(data.historial || []);
      aplicarValoresFormulario(data);
    } catch (error) {
      message.error(error.message || 'No se pudo cargar la retribución');
    } finally {
      setLoading(false);
    }
  }, [aplicarValoresFormulario, idUsuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleGuardar = async (values) => {
    setGuardando(true);
    try {
      const payload = {
        modo_retribucion: values.modo_retribucion || 'mensual',
        fecha_desde: values.fecha_desde?.format('YYYY-MM-DD'),
        observaciones: values.observaciones,
      };
      if (payload.modo_retribucion === 'anual') {
        payload.salario_bruto_anual = values.salario_bruto_anual;
        payload.numero_pagas = values.numero_pagas;
      } else {
        payload.salario_bruto_mensual = values.salario_bruto_mensual;
      }

      const data = await guardarRetribucion(idUsuario, payload);
      message.success('Salario base guardado');
      setSoportado(data.soportado !== false);
      setVigente(data.vigente || data.retribucion || null);
      setHistorial(data.historial || []);
      aplicarValoresFormulario(data);
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
      render: (_, row) => {
        const mensual = formatearImporte(row.salario_bruto_mensual, row.moneda);
        if (esRetribucionAnual(row)) {
          const anual = formatearImporte(row.salario_bruto_anual, row.moneda);
          return (
            <span>
              {mensual}
              <Text type="secondary" className="retribucion-panel__origen-anual">
                {' '}
                (
                {anual}
                /año ÷
                {' '}
                {row.numero_pagas}
                )
              </Text>
            </span>
          );
        }
        return mensual;
      },
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
          {soloLectura ? 'Retribución de referencia' : 'Salario base de referencia'}
        </Title>
        <Text type="secondary" className="retribucion-panel__hint">
          {soloLectura
            ? 'Importe base acordado en tu contrato. El cobro real de cada mes figura en tu nómina oficial (PDF).'
            : 'Se usa para la previsión de coste bruto. Puedes introducir el bruto mensual o el anual (12 o 14 pagas); Timecor calcula el mensual de referencia.'}
        </Text>

        {vigente && (
          <div className="retribucion-panel__vigente">
            <Text strong>Vigente: </Text>
            <Text>
              {textoVigente(vigente)}
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
          initialValues={{ modo_retribucion: 'mensual', numero_pagas: 12 }}
        >
          <Form.Item label="Tipo de entrada" name="modo_retribucion">
            <Radio.Group>
              <Radio.Button value="mensual">Mensual</Radio.Button>
              <Radio.Button value="anual">Anual (12 o 14 pagas)</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {modoRetribucion === 'mensual' ? (
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
          ) : (
            <>
              <div className="retribucion-panel__form-grid retribucion-panel__form-grid--anual">
                <Form.Item
                  label="Salario bruto anual (€)"
                  name="salario_bruto_anual"
                  rules={[
                    { required: true, message: 'Indica el salario bruto anual' },
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

                <Form.Item label="Número de pagas" name="numero_pagas">
                  <Segmented options={[
                    { label: '12 pagas', value: 12 },
                    { label: '14 pagas', value: 14 },
                  ]}
                  />
                </Form.Item>
              </div>

              {mensualCalculado != null && (
                <div className="retribucion-panel__preview">
                  <Text type="secondary">
                    Mensual de referencia calculado:
                    {' '}
                    <Text strong>{formatearImporte(mensualCalculado)}</Text>
                    {' '}
                    (
                    {formatearImporte(salarioAnual)}
                    {' '}
                    ÷
                    {' '}
                    {numeroPagas}
                    )
                  </Text>
                </div>
              )}

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
            </>
          )}

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
