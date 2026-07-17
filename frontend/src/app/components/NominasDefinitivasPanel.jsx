import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  InputNumber,
  Pagination,
  Popconfirm,
  Row,
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
import './NominasDefinitivasPanel.css';

const { Text, Title } = Typography;
const { Dragger } = Upload;

const MOBILE_BREAKPOINT = 950;
const PAGE_SIZE = 10;

const NominaMobileField = ({ label, value }) => (
  <div className="nomina-mobile-field">
    <span className="nomina-mobile-field__label">{label}</span>
    <span className="nomina-mobile-field__value">{value ?? '—'}</span>
  </div>
);

const NominaMobilePair = ({ left, right }) => (
  <div className="nomina-mobile-pair">
    <NominaMobileField label={left.label} value={left.value} />
    <NominaMobileField label={right.label} value={right.value} />
  </div>
);

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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [mobilePage, setMobilePage] = useState(1);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setMobilePage(1);
  }, [documentos.length]);

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

  const documentosMobile = useMemo(() => {
    const start = (mobilePage - 1) * PAGE_SIZE;
    return documentos.slice(start, start + PAGE_SIZE);
  }, [documentos, mobilePage]);

  const renderAccionesDocumento = (row) => (
    <Space wrap className="nominas-def-panel__acciones-mobile">
      <Button
        type="default"
        size="small"
        icon={<UserOutlined />}
        onClick={() => navigate(`${APP_ROUTES.users}/${row.id_usuario}`)}
      >
        Ficha
      </Button>
      <Button
        type="default"
        size="small"
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
        <Button size="small" danger icon={<DeleteOutlined />}>
          Eliminar
        </Button>
      </Popconfirm>
    </Space>
  );

  const renderDocumentoCard = (row) => {
    const nombreEmpleado = mapaEmpleados.get(row.id_usuario)?.nombre || `ID ${row.id_usuario}`;
    return (
      <article
        key={`${row.empresa_id}-${row.id_documento}`}
        className="nomina-mobile-card"
      >
        <div className="nomina-mobile-card__header">
          <h3 className="nomina-mobile-card__title">{nombreEmpleado}</h3>
        </div>
        <NominaMobilePair
          left={{ label: 'Periodo', value: etiquetaPeriodo(row.periodo_mes, row.periodo_anio) }}
          right={{ label: 'Líquido', value: formatearEuros(row.importe_liquido) }}
        />
        <NominaMobilePair
          left={{ label: 'Bruto', value: formatearEuros(row.importe_bruto) }}
          right={{ label: 'Archivo', value: row.nombre_archivo || '—' }}
        />
        <NominaMobilePair
          left={{ label: 'Publicada', value: formatearFecha(row.fecha_publicacion) }}
          right={{
            label: 'Vista empleado',
            value: row.visto_en ? formatearFecha(row.visto_en) : 'Pendiente',
          }}
        />
        <div className="nomina-mobile-card__acciones">
          {renderAccionesDocumento(row)}
        </div>
      </article>
    );
  };

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

        <Form layout="vertical" className="nominas-def-panel__form">
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Empleado" required>
                <Select
                  showSearch
                  placeholder="Selecciona empleado"
                  value={empleadoSeleccionado}
                  onChange={setEmpleadoSeleccionado}
                  optionFilterProp="label"
                  options={empleados.map((e) => ({
                    value: e.id_usuario,
                    label: `${e.nombre} (${e.dni || e.email})`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Periodo" required>
                <DatePicker
                  picker="month"
                  value={periodo}
                  onChange={(value) => value && setPeriodo(value)}
                  format="MMMM YYYY"
                  className="nominas-def-panel__periodo"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={8}>
              <Form.Item label="Bruto devengado (€)">
                <InputNumber
                  {...propsInputImporteEs}
                  value={importeBruto}
                  onChange={setImporteBruto}
                  className="nominas-def-panel__importe"
                  placeholder="Ej. 773,36"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Total deducciones (€)">
                <InputNumber
                  {...propsInputImporteEs}
                  value={importeDeducciones}
                  onChange={setImporteDeducciones}
                  className="nominas-def-panel__importe"
                  placeholder="Ej. 131,94"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Líquido a percibir (€)">
                <InputNumber
                  {...propsInputImporteEs}
                  value={importeLiquido}
                  onChange={setImporteLiquido}
                  className="nominas-def-panel__importe"
                  placeholder="Ej. 641,42"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
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
        {isMobile ? (
          <div className="nomina-mobile-list">
            {documentos.length === 0 ? (
              <p className="nomina-mobile-empty">Sin nóminas PDF subidas</p>
            ) : (
              <>
                {documentosMobile.map((row) => renderDocumentoCard(row))}
                {documentos.length > PAGE_SIZE && (
                  <Pagination
                    className="nomina-mobile-pagination"
                    current={mobilePage}
                    pageSize={PAGE_SIZE}
                    total={documentos.length}
                    onChange={setMobilePage}
                    showSizeChanger={false}
                    hideOnSinglePage
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <Table
            columns={columnas}
            dataSource={documentos}
            rowKey={(row) => `${row.empresa_id}-${row.id_documento}`}
            pagination={{ pageSize: PAGE_SIZE }}
            locale={{ emptyText: 'Sin nóminas PDF subidas' }}
            scroll={{ x: 900 }}
          />
        )}
      </Card>
    </div>
  );
};

export default NominasDefinitivasPanel;
