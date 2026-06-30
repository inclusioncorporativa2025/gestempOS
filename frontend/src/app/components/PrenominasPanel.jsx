import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { EyeOutlined, LockOutlined, ReloadOutlined } from '@ant-design/icons';
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

const etiquetaEstado = (estado) => {
  const valor = String(estado || '').toLowerCase();
  if (valor === 'cerrada') return <Tag color="success">Cerrada</Tag>;
  if (valor === 'revisada') return <Tag color="processing">Revisada</Tag>;
  return <Tag>Borrador</Tag>;
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
      message.error(error.message || 'No se pudieron cargar las prenóminas');
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
      message.success('Prenómina generada correctamente');
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo generar la prenómina');
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
      message.success('Prenómina cerrada');
      await cargar();
      if (detalleOpen && detalle?.prenomina?.id_prenomina === idPrenomina) {
        await abrirDetalle(idPrenomina);
      }
    } catch (error) {
      message.error(error.message || 'No se pudo cerrar la prenómina');
    }
  };

  if (!soportado) {
    return (
      <Card>
        <Text type="secondary">
          El módulo de prenómina no está disponible. Ejecute el script SQL
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
      render: etiquetaEstado,
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
              title="¿Cerrar esta prenómina?"
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
    { title: 'Empleado', dataIndex: 'nombre', key: 'nombre' },
    { title: 'DNI', dataIndex: 'dni', key: 'dni' },
    {
      title: 'Salario base',
      dataIndex: 'salario_base',
      key: 'salario_base',
      render: formatearEuros,
    },
    {
      title: 'Extras',
      dataIndex: 'importe_extras',
      key: 'importe_extras',
      render: formatearEuros,
    },
    {
      title: 'Complementarias',
      dataIndex: 'importe_complementarias',
      key: 'importe_complementarias',
      render: formatearEuros,
    },
    {
      title: 'Total bruto est.',
      dataIndex: 'total_bruto_estimado',
      key: 'total_bruto_estimado',
      render: (v) => <Text strong>{formatearEuros(v)}</Text>,
    },
    {
      title: 'Días trab.',
      dataIndex: 'dias_trabajados',
      key: 'dias_trabajados',
      render: (v) => (v != null ? v : '—'),
    },
    {
      title: 'Ausencias',
      dataIndex: 'dias_ausencia',
      key: 'dias_ausencia',
      render: (v) => (v != null ? v : '—'),
    },
    {
      title: 'Vacaciones',
      dataIndex: 'dias_vacaciones',
      key: 'dias_vacaciones',
      render: (v) => (v != null ? v : '—'),
    },
  ];

  return (
    <div className="prenominas-panel">
      <Card className="prenominas-panel__card">
        <Text type="secondary" className="prenominas-panel__hint">
          La prenómina se calcula automáticamente a partir de fichajes, ausencias
          y la retribución configurada en cada empleado.
        </Text>
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
            Generar / recalcular prenómina
          </Button>
        </div>
      </Card>

      <Card title="Prenóminas del periodo" loading={loading}>
        <Table
          columns={columnas}
          dataSource={prenominas}
          rowKey={(row) => `${row.empresa_id}-${row.id_prenomina}`}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Aún no hay prenóminas generadas' }}
          scroll={{ x: 640 }}
        />
      </Card>

      <Modal
        title={
          detalle?.prenomina
            ? `Prenómina ${etiquetaPeriodo(detalle.prenomina.periodo_mes, detalle.prenomina.periodo_anio)}`
            : 'Detalle de prenómina'
        }
        open={detalleOpen}
        onCancel={() => setDetalleOpen(false)}
        footer={null}
        width={960}
      >
        {detalleLoading ? (
          <Text type="secondary">Cargando...</Text>
        ) : (
          <>
            <div className="prenominas-panel__resumen">
              <Text>
                Estado: {etiquetaEstado(detalle?.prenomina?.estado)}
              </Text>
              <Text strong>
                Total bruto estimado: {formatearEuros(detalle?.total_bruto)}
              </Text>
              <Text type="secondary">
                {detalle?.total_empleados || 0} empleado(s)
              </Text>
            </div>
            <Table
              columns={columnasEmpleados}
              dataSource={detalle?.empleados || []}
              rowKey={(row) => row.id_prenomina_empleado}
              pagination={{ pageSize: 8 }}
              size="small"
              scroll={{ x: 900 }}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default PrenominasPanel;
