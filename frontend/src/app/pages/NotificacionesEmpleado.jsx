import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Button, Table, Modal, Menu, Spin,
  Typography, message, Tooltip, DatePicker, Popover, Badge, Radio, Tag,
} from 'antd';
import { EyeOutlined, FilterOutlined, CalendarOutlined, CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';

import {
  getPeticionesByIdUsuario,
  getDatosUsuarioMes,
  marcarPeticionesVistas,
  getFirmaCierreMensual,
} from '../../features/fichaje/fichajeService';
import { getHorasTotalesMesByIdUsuario } from '../../features/user/usuarioService';
import { notifyNotificacionesActualizadas } from '../../hooks/useNotificacionesPendientes';
import { usePlan } from '../../hooks/usePlan';
import { getAusenciasNotificacionesEmpleado } from '../../features/ausencias/ausenciasService';
import { getIdUsuario, getNombreUsuario } from '../../utils/authSession';
import { generarPdfCierreMensual } from '../../utils/generarPdfCierreMensual';
import { parseFechaFichaje } from '../../utils/fechaFichaje';
import './Notificaciones.css';

dayjs.locale('es');
dayjs.extend(utc);
dayjs.extend(timezone);

const { Title } = Typography;
const { RangePicker } = DatePicker;

const submenuItemsBase = [
  { key: 'horarios', label: 'Cambios de horarios' },
  { key: 'cierres', label: 'Cierres mensuales' },
];

const formatFechaAusencia = (valor) => {
  if (!valor) return '—';
  const fecha = dayjs(valor, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);
  return fecha.isValid() ? fecha.format('DD/MM/YYYY') : valor;
};

const filtrarPorRango = (items, campoFecha, rango, obtenerFecha) => {
  if (!rango?.[0] || !rango?.[1]) return items;
  const desde = rango[0].startOf('day');
  const hasta = rango[1].endOf('day');
  return items.filter((item) => {
    const raw = obtenerFecha ? obtenerFecha(item) : item[campoFecha];
    const fecha = dayjs(raw);
    return fecha.isValid() && !fecha.isBefore(desde) && !fecha.isAfter(hasta);
  });
};

const obtenerFechaResolucionItem = (item) =>
  item.fecha_aceptacion || item.fecha_cancelacion;

const ordenarPorReciente = (items, campoFecha) =>
  [...items].sort(
    (a, b) => dayjs(b[campoFecha]).valueOf() - dayjs(a[campoFecha]).valueOf(),
  );

const combinarCorrecciones = (pendientes, historial) => {
  const ids = new Set();
  const merged = [];
  [...(pendientes || []), ...(historial || [])].forEach((item) => {
    if (!ids.has(item.id_peticion)) {
      ids.add(item.id_peticion);
      merged.push(item);
    }
  });
  return merged;
};

const filtrarPorEstado = (items, estado) => {
  if (!estado || estado === 'todas') return items;
  if (estado === 'pendientes') {
    return items.filter((item) => !item.fecha_aceptacion && !item.fecha_cancelacion);
  }
  if (estado === 'aprobadas') {
    return items.filter((item) => Boolean(item.fecha_aceptacion));
  }
  if (estado === 'rechazadas') {
    return items.filter((item) => Boolean(item.fecha_cancelacion));
  }
  return items;
};

const NotificacionesEmpleado = () => {
  const { tieneFeature } = usePlan();
  const puedeVerAusencias = tieneFeature('ausencias_basicas');
  const [peticiones, setPeticiones] = useState([]);
  const [historialEdiciones, setHistorialEdiciones] = useState([]);
  const [cierresMensuales, setCierresMensuales] = useState([]);
  const [ausenciasNotificaciones, setAusenciasNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [registroHoras, setRegistroHoras] = useState([]);
  const [totalHoras, setTotalHoras] = useState('');
  const [totalHorasEsperadas, setTotalHorasEsperadas] = useState(0);
  const [resumenHoras, setResumenHoras] = useState(null);
  const [firmaCierreDetalle, setFirmaCierreDetalle] = useState(null);
  const [detalleCierreContext, setDetalleCierreContext] = useState(null);
  const [rangoFechas, setRangoFechas] = useState(null);
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState('todas');
  const [campoFechaRango, setCampoFechaRango] = useState('fecha_alta');
  const [rangoFechasDraft, setRangoFechasDraft] = useState(null);
  const [estadoFiltroDraft, setEstadoFiltroDraft] = useState('todas');
  const [campoFechaRangoDraft, setCampoFechaRangoDraft] = useState('fecha_alta');
  const [activeTab, setActiveTab] = useState('horarios');

  const todasCorrecciones = useMemo(
    () => combinarCorrecciones(peticiones, historialEdiciones),
    [peticiones, historialEdiciones],
  );

  const submenuItems = useMemo(() => {
    const items = [...submenuItemsBase];
    if (puedeVerAusencias) {
      items.push({ key: 'ausencias', label: 'Ausencias' });
    }
    return items;
  }, [puedeVerAusencias]);

  const contadoresActivos = useMemo(() => {
    const items = activeTab === 'horarios'
      ? todasCorrecciones
      : activeTab === 'cierres'
        ? (cierresMensuales || [])
        : ausenciasNotificaciones;
    return {
      pendientes: items.filter(
        (item) => !item.fecha_aceptacion && !item.fecha_cancelacion,
      ).length,
      aprobadas: items.filter((item) => item.fecha_aceptacion).length,
      rechazadas: items.filter((item) => item.fecha_cancelacion).length,
    };
  }, [activeTab, todasCorrecciones, cierresMensuales, ausenciasNotificaciones]);

  const campoFechaActivo = campoFechaRango === 'fecha_resolucion' ? null : campoFechaRango;
  const obtenerFechaFiltro = campoFechaRango === 'fecha_resolucion'
    ? obtenerFechaResolucionItem
    : null;

  const correccionesFiltradas = useMemo(
    () => ordenarPorReciente(
      filtrarPorRango(
        filtrarPorEstado(todasCorrecciones, estadoFiltro),
        campoFechaActivo,
        rangoFechas,
        obtenerFechaFiltro,
      ),
      'fecha_alta',
    ),
    [todasCorrecciones, estadoFiltro, rangoFechas, campoFechaRango],
  );

  const cierresFiltrados = useMemo(
    () => ordenarPorReciente(
      filtrarPorRango(
        filtrarPorEstado(cierresMensuales, estadoFiltro),
        'fecha_alta',
        rangoFechas,
      ),
      'fecha_alta',
    ),
    [cierresMensuales, rangoFechas, estadoFiltro],
  );

  const ausenciasFiltradas = useMemo(
    () => ordenarPorReciente(
      filtrarPorRango(
        filtrarPorEstado(ausenciasNotificaciones, estadoFiltro),
        campoFechaActivo,
        rangoFechas,
        obtenerFechaFiltro,
      ),
      'fecha_alta',
    ),
    [ausenciasNotificaciones, estadoFiltro, rangoFechas, campoFechaRango],
  );

  const sincronizarFiltrosDraft = () => {
    setRangoFechasDraft(rangoFechas);
    setEstadoFiltroDraft(estadoFiltro);
    setCampoFechaRangoDraft(campoFechaRango);
  };

  const limpiarFiltrosDraft = () => {
    setRangoFechasDraft(null);
    setEstadoFiltroDraft('todas');
    setCampoFechaRangoDraft('fecha_alta');
    setCalendarioAbierto(false);
  };

  const aplicarFiltros = () => {
    setRangoFechas(rangoFechasDraft);
    setEstadoFiltro(estadoFiltroDraft);
    setCampoFechaRango(campoFechaRangoDraft);
    setCalendarioAbierto(false);
    setFiltroAbierto(false);
  };

  const seleccionarEstadoRapido = (estado) => {
    const siguiente = estadoFiltro === estado ? 'todas' : estado;
    setEstadoFiltro(siguiente);
    setEstadoFiltroDraft(siguiente);
  };

  const handleTabChange = ({ key }) => {
    setActiveTab(key);
    setEstadoFiltro('todas');
    setEstadoFiltroDraft('todas');
  };

  const handleFiltroOpenChange = (open) => {
    if (open) {
      sincronizarFiltrosDraft();
    } else {
      setCalendarioAbierto(false);
    }
    setFiltroAbierto(open);
  };

  const filtrosAvanzadosActivos = Boolean(rangoFechas)
    || estadoFiltro !== 'todas'
    || campoFechaRango !== 'fecha_alta';

  const hintCalendario = !rangoFechasDraft?.[0]
    ? 'Selecciona fecha de inicio'
    : !rangoFechasDraft?.[1]
    ? 'Selecciona fecha de fin'
    : `${rangoFechasDraft[0].format('DD/MM/YYYY')} – ${rangoFechasDraft[1].format('DD/MM/YYYY')}`;

  const textoBotonCalendario = rangoFechasDraft?.[0] && rangoFechasDraft?.[1]
    ? `${rangoFechasDraft[0].format('DD/MM')} – ${rangoFechasDraft[1].format('DD/MM')}`
    : 'Calendario';

  const contenidoMiniCalendario = (
    <div className="notif-mini-calendar-panel" onClick={(e) => e.stopPropagation()}>
      <span className="notif-mini-calendar-hint">{hintCalendario}</span>
      <div className="notif-mini-calendar-inner">
        <RangePicker
          open
          value={rangoFechasDraft}
          onChange={(dates) => {
            setRangoFechasDraft(dates);
            if (dates?.[0] && dates?.[1]) {
              setCalendarioAbierto(false);
            }
          }}
          format="DD/MM/YYYY"
          allowClear
          getPopupContainer={(trigger) => trigger.parentElement}
          popupClassName="notif-mini-range-popup"
          className="notif-mini-range-input-hidden"
          aria-label="Seleccionar rango de fechas"
        />
      </div>
    </div>
  );

  const contenidoFiltro = (
    <div className="notif-filter-panel" onClick={(e) => e.stopPropagation()}>
      <div className="notif-filter-header">
        <span className="notif-filter-title">Filtros</span>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => handleFiltroOpenChange(false)}
          aria-label="Cerrar filtros"
        />
      </div>

      <div className="notif-filter-section">
        <span className="notif-filter-section-title">Estado</span>
        <Radio.Group
          value={estadoFiltroDraft}
          onChange={(e) => setEstadoFiltroDraft(e.target.value)}
          className="notif-filter-estado-group"
        >
          <Radio value="todas">Todas</Radio>
          <Radio value="pendientes">Pendientes</Radio>
          <Radio value="aprobadas">Aprobadas</Radio>
          <Radio value="rechazadas">Rechazadas</Radio>
        </Radio.Group>
      </div>

      <div className="notif-filter-section">
        <span className="notif-filter-section-title">Calendario</span>
        <div className="notif-filter-calendario-row">
          <Popover
            content={contenidoMiniCalendario}
            trigger="click"
            placement="bottomLeft"
            open={calendarioAbierto}
            onOpenChange={setCalendarioAbierto}
            overlayClassName="notif-mini-calendar-popover"
          >
            <Button className="notif-calendario-btn" icon={<CalendarOutlined />}>
              {textoBotonCalendario}
            </Button>
          </Popover>
          {activeTab !== 'cierres' && (
            <div className="notif-filter-radio-col">
              <span className="notif-filter-radio-label">Aplicar el rango a</span>
              <Radio.Group
                value={campoFechaRangoDraft}
                onChange={(e) => setCampoFechaRangoDraft(e.target.value)}
                className="notif-filter-radio-group"
              >
                <Radio value="fecha_alta">F. solicitud</Radio>
                <Radio value="fecha_resolucion">F. resolución</Radio>
              </Radio.Group>
            </div>
          )}
        </div>
      </div>

      <div className="notif-filter-footer">
        <Button className="notif-filter-btn-limpiar" onClick={limpiarFiltrosDraft}>
          Limpiar
        </Button>
        <Button type="primary" className="notif-filter-btn-aplicar" onClick={aplicarFiltros}>
          Aplicar filtros
        </Button>
      </div>
    </div>
  );

  const fetchDatos = async () => {
    try {
      setLoading(true);
      const response = await getPeticionesByIdUsuario();
      setPeticiones(response?.peticiones || []);
      setHistorialEdiciones(response?.historialEdiciones || []);
      setCierresMensuales(response?.mesesCierre || []);
      if (puedeVerAusencias) {
        const ausenciasData = await getAusenciasNotificacionesEmpleado();
        setAusenciasNotificaciones(ausenciasData?.ausencias || []);
      }
      await marcarPeticionesVistas();
      notifyNotificacionesActualizadas();
    } catch (error) {
      message.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, [puedeVerAusencias]);

  const formatearFecha = (fecha) =>
    (fecha ? dayjs(fecha).tz('Europe/Madrid').format('DD/MM/YYYY HH:mm') : '-');

  const obtenerEstado = (record) => {
    if (record.fecha_aceptacion) return 'Aprobada';
    if (record.fecha_cancelacion) return 'Rechazada';
    return 'Pendiente';
  };

  const colorEstadoTag = (estado) => {
    if (estado === 'Aprobada' || estado === 'Aprobado') return 'green';
    if (estado === 'Rechazada' || estado === 'Rechazado') return 'red';
    return 'orange';
  };

  const setVisibleModalDetalles = async (info) => {
    try {
      setFirmaCierreDetalle(null);
      setResumenHoras(null);
      setDetalleCierreContext({
        nombreEmpleado: getNombreUsuario(),
        mes: info.mes,
        estado: obtenerEstado(info),
        fechaSolicitud: info.fecha_alta,
      });
      const idUsuario = getIdUsuario();
      const response = await getDatosUsuarioMes(idUsuario, info.mes);
      const registros = response.info || [];

      const registrosConDetalles = registros.map((item) => {
        const horaEntrada = parseFechaFichaje(item.fecha_entrada);
        const horaSalida = item.fecha_salida ? parseFechaFichaje(item.fecha_salida) : null;

        let dif_tiempo = 'No registrada';
        let minutosTrabajados = 0;

        if (horaSalida && horaEntrada.isValid() && horaSalida.isValid()) {
          const diffMinutes = horaSalida.diff(horaEntrada, 'minute');
          const horas = Math.floor(diffMinutes / 60);
          const minutos = diffMinutes % 60;
          minutosTrabajados = diffMinutes;
          dif_tiempo = `${horas}h ${minutos}m`;
        }

        return {
          fecha: horaEntrada.format('DD/MM/YYYY'),
          hora_entrada: horaEntrada.format('HH:mm'),
          hora_salida: horaSalida ? horaSalida.format('HH:mm') : 'No registrada',
          dif_tiempo,
          minutos: minutosTrabajados,
        };
      });

      registrosConDetalles.sort(
        (a, b) => dayjs(b.fecha, 'DD/MM/YYYY').valueOf() - dayjs(a.fecha, 'DD/MM/YYYY').valueOf(),
      );

      const minutosTotales = registrosConDetalles.reduce(
        (sum, item) => sum + (item.minutos || 0),
        0,
      );
      const totalHorasTexto = `${Math.floor(minutosTotales / 60)}h ${minutosTotales % 60}m`;

      const jornadaUsuario = await getHorasTotalesMesByIdUsuario(info.mes, idUsuario);
      setTotalHorasEsperadas(jornadaUsuario?.horasMensuales || 'No configurada');
      setResumenHoras(jornadaUsuario?.resumen || null);
      setRegistroHoras(registrosConDetalles);
      setTotalHoras(totalHorasTexto);

      if (info.id_mes_cierre) {
        const firma = await getFirmaCierreMensual(info.id_mes_cierre);
        setFirmaCierreDetalle(firma);
      }

      setVisible(true);
    } catch (error) {
      message.error('Error al cargar los datos del mes');
    }
  };

  const descargarPdfCierre = () => {
    if (!detalleCierreContext) return;
    generarPdfCierreMensual({
      nombreEmpleado: detalleCierreContext.nombreEmpleado,
      mes: detalleCierreContext.mes,
      registros: registroHoras,
      totalHoras,
      totalHorasEsperadas,
      resumenHoras,
      firmaImagen: firmaCierreDetalle?.firma_imagen,
      firmaHash: firmaCierreDetalle?.firma_hash,
      hashRegistroMes: firmaCierreDetalle?.hash_registro_mes,
      fechaSolicitud: detalleCierreContext.fechaSolicitud,
      estado: detalleCierreContext.estado,
    });
  };

  const columnsDetalles = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
    { title: 'Hora Entrada', dataIndex: 'hora_entrada', key: 'hora_entrada' },
    { title: 'Hora Salida', dataIndex: 'hora_salida', key: 'hora_salida' },
    { title: 'Dif. Tiempo', dataIndex: 'dif_tiempo', key: 'dif_tiempo' },
  ];

  const columnsCorreccion = useMemo(() => {
    const columnas = [
      {
        title: 'Fecha solicitud',
        dataIndex: 'fecha_alta',
        key: 'fecha_alta',
        render: (fecha) => formatearFecha(fecha),
        sorter: (a, b) => dayjs(a.fecha_alta).valueOf() - dayjs(b.fecha_alta).valueOf(),
        defaultSortOrder: 'descend',
      },
      {
        title: 'Entrada original',
        key: 'entrada_original',
        render: (_, record) => formatearFecha(record.entrada_original),
      },
      {
        title: 'Salida original',
        key: 'salida_original',
        render: (_, record) => formatearFecha(record.salida_original),
      },
      {
        title: 'Entrada solicitada',
        key: 'entrada_solicitada',
        render: (_, record) => formatearFecha(record.nueva_entrada),
      },
      {
        title: 'Salida solicitada',
        key: 'salida_solicitada',
        render: (_, record) => formatearFecha(record.nueva_salida),
      },
      {
        title: 'Justificación',
        dataIndex: 'justificacion',
        key: 'justificacion',
        render: (text) => (
          <Tooltip title={text}>
            {text?.length > 40 ? `${text.slice(0, 40)}...` : text}
          </Tooltip>
        ),
      },
      {
        title: 'Estado',
        key: 'estado',
        render: (_, record) => {
          const estado = obtenerEstado(record);
          return <Tag color={colorEstadoTag(estado)}>{estado}</Tag>;
        },
      },
      {
        title: 'Motivo rechazo',
        key: 'motivo_rechazo',
        render: (_, record) => (
          <Tooltip title={record.motivo_rechazo}>
            {record.motivo_rechazo?.length > 40
              ? `${record.motivo_rechazo.slice(0, 40)}...`
              : record.motivo_rechazo || '—'}
          </Tooltip>
        ),
      },
      {
        title: 'Fecha resolución',
        key: 'fecha_resolucion',
        render: (_, record) => formatearFecha(obtenerFechaResolucionItem(record)),
      },
    ];

    const ocultarPorEstado = {
      pendientes: ['fecha_resolucion', 'motivo_rechazo'],
      aprobadas: ['motivo_rechazo'],
      rechazadas: [],
    };
    const ocultar = ocultarPorEstado[estadoFiltro];

    if (ocultar?.length) {
      return columnas.filter((col) => !ocultar.includes(col.key));
    }

    return columnas;
  }, [estadoFiltro]);

  const columnsAusencias = useMemo(() => {
    const columnas = [
      {
        title: 'Tipo',
        dataIndex: 'tipo',
        key: 'tipo',
      },
      {
        title: 'Desde',
        dataIndex: 'fecha_desde',
        key: 'fecha_desde',
        render: formatFechaAusencia,
      },
      {
        title: 'Hasta',
        dataIndex: 'fecha_hasta',
        key: 'fecha_hasta',
        render: formatFechaAusencia,
      },
      {
        title: 'Días',
        dataIndex: 'dias',
        key: 'dias',
        width: 72,
        align: 'center',
      },
      {
        title: 'Fecha solicitud',
        dataIndex: 'fecha_alta',
        key: 'fecha_alta',
        render: (fecha) => formatearFecha(fecha),
      },
      {
        title: 'Estado',
        key: 'estado',
        render: (_, record) => {
          const estado = obtenerEstado(record);
          return <Tag color={colorEstadoTag(estado)}>{estado}</Tag>;
        },
      },
      {
        title: 'Motivo rechazo',
        key: 'motivo_rechazo',
        render: (_, record) => record.motivo_rechazo || '—',
      },
      {
        title: 'Fecha resolución',
        key: 'fecha_resolucion',
        render: (_, record) => formatearFecha(obtenerFechaResolucionItem(record)),
      },
    ];

    const ocultarPorEstado = {
      pendientes: ['fecha_resolucion', 'motivo_rechazo'],
      aprobadas: ['motivo_rechazo'],
      rechazadas: [],
    };
    const ocultar = ocultarPorEstado[estadoFiltro];
    if (ocultar?.length) {
      return columnas.filter((col) => !ocultar.includes(col.key));
    }
    return columnas;
  }, [estadoFiltro]);

  const columnsCierreMensual = [
    {
      title: 'Mes',
      dataIndex: 'mes',
      key: 'mes',
      render: (mes) => dayjs(mes).format('MMMM [de] YYYY'),
    },
    {
      title: 'Fecha petición',
      dataIndex: 'fecha_alta',
      key: 'fecha_alta',
      render: (fecha) => formatearFecha(fecha),
      sorter: (a, b) => dayjs(a.fecha_alta).valueOf() - dayjs(b.fecha_alta).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Estado',
      key: 'estado',
        render: (_, record) => {
          const estado = obtenerEstado(record);
          return (
            <span className="notif-estado-cell">
              <Tag color={colorEstadoTag(estado)}>{estado}</Tag>
              {record.firma_hash && <Tag color="blue">Firmado</Tag>}
            </span>
          );
        },
      },
      {
        title: 'Fecha resolución',
        key: 'fecha_resolucion',
        render: (_, record) => formatearFecha(obtenerFechaResolucionItem(record)),
      },
      {
        title: 'Detalle',
        key: 'detalle',
      width: 100,
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          onClick={() => setVisibleModalDetalles(record)}
          aria-label="Ver registro mensual"
        />
      ),
    },
  ];

  return (
    <div className="notif-layout">
      <Title level={3} className="notif-layout__title">
        Notificaciones
      </Title>

      <Menu
        className="notif-submenu"
        mode="horizontal"
        selectedKeys={[activeTab]}
        items={submenuItems}
        onClick={handleTabChange}
      />

      <div className="notif-stats-row">
        <div className="notif-stats">
          <button
            type="button"
            className={`notif-stat notif-stat--pendiente${estadoFiltro === 'pendientes' ? ' notif-stat--active' : ''}`}
            onClick={() => seleccionarEstadoRapido('pendientes')}
          >
            <span className="notif-stat-value">{contadoresActivos.pendientes}</span>
            <span className="notif-stat-label">Pendientes</span>
          </button>
          <button
            type="button"
            className={`notif-stat notif-stat--aprobada${estadoFiltro === 'aprobadas' ? ' notif-stat--active' : ''}`}
            onClick={() => seleccionarEstadoRapido('aprobadas')}
          >
            <span className="notif-stat-value">{contadoresActivos.aprobadas}</span>
            <span className="notif-stat-label">Aprobadas</span>
          </button>
          <button
            type="button"
            className={`notif-stat notif-stat--rechazada${estadoFiltro === 'rechazadas' ? ' notif-stat--active' : ''}`}
            onClick={() => seleccionarEstadoRapido('rechazadas')}
          >
            <span className="notif-stat-value">{contadoresActivos.rechazadas}</span>
            <span className="notif-stat-label">Rechazadas</span>
          </button>
        </div>
        <Popover
          content={contenidoFiltro}
          trigger="click"
          placement="bottomRight"
          open={filtroAbierto}
          onOpenChange={handleFiltroOpenChange}
          overlayClassName="notif-filter-popover"
        >
          <Badge dot={filtrosAvanzadosActivos} offset={[-2, 2]}>
            <Button
              type="text"
              className="notif-filter-btn"
              icon={<FilterOutlined />}
              aria-label="Abrir filtros"
            />
          </Badge>
        </Popover>
      </div>

      <Spin spinning={loading}>
        {activeTab === 'horarios' ? (
          <Table
            className="notif-table"
            columns={columnsCorreccion}
            dataSource={correccionesFiltradas}
            rowKey="id_peticion"
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            scroll={{ x: 1100 }}
            size="middle"
          />
        ) : activeTab === 'cierres' ? (
          <Table
            className="notif-table"
            columns={columnsCierreMensual}
            dataSource={cierresFiltrados}
            rowKey={(record) => `${record.empresa_id}-${record.id_mes_cierre}`}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            size="middle"
          />
        ) : (
          <Table
            className="notif-table"
            columns={columnsAusencias}
            dataSource={ausenciasFiltradas}
            rowKey={(record) => `${record.empresa_id}-${record.id_ausencia}`}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            scroll={{ x: 900 }}
            size="middle"
          />
        )}
      </Spin>

      <Modal
        open={visible}
        onCancel={() => {
          setVisible(false);
          setFirmaCierreDetalle(null);
          setDetalleCierreContext(null);
          setResumenHoras(null);
        }}
        footer={null}
        width="80%"
        className="notif-modal"
        destroyOnClose
      >
        <Card
          title={<Title className="notif-modal-title" level={2}>Registro mensual</Title>}
          extra={(
            <Button
              type="default"
              icon={<DownloadOutlined />}
              onClick={descargarPdfCierre}
              disabled={!detalleCierreContext}
            >
              Descargar PDF
            </Button>
          )}
        >
          <Table
            columns={columnsDetalles}
            dataSource={registroHoras}
            rowKey="fecha"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />
          <div className="notif-totales">
            <span className="notif-total-sep">Total de horas trabajadas: {totalHoras}</span>
            <span>Total de horas esperadas: {totalHorasEsperadas}</span>
            {resumenHoras?.tipo_hora_label && (
              <span>Tipo de hora: {resumenHoras.tipo_hora_label}
                {resumenHoras.tipo_hora_origen === 'membresia' ? ' (personal)' : resumenHoras.tipo_hora_origen === 'jornada' ? ' (jornada)' : ''}
              </span>
            )}
            {resumenHoras?.desglose && (
              <span>{resumenHoras.desglose}</span>
            )}
            {resumenHoras?.saldo_bolsa && (
              <span>Saldo bolsa acumulado: {resumenHoras.saldo_bolsa}</span>
            )}
          </div>
          {firmaCierreDetalle?.firmado && (
            <div className="notif-firma-cierre">
              <p className="notif-firma-cierre__titulo">Tu firma en esta solicitud</p>
              {firmaCierreDetalle.firma_imagen && (
                <img
                  src={firmaCierreDetalle.firma_imagen}
                  alt="Tu firma"
                  className="notif-firma-cierre__img"
                />
              )}
              <p className="notif-firma-cierre__hash">
                Huella de firma: <code>{firmaCierreDetalle.firma_hash}</code>
              </p>
            </div>
          )}
        </Card>
      </Modal>
    </div>
  );
};

export default NotificacionesEmpleado;
