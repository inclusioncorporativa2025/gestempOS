import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Tag, Input, Button, Empty, Spin, message, Popover, Pagination } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { getEstadoPersonalEmpresa } from '../../features/fichaje/fichajeService';
import { getTipoUsuario } from '../../utils/authSession';
import { formatHoraFichaje, parseFechaFichaje } from '../../utils/fechaFichaje';
import { getConfigTipoAusenciaTag } from '../../constants/tiposAusencia';
import { JORNADA_ACTUALIZADA, GESTION_TIEMPO_REFRESH } from '../../hooks/useEstadoJornada';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import './PresenciaPersonalPanel.css';

dayjs.extend(customParseFormat);

const parseFechaAusencia = (valor) =>
  dayjs(valor, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);

const formatFechaAusencia = (valor) => {
  const fecha = parseFechaAusencia(valor);
  return fecha.isValid() ? fecha.format('DD/MM/YYYY') : valor || '—';
};

const ESTADO_CONFIG = {
  in: { label: 'Trabajando', color: 'green', dotClass: 'presencia-dot--in' },
  break: { label: 'En descanso', color: 'orange', dotClass: 'presencia-dot--break' },
  out: { label: 'Fuera', color: 'default', dotClass: 'presencia-dot--out' },
};

const REFRESH_MS = 30000;
const MOBILE_BREAKPOINT = 950;
const PAGE_SIZE = 12;
const ROLES_PRESENCIA_EQUIPO = [1, 2, 3, 4];

const STAT_FILTERS = [
  { key: 'in', resumenKey: 'trabajando', className: 'presencia-stat--in', label: 'Trabajando' },
  { key: 'break', resumenKey: 'descanso', className: 'presencia-stat--break', label: 'En descanso' },
  { key: 'out', resumenKey: 'fuera', className: 'presencia-stat--out', label: 'Fuera' },
];

const formatHora = (fecha) => {
  const hora = formatHoraFichaje(fecha);
  return hora || '—';
};

const minutosEntreFechas = (entrada, salida) => {
  const inicio = parseFechaFichaje(entrada);
  if (!inicio?.isValid()) return 0;
  const fin = salida ? parseFechaFichaje(salida) : dayjs();
  if (!fin?.isValid()) return 0;
  const diffMs = fin.diff(inicio);
  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
};

const formatDuracionMinutos = (minutos) => {
  if (!minutos || minutos <= 0) return '0 min';
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas > 0 && mins > 0) return `${horas}h ${mins}min`;
  if (horas > 0) return `${horas}h`;
  return `${mins}min`;
};

