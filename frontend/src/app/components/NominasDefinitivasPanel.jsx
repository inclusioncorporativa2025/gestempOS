import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  InboxOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { getUsuariosEmpresa } from '../../features/user/usuarioService';
import {
  descargarNomina,
  eliminarNomina,
  listarNominas,
  subirNomina,
} from '../../features/nominas/nominasService';
import { propsInputImporteEs } from '../../utils/importes';

const { Text, Title } = Typography;
const { Dragger } = Upload;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const etiquetaPeriodo = (mes, anio) => `${MESES[mes - 1] || mes} ${anio}`;

const formatearEuros = (valor) => {
  if (valor == null) return '—';
  return Number(valor).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
};

const formatearFecha = (fecha) => (
  fecha && dayjs(fecha).isValid() ? dayjs(fecha).format('DD/MM/YYYY HH:mm') : '—'
);

const NominasDefinitivasPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const [documentos, setDocumentos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [periodo, setPeriodo] = useState(dayjs().subtract(1, 'month').startOf('month'));
  const [archivoPendiente, setArchivoPendiente] = useState(null);
  const [importeBruto, setImporteBruto] = useState(null);
  const [importeDeducciones, setImporteDeducciones] = useState(null);
  const [importeLiquido, setImporteLiquido] = useState(null);

  const mapaEmpleados = useMemo(
    () => new Map(empleados.map((e) => [e.id_usuario, e])),
    [empleados],
  );

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [data, usuarios] = await Promise.all([
        listarNominas(),
        getUsuariosEmpresa(),
      ]);
      setSoportado(data.soportado !== false);
      setDocumentos(data.documentos || []);
      setEmpleados((usuarios || []).filter((u) => Number(u.tipo_usuario) === 5));
    } catch (error) {
      message.error(error.message || 'No se pudieron cargar las nóminas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSubir = async () => {
    if (!empleadoSeleccionado) {
      message.warning('Selecciona un empleado');
      return;
    }
    if (!archivoPendiente) {
      message.warning('Selecciona un PDF antes de subir');
      return;
    }

    setSubiendo(true);
    try {
      await subirNomina({
        idUsuario: empleadoSeleccionado,
        periodoMes: periodo.month() + 1,
        periodoAnio: periodo.year(),
        archivo: archivoPendiente,
        importe_bruto: importeBruto,
        importe_deducciones: importeDeducciones,
        importe_liquido: importeLiquido,
      });
      message.success('Nómina subida correctamente');
      setArchivoPendiente(null);
      setImporteBruto(null);
      setImporteDeducciones(null);
      setImporteLiquido(null);
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo subir la nómina');
    } finally {
      setSubiendo(false);
    }
  };

  const handleDescargar = async (doc) => {
    try {
      await descargarNomina(doc.id_documento, doc.nombre_archivo);
    } catch (error) {
      message.error(error.message || 'No se pudo descargar la nómina');
    }
  };

  const handleEliminar = async (idDocumento) => {
    try {
      await eliminarNomina(idDocumento);
      message.success('Nómina eliminada');
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo eliminar la nómina');
    }
  };

  if (!soportado) {
    return (
      <Card>
        <Text type="secondary">
          El módulo de nóminas no está disponible. Ejecute el script SQL
          {' '}
          <code>usuarios_documentos_nomina.sql</code>
          {' '}
          en el servidor.
        </Text>
      </Card>
    );
  }

  const columnas = [
    {
      title: 'Empleado',
      key: 'empleado',
      render: (_, row) => mapaEmpleados.get(row.id_usuario)?.nombre || `ID ${row.id_usuario}`,
    },
    {
      title: 'Periodo',
      key: 'periodo',
      render: (_, row) => etiquetaPeriodo(row.periodo_mes, row.periodo_anio),
    },
    {
      title: 'Líquido',
      dataIndex: 'importe_liquido',
      key: 'importe_liquido',
      render: formatearEuros,
    },
    {
      title: 'Bruto',
      dataIndex: 'importe_bruto',
      key: 'importe_bruto',
      render: formatearEuros,
    },
    {
      title: 'Archivo',
      dataIndex: 'nombre_archivo',
      key: 'nombre_archivo',
    },
    {
      title: 'Publicada',
      dataIndex: 'fecha_publicacion',
      key: 'fecha_publicacion',
      render: formatearFecha,
    },
    {
      title: 'Vista empleado',
      dataIndex: 'visto_en',
      key: 'visto_en',
      render: (valor) => (valor ? formatearFecha(valor) : 'Pendiente'),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, row) => (
        <Space>
          <Button
            type="link"
            icon={<UserOutlined />}
            onClick={() => navigate(`${APP_ROUTES.users}/${row.id_usuario}`)}
          >
            Ficha
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDescargar(row)}
          >
            Descargar
          </Button>
          <Popconfirm
            title="¿Eliminar esta nómina?"
            description="Se borrará el PDF del servidor."
            onConfirm={() => handleEliminar(row.id_documento)}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="nominas-def-panel">
      <Card className="nominas-def-panel__card">
        <Title level={5} className="nominas-def-panel__title">
          Subir nómina definitiva (PDF)
        </Title>
        <Text type="secondary" className="nominas-def-panel__hint">
          Asigna el PDF de la nómina cerrada a cada empleado. Opcionalmente registra bruto,
          deducciones y líquido según la nómina oficial (para consulta del empleado).
        </Text>

        <div className="nominas-def-panel__upload-row">
          <div>
            <Text strong>Empleado</Text>
            <Select
              showSearch
              placeholder="Selecciona empleado"
              value={empleadoSeleccionado}
              onChange={setEmpleadoSeleccionado}
              optionFilterProp="label"
              className="nominas-def-panel__select"
              options={empleados.map((e) => ({
                value: e.id_usuario,
                label: `${e.nombre} (${e.dni || e.email})`,
              }))}
            />
          </div>
          <div>
            <Text strong>Periodo</Text>
            <DatePicker
              picker="month"
              value={periodo}
              onChange={(value) => value && setPeriodo(value)}
              format="MMMM YYYY"
              className="nominas-def-panel__periodo"
            />
          </div>
        </div>

        <div className="nominas-def-panel__importes-row">
          <div>
            <Text strong>Bruto devengado (€)</Text>
            <InputNumber
              {...propsInputImporteEs}
              value={importeBruto}
              onChange={setImporteBruto}
              className="nominas-def-panel__importe"
              placeholder="Ej. 773,36"
            />
          </div>
          <div>
            <Text strong>Total deducciones (€)</Text>
            <InputNumber
              {...propsInputImporteEs}
              value={importeDeducciones}
              onChange={setImporteDeducciones}
              className="nominas-def-panel__importe"
              placeholder="Ej. 131,94"
            />
          </div>
          <div>
            <Text strong>Líquido a percibir (€)</Text>
            <InputNumber
              {...propsInputImporteEs}
              value={importeLiquido}
              onChange={setImporteLiquido}
              className="nominas-def-panel__importe"
              placeholder="Ej. 641,42"
            />
          </div>
        </div>
        <Text type="secondary" className="nominas-def-panel__importes-hint">
          Use coma para los decimales, como en la nómina (773,36 — no 77336).
        </Text>

        <Dragger
          accept=".pdf,application/pdf"
          maxCount={1}
          fileList={archivoPendiente ? [{
            uid: '-1',
            name: archivoPendiente.name,
            status: 'done',
          }] : []}
          beforeUpload={(file) => {
            setArchivoPendiente(file);
            return false;
          }}
          onRemove={() => setArchivoPendiente(null)}
          className="nominas-def-panel__dragger"
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Arrastra el PDF o haz clic para seleccionarlo</p>
          <p className="ant-upload-hint">Solo PDF, máximo 5 MB</p>
        </Dragger>

        <Button
          type="primary"
          onClick={handleSubir}
          loading={subiendo}
          disabled={!archivoPendiente || !empleadoSeleccionado}
          className="nominas-def-panel__submit"
        >
          Subir nómina
        </Button>
      </Card>

      <Card title="Nóminas definitivas de la empresa" loading={loading}>
        <Table
          columns={columnas}
          dataSource={documentos}
          rowKey={(row) => `${row.empresa_id}-${row.id_documento}`}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Sin nóminas PDF subidas' }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
};

export default NominasDefinitivasPanel;
