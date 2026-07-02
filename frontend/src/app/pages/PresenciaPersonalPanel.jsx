import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Tag, Input, Button, Empty, Spin, message, Popover } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { getEstadoPersonalEmpresa } from '../../features/fichaje/fichajeService';
import { getTipoUsuario } from '../../utils/authSession';
import { formatHoraFichaje, parseFechaFichaje } from '../../utils/fechaFichaje';
import { getConfigTipoAusenciaTag } from '../../constants/tiposAusencia';
import { JORNADA_ACTUALIZADA } from '../../hooks/useEstadoJornada';
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

const ROLES_PRESENCIA_EQUIPO = [1, 2, 3, 4];

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

const PresenciaPersonalPanel = () => {
  const tipoUsuario = Number(getTipoUsuario());
  const [personal, setPersonal] = useState([]);
  const [resumen, setResumen] = useState({ trabajando: 0, descanso: 0, fuera: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

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
    return () => window.removeEventListener(JORNADA_ACTUALIZADA, onActualizada);
  }, [cargar]);

  const filtrado = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return personal;
    return personal.filter(
      (p) =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
    );
  }, [personal, searchText]);

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nombre, record) => {
        const dotClass = record.ausencia_activa && record.estado === 'out'
          ? 'presencia-dot--ausencia'
          : (ESTADO_CONFIG[record.estado]?.dotClass || '');

        return (
          <div className="presencia-nombre">
            <span className={`presencia-dot ${dotClass}`} aria-hidden />
            <span>{nombre}</span>
          </div>
        );
      },
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 180,
      render: (estado, record) => {
        const ausencia = record.ausencia_activa;

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
      },
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
      render: (num, record) => {
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
            trigger="hover"
            placement="left"
            overlayClassName="presencia-pausas-popover-overlay"
          >
            {contenido}
          </Popover>
        );
      },
    },
  ];

  if (!ROLES_PRESENCIA_EQUIPO.includes(tipoUsuario)) {
    return null;
  }

  return (
    <div className="presencia-panel">
      <Card className="presencia-card">
        <div className="presencia-toolbar">
          <div className="presencia-stats">
            <div className="presencia-stat presencia-stat--in">
              <span className="presencia-stat-value">{resumen.trabajando}</span>
              <span className="presencia-stat-label">Trabajando</span>
            </div>
            <div className="presencia-stat presencia-stat--break">
              <span className="presencia-stat-value">{resumen.descanso}</span>
              <span className="presencia-stat-label">En descanso</span>
            </div>
            <div className="presencia-stat presencia-stat--out">
              <span className="presencia-stat-value">{resumen.fuera}</span>
              <span className="presencia-stat-label">Fuera</span>
            </div>
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
            <Empty description="No hay personal activo en la empresa" />
          ) : (
            <Table
              className="presencia-table"
              dataSource={filtrado}
              columns={columns}
              rowKey="id_usuario"
              pagination={{ pageSize: 12, hideOnSinglePage: true }}
              size="middle"
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default PresenciaPersonalPanel;
