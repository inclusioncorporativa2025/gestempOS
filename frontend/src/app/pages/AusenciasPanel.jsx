import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Tag, Input, Select, DatePicker, Empty, Spin, message, Button, Pagination } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { getAusenciasListado, formatDiasAusencia } from '../../features/ausencias/ausenciasService';
import { getTipoUsuario } from '../../utils/authSession';
import usePlan from '../../hooks/usePlan';
import {
  getConfigTipoAusenciaTag,
  getOpcionesFiltroAusencias,
} from '../../constants/tiposAusencia';
import SolicitarAusenciaModal from '../components/SolicitarAusenciaModal';
import JustificanteAusenciaAcciones from '../components/JustificanteAusenciaAcciones';
import { GESTION_TIEMPO_REFRESH } from '../../hooks/useEstadoJornada';
import './AusenciasPanel.css';

dayjs.extend(customParseFormat);

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
  const config = getConfigTipoAusenciaTag(tipo);
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

const ROLES_PUEDEN_SOLICITAR = [1, 2, 3, 4, 5];
const ROLES_GESTOR_AUSENCIAS = [1, 2, 3, 4];

const MOBILE_BREAKPOINT = 950;
const PAGE_SIZE = 10;

const AusenciaMobileField = ({ label, value }) => (
  <div className="aus-mobile-field">
    <span className="aus-mobile-field__label">{label}</span>
    <span className="aus-mobile-field__value">{value ?? '—'}</span>
  </div>
);

const AusenciaMobilePair = ({ left, right }) => (
  <div className="aus-mobile-pair">
    <AusenciaMobileField label={left.label} value={left.value} />
    <AusenciaMobileField label={right.label} value={right.value} />
  </div>
);