const renderDetallePausas = (pausas = []) => {
  if (!pausas.length) return null;

  const totalMin = pausas.reduce(
    (acc, pausa) => acc + minutosEntreFechas(pausa.fecha_entrada, pausa.fecha_salida),
    0,
  );

  return (
    <div className="presencia-pausas-popover">
      <div className="presencia-pausas-popover__total">
        Total descanso: {formatDuracionMinutos(totalMin)}
      </div>
      <ul className="presencia-pausas-popover__lista">
        {pausas.map((pausa, index) => {
          const inicio = formatHora(pausa.fecha_entrada);
          const fin = pausa.fecha_salida ? formatHora(pausa.fecha_salida) : 'En curso';
          return (
            <li key={`${pausa.fecha_entrada}-${index}`}>
              <span className="presencia-pausas-popover__horas">
                {inicio} – {fin}
              </span>
              <span className="presencia-pausas-popover__duracion">
                {formatDuracionMinutos(
                  minutosEntreFechas(pausa.fecha_entrada, pausa.fecha_salida),
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const getDotClass = (record) => {
  if (record.ausencia_activa && record.estado === 'out') return 'presencia-dot--ausencia';
  return ESTADO_CONFIG[record.estado]?.dotClass || '';
};

const renderEstado = (record) => {
  const { estado, ausencia_activa: ausencia } = record;

  if (estado === 'out' && ausencia?.tipo) {
    const config = getConfigTipoAusenciaTag(ausencia.tipo);
    return (
      <div className="presencia-estado-ausencia">
        <Tag color={config.color}>{config.label}</Tag>
        <span className="presencia-ausencia-hasta">
          Hasta {formatFechaAusencia(ausencia.fecha_hasta)}
        </span>
      </div>
    );
  }

  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.out;
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

const renderPausas = (num, record, { touchFriendly = false } = {}) => {
  const pausas = record.pausas_detalle || [];
  const contenido = (
    <span
      className={
        num > 0
          ? 'presencia-pausas presencia-pausas--active presencia-pausas--hoverable'
          : 'presencia-pausas'
      }
    >
      {num ?? 0}
    </span>
  );

  if (!num || !pausas.length) return contenido;

  return (
    <Popover
      content={renderDetallePausas(pausas)}
      title="Pausas de hoy"
      trigger={touchFriendly ? 'click' : 'hover'}
      placement={touchFriendly ? 'bottom' : 'left'}
      overlayClassName="presencia-pausas-popover-overlay"
    >
      {contenido}
    </Popover>
  );
};

const PresenciaPersonalPanel = () => {
  const tipoUsuario = Number(getTipoUsuario());
  const [personal, setPersonal] = useState([]);
  const [resumen, setResumen] = useState({ trabajando: 0, descanso: 0, fuera: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [estadoFilter, setEstadoFilter] = useState(null);
  const [mobilePage, setMobilePage] = useState(1);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  const cargar = useCallback(async (silencioso = false) => {
    if (!ROLES_PRESENCIA_EQUIPO.includes(Number(getTipoUsuario()))) return;
    if (!silencioso) setLoading(true);
    try {
      const data = await getEstadoPersonalEmpresa();
      setPersonal(data.personal || []);
      setResumen(data.resumen || { trabajando: 0, descanso: 0, fuera: 0, total: 0 });
    } catch (error) {
      console.error(error);
      if (!silencioso) message.error(error.message || 'No se pudo cargar el estado del personal');
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const interval = setInterval(() => cargar(true), REFRESH_MS);
    return () => clearInterval(interval);
  }, [cargar]);

  useEffect(() => {
    const onActualizada = () => cargar(true);
    window.addEventListener(JORNADA_ACTUALIZADA, onActualizada);
    window.addEventListener(GESTION_TIEMPO_REFRESH, onActualizada);
    return () => {
      window.removeEventListener(JORNADA_ACTUALIZADA, onActualizada);
      window.removeEventListener(GESTION_TIEMPO_REFRESH, onActualizada);
    };
  }, [cargar]);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setMobilePage(1);
  }, [searchText, personal.length, estadoFilter]);

  const toggleEstadoFilter = (estado) => {
    setEstadoFilter((prev) => (prev === estado ? null : estado));
  };

  const filtrado = useMemo(() => {
    let rows = personal;

    if (estadoFilter) {
      rows = rows.filter((p) => p.estado === estadoFilter);
    }

    const q = searchText.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter(
      (p) =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q),
    );
  }, [personal, searchText, estadoFilter]);

  const emptyDescription = estadoFilter
    ? `No hay personal en estado «${ESTADO_CONFIG[estadoFilter]?.label || estadoFilter}»`
    : 'No hay personal activo en la empresa';

  const filtradoMobile = useMemo(() => {
    const start = (mobilePage - 1) * PAGE_SIZE;
    return filtrado.slice(start, start + PAGE_SIZE);
  }, [filtrado, mobilePage]);

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nombre, record) => (
        <div className="presencia-nombre">
          <span className={`presencia-dot ${getDotClass(record)}`} aria-hidden />
          <span>{nombre}</span>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 180,
      render: (_, record) => renderEstado(record),
    },
    {
      title: 'Entrada',
      dataIndex: 'fecha_entrada',
      key: 'fecha_entrada',
      width: 90,
      render: (fecha) => formatHora(fecha),
    },
    {
      title: 'Salida',
      dataIndex: 'fecha_salida',
      key: 'fecha_salida',
      width: 90,
      render: (fecha) => formatHora(fecha),
    },
    {
      title: 'Pausas',
      dataIndex: 'num_pausas',
      key: 'num_pausas',
      width: 80,
      align: 'center',
      render: (num, record) => renderPausas(num, record),
    },
  ];

  if (!ROLES_PRESENCIA_EQUIPO.includes(tipoUsuario)) {
    return null;
  }

  return (
    <div className="presencia-panel">
      <Card className="presencia-card">
        <div className="presencia-toolbar">
          <div className="presencia-stats" role="group" aria-label="Filtrar por estado">
            {STAT_FILTERS.map(({ key, resumenKey, className, label }) => {
              const activo = estadoFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`presencia-stat presencia-stat--filter ${className}${activo ? ' presencia-stat--active' : ''}`}
                  onClick={() => toggleEstadoFilter(key)}
                  aria-pressed={activo}
                  aria-label={`Filtrar por ${label.toLowerCase()}: ${resumen[resumenKey] ?? 0}`}
                >
                  <span className="presencia-stat-value">{resumen[resumenKey] ?? 0}</span>
                  <span className="presencia-stat-label">{label}</span>
                </button>
              );
            })}
          </div>
          <Button
            type="text"
            className="presencia-refresh-btn"
            icon={<ReloadOutlined />}
            onClick={() => cargar()}
            aria-label="Actualizar"
          />
        </div>

        <Input
          placeholder="Buscar por nombre o correo"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="presencia-search"
          allowClear
        />

        <Spin spinning={loading}>
          {filtrado.length === 0 && !loading ? (
            <Empty description={emptyDescription} />
          ) : isMobile ? (
            <>
              <ul className="presencia-mobile-list">
                {filtradoMobile.map((record) => (
                  <li key={record.id_usuario} className="presencia-mobile-card">
                    <div className="presencia-mobile-card__header">
                      <div className="presencia-mobile-card__nombre">
                        <span className={`presencia-dot ${getDotClass(record)}`} aria-hidden />
                        <span className="presencia-mobile-card__nombre-text">{record.nombre}</span>
                      </div>
                      <div className="presencia-mobile-card__estado">
                        {renderEstado(record)}
                      </div>
                    </div>
                    <div className="presencia-mobile-card__meta">
                      <div className="presencia-mobile-card__meta-item">
                        <span className="presencia-mobile-card__meta-label">Entrada</span>
                        <span className="presencia-mobile-card__meta-value">
                          {formatHora(record.fecha_entrada)}
                        </span>
                      </div>
                      <div className="presencia-mobile-card__meta-item">
                        <span className="presencia-mobile-card__meta-label">Salida</span>
                        <span className="presencia-mobile-card__meta-value">
                          {formatHora(record.fecha_salida)}
                        </span>
                      </div>
                      <div className="presencia-mobile-card__meta-item">
                        <span className="presencia-mobile-card__meta-label">Pausas</span>
                        <span className="presencia-mobile-card__meta-value">
                          {renderPausas(record.num_pausas, record, { touchFriendly: true })}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {filtrado.length > PAGE_SIZE && (
                <Pagination
                  className="presencia-mobile-pagination"
                  current={mobilePage}
                  pageSize={PAGE_SIZE}
                  total={filtrado.length}
                  onChange={setMobilePage}
                  showSizeChanger={false}
                  size="small"
                />
              )}
            </>
          ) : (
            <Table
              className="presencia-table"
              dataSource={filtrado}
              columns={columns}
              rowKey="id_usuario"
              pagination={{ pageSize: PAGE_SIZE, hideOnSinglePage: true }}
              size="middle"
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default PresenciaPersonalPanel;
