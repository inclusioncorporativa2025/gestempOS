import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Tag, Input, Select, DatePicker, Empty, Spin, message, Button } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { getAusenciasListado, formatDiasAusencia } from '../../features/ausencias/ausenciasService';
import { getTipoUsuario } from '../../utils/authSession';
import SolicitarAusenciaModal from '../components/SolicitarAusenciaModal';
import './AusenciasPanel.css';

dayjs.extend(customParseFormat);

const TIPO_CONFIG = {
  vacaciones: { label: 'Vacaciones', color: 'blue' },
  baja: { label: 'Baja', color: 'red' },
  'asuntos propios': { label: 'Asuntos propios', color: 'purple' },
  'días retribuidos': { label: 'Días retribuidos', color: 'cyan' },
  'dias retribuidos': { label: 'Días retribuidos', color: 'cyan' },
  otros: { label: 'Otros', color: 'default' },
};

const FILTRO_TIPOS = [
  { value: 'Vacaciones', label: 'Vacaciones' },
  { value: 'Baja', label: 'Baja' },
  { value: 'Asuntos Propios', label: 'Asuntos propios' },
  { value: 'Días retribuidos', label: 'Días retribuidos' },
  { value: 'Otros', label: 'Otros' },
];

const parseFechaAusencia = (valor) =>
  dayjs(valor, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);

const formatFecha = (valor) => {
  const fecha = parseFechaAusencia(valor);
  return fecha.isValid() ? fecha.format('DD/MM/YYYY') : valor || '—';
};

const formatHora = (hora) => {
  if (!hora) return null;
  const parte = String(hora).slice(0, 5);
  return parte || null;
};

const renderTipoTag = (tipo) => {
  const clave = String(tipo || '').trim().toLowerCase();
  const config = TIPO_CONFIG[clave] || { label: tipo || 'Ausencia', color: 'default' };
  return <Tag color={config.color}>{config.label}</Tag>;
};

const obtenerEstadoAusencia = (record) => {
  if (record.fecha_aceptacion) return 'Aprobada';
  if (record.fecha_cancelacion) return 'Rechazada';
  return 'Pendiente';
};

const renderEstadoAusencia = (record) => {
  const estado = obtenerEstadoAusencia(record);
  const colors = { Aprobada: 'green', Rechazada: 'red', Pendiente: 'orange' };
  return <Tag color={colors[estado]}>{estado}</Tag>;
};

const formatHorario = (record) => {
  const fraccion = String(record.fraccion_dia || '').toLowerCase();
  if (fraccion === 'manana') return 'Mañana';
  if (fraccion === 'tarde') return 'Tarde';
  if (fraccion === 'completo') return 'Día completo';

  const desde = formatHora(record.hora_ausencia_desde);
  const hasta = formatHora(record.hora_ausencia_hasta);
  if (!desde && !hasta) return 'Día completo';
  if (desde && hasta) return `${desde} – ${hasta}`;
  return desde || hasta || '—';
};

const ROLES_SOLO_PROPIAS = [5];

const AusenciasPanel = () => {
  const [modalSolicitud, setModalSolicitud] = useState(false);
  const puedeSolicitar = ROLES_SOLO_PROPIAS.includes(Number(getTipoUsuario()));
  const [ausencias, setAusencias] = useState([]);
  const [verTodaEmpresa, setVerTodaEmpresa] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [rangoMeses, setRangoMeses] = useState(null);

  const mesParam = useMemo(() => {
    if (!rangoMeses?.[0] || !rangoMeses?.[1]) return null;
    return `${rangoMeses[0].format('MM/YYYY')}-${rangoMeses[1].format('MM/YYYY')}`;
  }, [rangoMeses]);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const data = await getAusenciasListado(mesParam);
      setAusencias(Array.isArray(data?.ausencias) ? data.ausencias : []);
      setVerTodaEmpresa(Boolean(data?.ver_toda_empresa));
    } catch (error) {
      console.error(error);
      if (!silencioso) message.error(error.message || 'No se pudieron cargar las ausencias');
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [mesParam]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrado = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return ausencias.filter((a) => {
      if (filtroTipo && String(a.tipo || '').trim() !== filtroTipo) return false;
      if (!q) return true;
      return (a.nombre_usuario || '').toLowerCase().includes(q)
        || (a.tipo || '').toLowerCase().includes(q)
        || (a.comentarios || '').toLowerCase().includes(q);
    });
  }, [ausencias, searchText, filtroTipo]);

  const columns = [
    ...(verTodaEmpresa
      ? [{
          title: 'Empleado',
          dataIndex: 'nombre_usuario',
          key: 'nombre_usuario',
          render: (nombre) => nombre || '—',
        }]
      : []),
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 160,
      render: (tipo) => renderTipoTag(tipo),
    },
    {
      title: 'Desde',
      dataIndex: 'fecha_desde',
      key: 'fecha_desde',
      width: 120,
      render: formatFecha,
    },
    {
      title: 'Hasta',
      dataIndex: 'fecha_hasta',
      key: 'fecha_hasta',
      width: 120,
      render: formatFecha,
    },
    {
      title: 'Días',
      dataIndex: 'dias',
      key: 'dias',
      width: 72,
      align: 'center',
      render: formatDiasAusencia,
    },
    {
      title: 'Horario',
      key: 'horario',
      width: 130,
      render: (_, record) => formatHorario(record),
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 110,
      render: (_, record) => renderEstadoAusencia(record),
    },
    {
      title: 'Comentario',
      dataIndex: 'comentarios',
      key: 'comentarios',
      ellipsis: true,
      render: (text) => text || '—',
    },
    {
      title: 'Solicitado',
      dataIndex: 'fecha_alta',
      key: 'fecha_alta',
      width: 110,
      render: (fecha) => (fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'),
    },
  ];

  return (
    <div className="ausencias-panel">
      <Card className="ausencias-card" bordered={false}>
        <div className="ausencias-toolbar">
          <div className="ausencias-filtros">
            {verTodaEmpresa && (
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Buscar empleado o comentario"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="ausencias-search"
              />
            )}
            <Select
              allowClear
              placeholder="Tipo de ausencia"
              value={filtroTipo}
              onChange={setFiltroTipo}
              options={FILTRO_TIPOS}
              className="ausencias-tipo-select"
            />
            <DatePicker.RangePicker
              picker="month"
              format="MM/YYYY"
              placeholder={['Mes desde', 'Mes hasta']}
              value={rangoMeses}
              onChange={setRangoMeses}
              className="ausencias-rango"
            />
          </div>
          <div className="ausencias-acciones">
            {puedeSolicitar && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setModalSolicitud(true)}
              >
                Solicitar
              </Button>
            )}
            <button
              type="button"
              className="ausencias-reload"
              onClick={() => cargar()}
              aria-label="Actualizar listado"
            >
              <ReloadOutlined spin={loading} />
            </button>
          </div>
        </div>

        <SolicitarAusenciaModal
          open={modalSolicitud}
          onClose={() => setModalSolicitud(false)}
          onSuccess={() => cargar()}
        />

        <Spin spinning={loading}>
          <Table
            rowKey={(row) => `${row.id_ausencia}-${row.id_usuario}`}
            columns={columns}
            dataSource={filtrado}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="No hay ausencias solicitadas" /> }}
            scroll={{ x: verTodaEmpresa ? 960 : 820 }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default AusenciasPanel;
