import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Tag, Input, Button, Empty, Spin, message } from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getEstadoPersonalEmpresa } from '../../features/fichaje/fichajeService';
import { getTipoUsuario } from '../../utils/authSession';
import { JORNADA_ACTUALIZADA } from '../../hooks/useEstadoJornada';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import './PresenciaPersonalPanel.css';

dayjs.extend(utc);
dayjs.extend(timezone);

const ESTADO_CONFIG = {
  in: { label: 'Trabajando', color: 'green', dotClass: 'presencia-dot--in' },
  break: { label: 'En descanso', color: 'orange', dotClass: 'presencia-dot--break' },
  out: { label: 'Fuera', color: 'default', dotClass: 'presencia-dot--out' },
};

const REFRESH_MS = 30000;

const ROLES_PRESENCIA_EQUIPO = [1, 2, 3, 4];

const formatHora = (fecha) => {
  if (!fecha) return '—';
  const d = dayjs.utc(fecha).tz('Europe/Madrid');
  return d.isValid() ? d.format('HH:mm') : '—';
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
      render: (nombre, record) => (
        <div className="presencia-nombre">
          <span className={`presencia-dot ${ESTADO_CONFIG[record.estado]?.dotClass || ''}`} aria-hidden />
          <span>{nombre}</span>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 140,
      render: (estado) => {
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
      render: (num) => (
        <span className={num > 0 ? 'presencia-pausas presencia-pausas--active' : 'presencia-pausas'}>
          {num ?? 0}
        </span>
      ),
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