const AusenciasPanel = () => {
  const { planId } = usePlan();
  const opcionesFiltroTipo = useMemo(
    () => getOpcionesFiltroAusencias(planId),
    [planId],
  );
  const [modalSolicitud, setModalSolicitud] = useState(false);
  const tipoUsuario = Number(getTipoUsuario());
  const puedeSolicitar = ROLES_PUEDEN_SOLICITAR.includes(tipoUsuario);
  const puedeRegistrarPersonal = ROLES_GESTOR_AUSENCIAS.includes(tipoUsuario);
  const [ausencias, setAusencias] = useState([]);
  const [verTodaEmpresa, setVerTodaEmpresa] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [rangoMeses, setRangoMeses] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [mobilePage, setMobilePage] = useState(1);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

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

  useEffect(() => {
    const onRefresh = () => cargar();
    window.addEventListener(GESTION_TIEMPO_REFRESH, onRefresh);
    return () => window.removeEventListener(GESTION_TIEMPO_REFRESH, onRefresh);
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

  useEffect(() => {
    setMobilePage(1);
  }, [filtrado.length, searchText, filtroTipo, mesParam]);

  const filtradoMobile = useMemo(() => {
    const start = (mobilePage - 1) * PAGE_SIZE;
    return filtrado.slice(start, start + PAGE_SIZE);
  }, [filtrado, mobilePage]);

  const labelBotonSolicitar = puedeRegistrarPersonal ? 'Solicitar / Registrar' : 'Solicitar';
  const labelBotonSolicitarMobile = puedeRegistrarPersonal ? 'Registrar' : 'Solicitar';

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
      title: 'Justificante',
      key: 'justificante',
      width: 220,
      render: (_, record) => (
        <JustificanteAusenciaAcciones
          ausencia={record}
          compact
          onActualizado={cargar}
        />
      ),
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

  const renderAusenciaCard = (record) => {
    const tipoConfig = getConfigTipoAusenciaTag(record.tipo);
    const titulo = verTodaEmpresa
      ? (record.nombre_usuario || '—')
      : tipoConfig.label;

    return (
      <article
        key={`${record.id_ausencia}-${record.id_usuario}`}
        className="aus-mobile-card"
      >
        <div className="aus-mobile-card__header">
          <h3 className="aus-mobile-card__title">{titulo}</h3>
          <div className="aus-mobile-card__badges">
            {verTodaEmpresa && renderTipoTag(record.tipo)}
            {renderEstadoAusencia(record)}
          </div>
        </div>
        <div className="aus-mobile-card__body">
          {verTodaEmpresa ? (
            <>
              <AusenciaMobilePair
                left={{ label: 'Tipo', value: tipoConfig.label }}
                right={{ label: 'Días', value: formatDiasAusencia(record.dias) }}
              />
              <AusenciaMobilePair
                left={{ label: 'Desde', value: formatFecha(record.fecha_desde) }}
                right={{ label: 'Hasta', value: formatFecha(record.fecha_hasta) }}
              />
              <AusenciaMobilePair
                left={{ label: 'Horario', value: formatHorario(record) }}
                right={{
                  label: 'Solicitado',
                  value: record.fecha_alta ? dayjs(record.fecha_alta).format('DD/MM/YYYY') : '—',
                }}
              />
            </>
          ) : (
            <>
              <AusenciaMobilePair
                left={{ label: 'Días', value: formatDiasAusencia(record.dias) }}
                right={{ label: 'Horario', value: formatHorario(record) }}
              />
              <AusenciaMobilePair
                left={{ label: 'Desde', value: formatFecha(record.fecha_desde) }}
                right={{ label: 'Hasta', value: formatFecha(record.fecha_hasta) }}
              />
              <AusenciaMobileField
                label="Solicitado"
                value={record.fecha_alta ? dayjs(record.fecha_alta).format('DD/MM/YYYY') : '—'}
              />
            </>
          )}
          {record.comentarios && (
            <AusenciaMobileField label="Comentario" value={record.comentarios} />
          )}
          <div className="aus-mobile-justificante">
            <span className="aus-mobile-field__label">Justificante</span>
            <JustificanteAusenciaAcciones
              ausencia={record}
              compact
              onActualizado={cargar}
            />
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="ausencias-panel">
      <Card className="ausencias-card" bordered={false}>
        <div className={`ausencias-toolbar${isMobile ? ' ausencias-toolbar--mobile' : ''}`}>
          {isMobile ? (
            <>
              <div className="ausencias-toolbar-top">
                {verTodaEmpresa && (
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Buscar empleado..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="ausencias-search"
                  />
                )}
                <div className="ausencias-acciones">
                  {puedeSolicitar && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setModalSolicitud(true)}
                      className="ausencias-solicitar-btn"
                    >
                      {labelBotonSolicitarMobile}
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
              <div className="ausencias-filtros">
                <Select
                  allowClear
                  placeholder="Tipo de ausencia"
                  value={filtroTipo}
                  onChange={setFiltroTipo}
                  options={opcionesFiltroTipo}
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
            </>
          ) : (
            <>
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
                  options={opcionesFiltroTipo}
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
                    {labelBotonSolicitar}
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
            </>
          )}
        </div>

        <SolicitarAusenciaModal
          open={modalSolicitud}
          onClose={() => setModalSolicitud(false)}
          onSuccess={() => cargar()}
          puedeRegistrarPersonal={puedeRegistrarPersonal}
        />

        <Spin spinning={loading}>
          {isMobile ? (
            <div className="aus-mobile-list">
              {filtrado.length === 0 ? (
                <p className="aus-mobile-empty">No hay ausencias solicitadas</p>
              ) : (
                <>
                  {filtradoMobile.map((record) => renderAusenciaCard(record))}
                  {filtrado.length > PAGE_SIZE && (
                    <Pagination
                      className="aus-mobile-pagination"
                      current={mobilePage}
                      pageSize={PAGE_SIZE}
                      total={filtrado.length}
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
              rowKey={(row) => `${row.id_ausencia}-${row.id_usuario}`}
              columns={columns}
              dataSource={filtrado}
              pagination={{ pageSize: 15, showSizeChanger: false }}
              locale={{ emptyText: <Empty description="No hay ausencias solicitadas" /> }}
              scroll={{ x: verTodaEmpresa ? 960 : 820 }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default AusenciasPanel;
