import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, EyeOutlined, LockOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  cerrarPrenomina,
  detallePrenomina,
  generarPrenomina,
  listarPrenominas,
} from '../../features/nominas/nominasService';
import './PrenominasPanel.css';

const { Text } = Typography;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const etiquetaPeriodo = (mes, anio) => `${MESES[mes - 1] || mes} ${anio}`;

const formatearEuros = (valor) => (
  Number(valor || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
);

const etiquetaEstadoCabecera = (estado) => {
  const valor = String(estado || '').toLowerCase();
  if (valor === 'cerrada') return <Tag color="success">Cerrada</Tag>;
  if (valor === 'revisada') return <Tag color="processing">Revisada</Tag>;
  return <Tag>Borrador</Tag>;
};

const etiquetaEstadoEmpleado = (estado) => {
  const valor = String(estado || '').toLowerCase();
  if (valor === 'ok') return <Tag color="success">OK</Tag>;
  if (valor === 'sin_salario') return <Tag color="warning">Sin salario</Tag>;
  if (valor === 'sin_jornada') return <Tag color="orange">Sin jornada</Tag>;
  if (valor === 'incidencias') return <Tag color="error">Incidencias</Tag>;
  return <Tag>{estado || '—'}</Tag>;
};

const minutosAHoras = (minutos) => {
  const m = Number(minutos);
  if (!Number.isFinite(m) || m <= 0) return '0 h';
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  if (h > 0 && min > 0) return `${h} h ${min} min`;
  if (h > 0) return `${h} h`;
  return `${min} min`;
};

const exportarCsv = (detalle) => {
  if (!detalle?.empleados?.length) {
    message.warning('No hay datos para exportar');
    return;
  }

  const periodo = detalle.prenomina
    ? `${detalle.prenomina.periodo_anio}-${String(detalle.prenomina.periodo_mes).padStart(2, '0')}`
    : 'periodo';

  const cabecera = [
    'Empleado',
    'DNI',
    'Estado',
    'Días alta mes',
    'Horas trabajadas',
    'Horas ordinarias',
    'Horas extra',
    'Horas complementarias',
    'Salario base est.',
    'Extras est.',
    'Complementarias est.',
    'Coste bruto est.',
    'Días ausencia',
    'Días vacaciones',
  ];

  const filas = detalle.empleados.map((e) => {
    const horas = e.snapshot_json?.horas || {};
    return [
      e.nombre || '',
      e.dni || '',
      e.estado || '',
      e.dias_trabajados ?? '',
      minutosAHoras(horas.horas_trabajadas_min),
      minutosAHoras(horas.horas_ordinarias_min),
      minutosAHoras(horas.horas_extra_min),
      minutosAHoras(horas.horas_complementaria_min),
      Number(e.salario_base || 0).toFixed(2),
      Number(e.importe_extras || 0).toFixed(2),
      Number(e.importe_complementarias || 0).toFixed(2),
      Number(e.total_bruto_estimado || 0).toFixed(2),
      e.dias_ausencia ?? '',
      e.dias_vacaciones ?? '',
    ];
  });

  const escapar = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const contenido = [cabecera, ...filas]
    .map((fila) => fila.map(escapar).join(';'))
    .join('\n');

  const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `coste-bruto-estimado-${periodo}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const DetalleEmpleadoExpandido = ({ record }) => {
  const snapshot = record.snapshot_json || {};
  const horas = snapshot.horas || {};
  const alertas = snapshot.alertas || [];
  const lineas = record.lineas || [];

  return (
    <div className="prenominas-panel__expandido">
      {alertas.length > 0 && (
        <Alert
          type="warning"
          showIcon
          className="prenominas-panel__alertas"
          message="Incidencias detectadas"
          description={(
            <ul className="prenominas-panel__alertas-lista">
              {alertas.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
        />
      )}

      <div className="prenominas-panel__expandido-grid">
        <div>
          <Text strong>Resumen de horas</Text>
          <ul className="prenominas-panel__horas-lista">
            <li>Trabajadas: {minutosAHoras(horas.horas_trabajadas_min)}</li>
            <li>Ordinarias del mes: {horas.horasMensuales || minutosAHoras(horas.horas_ordinarias_min)}</li>
            <li>Extra: {minutosAHoras(horas.horas_extra_min)}</li>
            <li>Complementarias: {minutosAHoras(horas.horas_complementaria_min)}</li>
            {horas.desglose && <li>{horas.desglose}</li>}
          </ul>
        </div>
        {snapshot.retribucion?.salario_bruto_mensual != null && (
          <div>
            <Text strong>Retribución de referencia</Text>
            <p className="prenominas-panel__ref-salario">
              {formatearEuros(snapshot.retribucion.salario_bruto_mensual)} / mes
              {snapshot.prorrateo?.factor != null && (
                <Text type="secondary">
                  {' '}
                  (prorrateo {Math.round(snapshot.prorrateo.factor * 100)} %)
                </Text>
              )}
            </p>
          </div>
        )}
      </div>

      {lineas.length > 0 && (
        <Table
          className="prenominas-panel__lineas-table"
          size="small"
          pagination={false}
          rowKey={(row, idx) => `${row.codigo_concepto}-${idx}`}
          dataSource={lineas}
          columns={[
            { title: 'Concepto', dataIndex: 'descripcion', key: 'descripcion' },
            {
              title: 'Tipo',
              dataIndex: 'tipo',
              key: 'tipo',
              width: 100,
              render: (t) => String(t || 'devengo'),
            },
            {
              title: 'Cantidad',
              key: 'cantidad',
              width: 90,
              render: (_, row) => (
                row.cantidad != null ? `${row.cantidad} ${row.unidad || ''}`.trim() : '—'
              ),
            },
            {
              title: 'Importe',
              dataIndex: 'importe',
              key: 'importe',
              width: 110,
              render: formatearEuros,
            },
          ]}
        />
      )}
    </div>
  );
};

const PrenominasPanel = () => {
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const [prenominas, setPrenominas] = useState([]);
  const [periodo, setPeriodo] = useState(dayjs().subtract(1, 'month').startOf('month'));
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarPrenominas();
      setSoportado(data.soportado !== false);
      setPrenominas(data.prenominas || []);
    } catch (error) {
      message.error(error.message || 'No se pudieron cargar las previsiones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleGenerar = async () => {
    setGenerando(true);
    try {
      await generarPrenomina(periodo.month() + 1, periodo.year());
      message.success('Previsión de coste generada correctamente');
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo generar la previsión');
    } finally {
      setGenerando(false);
    }
  };

  const abrirDetalle = async (idPrenomina) => {
    setDetalleOpen(true);
    setDetalleLoading(true);
    setDetalle(null);
    try {
      const data = await detallePrenomina(idPrenomina);
      setDetalle(data);
    } catch (error) {
      message.error(error.message || 'No se pudo cargar el detalle');
      setDetalleOpen(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  const handleCerrar = async (idPrenomina) => {
    try {
      await cerrarPrenomina(idPrenomina);
      message.success('Previsión cerrada');
      await cargar();
      if (detalleOpen && detalle?.prenomina?.id_prenomina === idPrenomina) {
        await abrirDetalle(idPrenomina);
      }
    } catch (error) {
      message.error(error.message || 'No se pudo cerrar la previsión');
    }
  };

  if (!soportado) {
    return (
      <Card>
        <Text type="secondary">
          El módulo no está disponible. Ejecute el script SQL
          {' '}
          <code>prenominas.sql</code>
          {' '}
          en el servidor.
        </Text>
      </Card>
    );
  }

  const columnas = [
    {
      title: 'Periodo',
      key: 'periodo',
      render: (_, row) => etiquetaPeriodo(row.periodo_mes, row.periodo_anio),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: etiquetaEstadoCabecera,
    },
    {
      title: 'Generada',
      dataIndex: 'fecha_generacion',
      key: 'fecha_generacion',
      render: (fecha) => (
        fecha && dayjs(fecha).isValid() ? dayjs(fecha).format('DD/MM/YYYY HH:mm') : '—'
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, row) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => abrirDetalle(row.id_prenomina)}
          >
            Ver detalle
          </Button>
          {row.estado !== 'cerrada' && (
            <Popconfirm
              title="¿Cerrar esta previsión?"
              description="No podrá recalcularse hasta que se vuelva a abrir manualmente en BD."
              onConfirm={() => handleCerrar(row.id_prenomina)}
              okText="Cerrar"
              cancelText="Cancelar"
            >
              <Button type="link" icon={<LockOutlined />}>
                Cerrar
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const columnasEmpleados = [
    { title: 'Empleado', dataIndex: 'nombre', key: 'nombre', width: 160 },
    { title: 'DNI', dataIndex: 'dni', key: 'dni', width: 100 },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      render: etiquetaEstadoEmpleado,
    },
    {
      title: 'Salario base est.',
      dataIndex: 'salario_base',
      key: 'salario_base',
      width: 120,
      render: formatearEuros,
    },
    {
      title: 'Extras est.',
      dataIndex: 'importe_extras',
      key: 'importe_extras',
      width: 100,
      render: formatearEuros,
    },
    {
      title: 'Compl. est.',
      dataIndex: 'importe_complementarias',
      key: 'importe_complementarias',
      width: 100,
      render: formatearEuros,
    },
    {
      title: 'Coste bruto est.',
      dataIndex: 'total_bruto_estimado',
      key: 'total_bruto_estimado',
      width: 120,
      render: (v) => <Text strong>{formatearEuros(v)}</Text>,
    },
    {
      title: 'Días alta',
      dataIndex: 'dias_trabajados',
      key: 'dias_trabajados',
      width: 80,
      render: (v) => (v != null ? v : '—'),
    },
    {
      title: 'Ausencias',
      dataIndex: 'dias_ausencia',
      key: 'dias_ausencia',
      width: 80,
      render: (v) => (v != null ? v : '—'),
    },
    {
      title: 'Vacaciones',
      dataIndex: 'dias_vacaciones',
      key: 'dias_vacaciones',
      width: 90,
      render: (v) => (v != null ? v : '—'),
    },
  ];

  return (
    <div className="prenominas-panel">
      <Card className="prenominas-panel__card">
        <Alert
          type="info"
          showIcon
          className="prenominas-panel__disclaimer"
          message="Previsión de coste laboral bruto (empresa)"
          description="Estimación interna a partir de retribución, fichajes y ausencias. No incluye IRPF, Seguridad Social ni líquido a percibir. La nómina oficial es el PDF en «Nóminas definitivas»."
        />
        <div className="prenominas-panel__generar">
          <div>
            <Text strong>Periodo a calcular</Text>
            <DatePicker
              picker="month"
              value={periodo}
              onChange={(value) => value && setPeriodo(value)}
              format="MMMM YYYY"
              className="prenominas-panel__periodo"
            />
          </div>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={generando}
            onClick={handleGenerar}
          >
            Generar / recalcular previsión
          </Button>
        </div>
      </Card>

      <Card title="Previsiones de coste por periodo" loading={loading}>
        <Table
          columns={columnas}
          dataSource={prenominas}
          rowKey={(row) => `${row.empresa_id}-${row.id_prenomina}`}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Aún no hay previsiones generadas' }}
          scroll={{ x: 640 }}
        />
      </Card>

      <Modal
        title={
          detalle?.prenomina
            ? `Coste bruto estimado — ${etiquetaPeriodo(detalle.prenomina.periodo_mes, detalle.prenomina.periodo_anio)}`
            : 'Detalle de previsión'
        }
        open={detalleOpen}
        onCancel={() => setDetalleOpen(false)}
        footer={null}
        width={1080}
      >
        {detalleLoading ? (
          <Text type="secondary">Cargando...</Text>
        ) : (
          <>
            <div className="prenominas-panel__resumen">
              <Text>
                Estado: {etiquetaEstadoCabecera(detalle?.prenomina?.estado)}
              </Text>
              <Text strong>
                Total coste bruto estimado: {formatearEuros(detalle?.total_bruto)}
              </Text>
              <Text type="secondary">
                {detalle?.total_empleados || 0} empleado(s)
              </Text>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => exportarCsv(detalle)}
                disabled={!detalle?.empleados?.length}
              >
                Exportar CSV (gestoría)
              </Button>
            </div>
            <Table
              columns={columnasEmpleados}
              dataSource={detalle?.empleados || []}
              rowKey={(row) => row.id_prenomina_empleado}
              pagination={{ pageSize: 8 }}
              size="small"
              scroll={{ x: 1100 }}
              expandable={{
                expandedRowRender: (record) => <DetalleEmpleadoExpandido record={record} />,
                rowExpandable: () => true,
              }}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default PrenominasPanel;
