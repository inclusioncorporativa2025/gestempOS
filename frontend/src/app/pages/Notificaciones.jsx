import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Button, Table, Modal, Menu, Spin, Form,
  Typography, message, Popconfirm, Tooltip, DatePicker, Input, Popover, Badge, Radio, Tag
} from 'antd';
import GradientButton from '../components/shared/GradientButton';
import { EyeOutlined, SearchOutlined, FilterOutlined, CalendarOutlined, CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';

import {
  getPeticionesByIdEmpresa,
  responderPeticion,
  getCierresMensualesByIdEmpresa,
  getHistorialCierresMensuales,
  getDatosUsuarioMes,
  responderPeticionCierre,
  getHistorialEdicionesHorario,
  getFirmaCierreMensual,
} from '../../features/fichaje/fichajeService';
import { notifyNotificacionesActualizadas } from '../../hooks/useNotificacionesPendientes';
import { parseFechaFichaje } from '../../utils/fechaFichaje';

import {
   getHorasTotalesMesByIdUsuario,

} from '../../features/user/usuarioService';
import { useAuth } from '../../config/AuthContext';
import {
  puedeAprobarSolicitudesEmpresaSesion,
  esEmpleadoNotificacionesSesion,
} from '../../utils/tipoUsuarioLabel';
import { generarPdfCierreMensual } from '../../utils/generarPdfCierreMensual';
import NotificacionesEmpleado from './NotificacionesEmpleado';
import { usePlan } from '../../hooks/usePlan';
import {
  getAusenciasPendientesEmpresa,
  getHistorialAusenciasEmpresa,
  responderAusencia,
  formatDiasAusencia,
} from '../../features/ausencias/ausenciasService';
import JustificanteAusenciaAcciones from '../components/JustificanteAusenciaAcciones';
import { requiereJustificanteParaAprobar } from '../../constants/tiposAusencia';
import './Notificaciones.css';

dayjs.locale('es');
dayjs.extend(utc);
dayjs.extend(timezone);

const { Title } = Typography;
const { RangePicker } = DatePicker;

const filtrarPorRango = (items, campoFecha, rango, obtenerFecha) => {
  if (!rango?.[0] || !rango?.[1]) return items;
  const desde = rango[0].startOf('day');
  const hasta = rango[1].endOf('day');
  return items.filter((item) => {
    const raw = obtenerFecha ? obtenerFecha(item) : item[campoFecha];
    const fecha = dayjs(raw);
    return (
      fecha.isValid()
      && !fecha.isBefore(desde)
      && !fecha.isAfter(hasta)
    );
  });
};

const obtenerFechaResolucionItem = (item) =>
  item.fecha_aceptacion || item.fecha_cancelacion;

const ordenarPorReciente = (items, campoFecha) =>
  [...items].sort(
    (a, b) => dayjs(b[campoFecha]).valueOf() - dayjs(a[campoFecha]).valueOf(),
  );

const normalizarTexto = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const filtrarPorNombre = (items, obtenerNombre, termino) => {
  const busqueda = normalizarTexto(termino);
  if (!busqueda) return items;
  return items.filter((item) => normalizarTexto(obtenerNombre(item)).includes(busqueda));
};

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

const obtenerNombreCorreccion = (item) =>
  item.fichaje?.usuario?.nombre || item.solicitante?.nombre || '';

const combinarCierres = (pendientes, historial) => {
  const ids = new Set();
  const merged = [];
  [...(pendientes || []), ...(historial || [])].forEach((item) => {
    const key = `${item.empresa_id}-${item.id_mes_cierre}`;
    if (!ids.has(key)) {
      ids.add(key);
      merged.push(item);
    }
  });
  return merged;
};

const combinarAusencias = (pendientes, historial) => {
  const ids = new Set();
  const merged = [];
  [...(pendientes || []), ...(historial || [])].forEach((item) => {
    const key = `${item.empresa_id}-${item.id_ausencia}`;
    if (!ids.has(key)) {
      ids.add(key);
      merged.push(item);
    }
  });
  return merged;
};

const formatFechaAusencia = (valor) => {
  if (!valor) return '—';
  const fecha = dayjs(valor, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);
  return fecha.isValid() ? fecha.format('DD/MM/YYYY') : valor;
};

const NotificacionesGestor = () => {
  const { user } = useAuth();
  const { tieneFeature } = usePlan();
  const puedeAprobarComoGestor = puedeAprobarSolicitudesEmpresaSesion(user);
  const puedeVerAusencias = tieneFeature('ausencias_basicas');
const [peticiones, setPeticiones] = useState([]);
const [historialEdiciones, setHistorialEdiciones] = useState([]);
const [cierresMensuales, setCierresMensuales] = useState([]);
const [historialCierres, setHistorialCierres] = useState([]);
const [ausenciasPendientes, setAusenciasPendientes] = useState([]);
const [historialAusencias, setHistorialAusencias] = useState([]);
const [loadingAusencias, setLoadingAusencias] = useState(true);
const [loadingHistorialAusencias, setLoadingHistorialAusencias] = useState(true);
const [loading, setLoading] = useState(true);
const [loadingHistorial, setLoadingHistorial] = useState(true);
const [loadingHistorialCierres, setLoadingHistorialCierres] = useState(true);
const [visible, setVisible] = useState(false);
const [registroHoras, setRegistroHoras] = useState([]);
const [totalHoras, setTotalHoras] = useState('');
const [totalHorasEsperadas, setTotalHorasEsperadas] = useState(0);
const [resumenHoras, setResumenHoras] = useState(null);
const [firmaCierreDetalle, setFirmaCierreDetalle] = useState(null);
const [detalleCierreContext, setDetalleCierreContext] = useState(null);
const [rangoFechas, setRangoFechas] = useState(null);
const [busquedaNombre, setBusquedaNombre] = useState('');
const [filtroAbierto, setFiltroAbierto] = useState(false);
const [calendarioAbierto, setCalendarioAbierto] = useState(false);
const [estadoFiltro, setEstadoFiltro] = useState('todas');
const [campoFechaRango, setCampoFechaRango] = useState('fecha_alta');
const [rangoFechasDraft, setRangoFechasDraft] = useState(null);
const [estadoFiltroDraft, setEstadoFiltroDraft] = useState('todas');
const [campoFechaRangoDraft, setCampoFechaRangoDraft] = useState('fecha_alta');
const [activeTab, setActiveTab] = useState('horarios');
const [rechazoModalAbierto, setRechazoModalAbierto] = useState(false);
const [rechazoTarget, setRechazoTarget] = useState(null);
const [rechazando, setRechazando] = useState(false);
const [formRechazo] = Form.useForm();

  const todasCorrecciones = useMemo(
    () => combinarCorrecciones(peticiones, historialEdiciones),
    [peticiones, historialEdiciones],
  );

  const todosCierres = useMemo(
    () => combinarCierres(cierresMensuales, historialCierres),
    [cierresMensuales, historialCierres],
  );

  const todasAusencias = useMemo(
    () => combinarAusencias(ausenciasPendientes, historialAusencias),
    [ausenciasPendientes, historialAusencias],
  );

  const submenuItems = useMemo(() => {
    const items = [
      { key: 'horarios', label: 'Cambios de horarios' },
      { key: 'cierres', label: 'Cierres mensuales' },
    ];
    if (puedeVerAusencias) {
      items.push({ key: 'ausencias', label: 'Ausencias' });
    }
    return items;
  }, [puedeVerAusencias]);

  const contadoresActivos = useMemo(() => {
    const items = activeTab === 'horarios'
      ? todasCorrecciones
      : activeTab === 'cierres'
        ? todosCierres
        : todasAusencias;
    return {
      pendientes: items.filter(
        (item) => !item.fecha_aceptacion && !item.fecha_cancelacion,
      ).length,
      aprobadas: items.filter((item) => item.fecha_aceptacion).length,
      rechazadas: items.filter((item) => item.fecha_cancelacion).length,
    };
  }, [activeTab, todasCorrecciones, todosCierres, todasAusencias]);

  const campoFechaActivo = campoFechaRango === 'fecha_resolucion'
    ? null
    : campoFechaRango;
  const obtenerFechaFiltro = campoFechaRango === 'fecha_resolucion'
    ? obtenerFechaResolucionItem
    : null;

  const correccionesFiltradas = useMemo(
    () => ordenarPorReciente(
      filtrarPorNombre(
        filtrarPorRango(
          filtrarPorEstado(todasCorrecciones, estadoFiltro),
          campoFechaActivo,
          rangoFechas,
          obtenerFechaFiltro,
        ),
        obtenerNombreCorreccion,
        busquedaNombre,
      ),
      'fecha_alta',
    ),
    [todasCorrecciones, estadoFiltro, rangoFechas, busquedaNombre, campoFechaRango],
  );

  const cierresFiltrados = useMemo(
    () => ordenarPorReciente(
      filtrarPorNombre(
        filtrarPorRango(
          filtrarPorEstado(todosCierres, estadoFiltro),
          'fecha_alta',
          rangoFechas,
        ),
        (item) => item.nombre_usuario_alta,
        busquedaNombre,
      ),
      'fecha_alta',
    ),
    [todosCierres, rangoFechas, busquedaNombre, estadoFiltro],
  );

  const ausenciasFiltradas = useMemo(
    () => ordenarPorReciente(
      filtrarPorNombre(
        filtrarPorRango(
          filtrarPorEstado(todasAusencias, estadoFiltro),
          campoFechaActivo,
          rangoFechas,
          obtenerFechaFiltro,
        ),
        (item) => item.nombre_usuario,
        busquedaNombre,
      ),
      'fecha_alta',
    ),
    [todasAusencias, estadoFiltro, rangoFechas, busquedaNombre, campoFechaRango],
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
    <div
      className="notif-mini-calendar-panel"
      onClick={(e) => e.stopPropagation()}
    >
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

  useEffect(() => {
    fetchPeticiones();
    fetchCierresMensuales();
    fetchHistorialEdiciones();
    fetchHistorialCierres();
    if (puedeVerAusencias) {
      fetchAusenciasPendientes();
      fetchHistorialAusencias();
    }
  }, [puedeVerAusencias]);

  const fetchAusenciasPendientes = async () => {
    try {
      const response = await getAusenciasPendientesEmpresa();
      setAusenciasPendientes(response.ausencias || []);
    } catch (error) {
      message.error('Error al obtener ausencias pendientes');
    } finally {
      setLoadingAusencias(false);
    }
  };

  const fetchHistorialAusencias = async () => {
    try {
      const response = await getHistorialAusenciasEmpresa();
      setHistorialAusencias(response.ausencias || []);
    } catch (error) {
      message.error('Error al obtener historial de ausencias');
    } finally {
      setLoadingHistorialAusencias(false);
    }
  };

  const fetchHistorialCierres = async () => {
    try {
      const response = await getHistorialCierresMensuales();
      setHistorialCierres(response.info || []);
    } catch (error) {
      message.error('Error al obtener historial de cierres mensuales');
    } finally {
      setLoadingHistorialCierres(false);
    }
  };

  const fetchHistorialEdiciones = async () => {
    try {
      const response = await getHistorialEdicionesHorario();
      setHistorialEdiciones(response.data || []);
    } catch (error) {
      message.error('Error al obtener historial de modificaciones');
    } finally {
      setLoadingHistorial(false);
    }
  };

  const fetchPeticiones = async () => {
    try {
      const response = await getPeticionesByIdEmpresa();
      setPeticiones(response.data);
    } catch (error) {
      message.error('Error al obtener peticiones');
    }
  };

const setVisibleModalDetalles = async (info) => {
  try {
    setFirmaCierreDetalle(null);
    setResumenHoras(null);
    setDetalleCierreContext({
      nombreEmpleado: info.nombre_usuario_alta || '—',
      mes: info.mes,
      estado: obtenerEstado(info),
      fechaSolicitud: info.fecha_alta,
    });
    const response = await getDatosUsuarioMes(info.usuario_alta, info.mes);
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
        minutos: minutosTrabajados
      };
    });

    // Ordenar por fecha descendente
    registrosConDetalles.sort((a, b) => dayjs(b.fecha, 'DD/MM/YYYY').valueOf() - dayjs(a.fecha, 'DD/MM/YYYY').valueOf());

    // Calcular total horas trabajadas
    const minutosTotales = registrosConDetalles.reduce((sum, item) => sum + (item.minutos || 0), 0);
    const totalHorasTexto = `${Math.floor(minutosTotales / 60)}h ${minutosTotales % 60}m`;

    const jornadaUsuario = await getHorasTotalesMesByIdUsuario(info.mes, info.usuario_alta);
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
    message.error('Error al cargar los datos del usuario');
  }
};


//     const cargarDatosUsuario = (record) => {
//         setVisible(true);
//         setEditingRecord(record);
//         getDatosUsuarioById(record.id_usuario).then((result) => {
//             const filteredHoras = result.info.filter((item) => {
//                 const fechaEntrada = dayjs(item.fecha_entrada);
//                 return fechaEntrada.isSame(dayjs(), 'month');
//             });
//             const registrosConDetalles = filteredHoras.map((item) => {
//                 const horaEntrada = dayjs(item.fecha_entrada);
//                 const horaSalida = item.fecha_salida ? dayjs(item.fecha_salida) : null;
//                 let dif_tiempo = 'No registrada';
//                 if (horaSalida && horaEntrada.isValid() && horaSalida.isValid()) {
//                     const diffMinutes = horaSalida.diff(horaEntrada, 'minute');
//                     const horas = Math.floor(diffMinutes / 60);
//                     const minutos = diffMinutes % 60;
//                     dif_tiempo = `${horas}h ${minutos}m`;
//                 }
//                 return {
//                     fecha: horaEntrada.format('DD/MM/YYYY'),
//                     hora_entrada: horaEntrada.format('HH:mm'),
//                     hora_salida: horaSalida ? horaSalida.format('HH:mm') : 'No registrada',
//                     tipo_entrada: item.tipo_entrada,
//                     tipo_salida: item.tipo_salida,
//                     dif_tiempo,
//                 };
//             });
// registrosConDetalles.sort((a, b) => dayjs(b.fecha, 'DD/MM/YYYY').valueOf() - dayjs(a.fecha, 'DD/MM/YYYY').valueOf());
//             setRegistroHoras(registrosConDetalles);
//             calcularHorasTotales(registrosConDetalles,record.id_usuario);
//         });
//     };


  const fetchCierresMensuales = async () => {
    try {
      const response = await getCierresMensualesByIdEmpresa();
      setCierresMensuales(response.info);
    } catch (error) {
      message.error('Error al obtener cierres mensuales');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    return fecha ? dayjs(fecha).tz('Europe/Madrid').format('DD/MM/YYYY HH:mm') : '-';
  };

  const obtenerEstado = (record) => {
    if (record.fecha_aceptacion) return 'Aprobada';
    if (record.fecha_cancelacion) return 'Rechazada';
    return 'Pendiente';
  };

  const handleRespuesta = async (peticion, estado) => {
    try {
      await responderPeticion(peticion, estado);
      message.success(`Petición ${estado === 2 ? 'aprobada' : 'rechazada'} correctamente`);
      fetchPeticiones();
      fetchHistorialEdiciones();
      notifyNotificacionesActualizadas();
    } catch (error) {
      message.error(error.message || 'Error al procesar la petición');
    }
  };

  const abrirModalRechazo = (target) => {
    setRechazoTarget({ tipo: 'peticion', record: target });
    formRechazo.resetFields();
    setRechazoModalAbierto(true);
  };

  const abrirModalRechazoAusencia = (ausencia) => {
    setRechazoTarget({ tipo: 'ausencia', record: ausencia });
    formRechazo.resetFields();
    setRechazoModalAbierto(true);
  };

  const cerrarModalRechazo = () => {
    setRechazoModalAbierto(false);
    setRechazoTarget(null);
    formRechazo.resetFields();
  };

  const confirmarRechazo = async () => {
    try {
      const values = await formRechazo.validateFields();
      setRechazando(true);
      if (rechazoTarget?.tipo === 'ausencia') {
        await responderAusencia(rechazoTarget.record, 3, values.motivoRechazo);
        message.success('Solicitud de ausencia rechazada');
        fetchAusenciasPendientes();
        fetchHistorialAusencias();
      } else {
        await responderPeticion(rechazoTarget.record, 3, values.motivoRechazo);
        message.success('Petición rechazada correctamente');
        fetchPeticiones();
        fetchHistorialEdiciones();
      }
      cerrarModalRechazo();
      notifyNotificacionesActualizadas();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.message || 'Error al rechazar la solicitud');
    } finally {
      setRechazando(false);
    }
  };

  const handleRespuestaAusencia = async (ausencia, estado) => {
    try {
      await responderAusencia(ausencia, estado);
      message.success(`Solicitud de ausencia ${estado === 2 ? 'aprobada' : 'rechazada'}`);
      fetchAusenciasPendientes();
      fetchHistorialAusencias();
      notifyNotificacionesActualizadas();
    } catch (error) {
      if (error?.code === 'SALDO_VACACIONES_INSUFICIENTE') {
        message.error(
          error.message
          || `Saldo insuficiente (${error.disponibles ?? '?'} disponibles, ${error.solicitados ?? '?'} solicitados)`,
          6,
        );
        return;
      }
      if (error?.code === 'JUSTIFICANTE_REQUERIDO') {
        message.error(error.message || 'Falta el justificante para aprobar');
        return;
      }
      message.error(error.message || 'Error al procesar la solicitud');
    }
  };

  const handleRespuestaCierre = async (peticion, estado) => {
    try {
      await responderPeticionCierre(peticion, estado);
      message.success(`Cierre mensual ${estado === 2 ? 'aprobado' : 'rechazado'}`);
      fetchCierresMensuales();
      fetchHistorialCierres();
      notifyNotificacionesActualizadas();
    } catch (error) {
      message.error('Error al procesar el cierre mensual');
    }
  };

  const descargarPdfCierre = async () => {
    if (!detalleCierreContext) return;
    try {
      await generarPdfCierreMensual({
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
    } catch (error) {
      console.error('Error al generar PDF de cierre:', error);
    }
  };

  const columnsDetalles = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
        { title: 'Hora Entrada', dataIndex: 'hora_entrada', key: 'hora_entrada' },
        { title: 'Hora Salida', dataIndex: 'hora_salida', key: 'hora_salida' },
        { title: 'Dif. Tiempo', dataIndex: 'dif_tiempo', key: 'dif_tiempo' }
    ];
  const colorEstadoTag = (estado) => {
    if (estado === 'Aprobada') return 'green';
    if (estado === 'Rechazada') return 'red';
    return 'orange';
  };

  const obtenerFechaResolucion = (record) =>
    record.fecha_aceptacion || record.fecha_cancelacion;

  const columnsCorreccion = useMemo(() => {
    const columnas = [
      {
        title: 'Nombre',
        key: 'nombre',
        render: (_, record) => obtenerNombreCorreccion(record) || '-',
      },
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
        render: (_, record) => formatearFecha(record.entrada_original || record.fichaje?.fecha_entrada),
      },
      {
        title: 'Salida original',
        key: 'salida_original',
        render: (_, record) => formatearFecha(record.salida_original || record.fichaje?.fecha_salida),
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
        title: 'Gestor',
        key: 'gestor',
        render: (_, record) => record.gestor?.nombre || '-',
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
        render: (_, record) => formatearFecha(obtenerFechaResolucion(record)),
      },
      {
        title: 'Acciones',
        key: 'acciones',
        fixed: 'right',
        width: 190,
        render: (_, record) => {
          const estado = obtenerEstado(record);
          if (estado !== 'Pendiente') {
            return <span className="notif-procesada">—</span>;
          }
          if (!puedeAprobarComoGestor) {
            return (
              <Tooltip title="Solo un administrador o supervisor puede aprobar">
                <span className="notif-procesada">Pendiente</span>
              </Tooltip>
            );
          }
          return (
            <div className="notif-acciones">
              <Popconfirm
                title="¿Aprobar esta petición?"
                onConfirm={() => handleRespuesta(record, 2)}
                okText="Sí"
                cancelText="No"
              >
              <GradientButton text="Aprobar" size="small" className="notif-btn-compact" />
            </Popconfirm>
            <Button
              danger
              size="small"
              className="notif-btn-compact"
              onClick={() => abrirModalRechazo(record)}
            >
              Rechazar
            </Button>
          </div>
          );
        },
      },
    ];

    const ocultarPorEstado = {
      pendientes: ['gestor', 'fecha_resolucion', 'motivo_rechazo'],
      aprobadas: ['acciones', 'motivo_rechazo'],
      rechazadas: ['acciones'],
    };
    const ocultar = ocultarPorEstado[estadoFiltro];

    if (ocultar?.length) {
      return columnas.filter((col) => !ocultar.includes(col.key));
    }

    return columnas;
  }, [estadoFiltro]);

  const columnsCierreMensual = useMemo(() => {
    const columnas = [
      {
        title: 'Usuario',
        dataIndex: 'nombre_usuario_alta',
        key: 'nombre_usuario_alta',
      },
      {
        title: 'DNI',
        dataIndex: 'dni_usuario_alta',
        key: 'dni_usuario_alta',
      },
      {
        title: 'Mes',
        dataIndex: 'mes',
        key: 'mes',
        render: (mes) => dayjs(mes).format('MMMM [de] YYYY'),
      },
      {
        title: 'Fecha Petición',
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
        render: (_, record) => formatearFecha(obtenerFechaResolucion(record)),
      },
      {
        title: 'Detalle',
        key: 'detalle',
        width: 90,
        render: (_, record) => (
          <Button
            icon={<EyeOutlined />}
            size="small"
            className="notif-btn-compact"
            onClick={() => setVisibleModalDetalles(record)}
          />
        ),
      },
      {
        title: 'Acciones',
        key: 'acciones',
        width: 190,
        fixed: 'right',
        render: (_, record) => {
          const estado = obtenerEstado(record);

          if (estado !== 'Pendiente') {
            return <span className="notif-procesada">—</span>;
          }

          if (!puedeAprobarComoGestor) {
            return (
              <Tooltip title="Solo un administrador o supervisor puede aprobar">
                <span className="notif-procesada">Pendiente</span>
              </Tooltip>
            );
          }

          return (
            <div className="notif-acciones">
              <Popconfirm
                title="¿Aprobar este cierre?"
                onConfirm={() => handleRespuestaCierre(record, 2)}
                okText="Sí"
                cancelText="No"
              >
                <GradientButton text="Aprobar" size="small" className="notif-btn-compact" />
              </Popconfirm>
              <Popconfirm
                title="¿Rechazar este cierre?"
                onConfirm={() => handleRespuestaCierre(record, 3)}
                okText="Sí"
                cancelText="No"
              >
                <Button danger size="small" className="notif-btn-compact">
                  Rechazar
                </Button>
              </Popconfirm>
            </div>
          );
        },
      },
    ];

    const ocultarPorEstado = {
      pendientes: ['fecha_resolucion'],
      aprobadas: ['acciones'],
      rechazadas: ['acciones'],
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
        title: 'Empleado',
        dataIndex: 'nombre_usuario',
        key: 'nombre_usuario',
        render: (nombre) => nombre || '—',
      },
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
        render: formatDiasAusencia,
      },
      {
        title: 'Justificante',
        key: 'justificante',
        width: 200,
        render: (_, record) => (
          <JustificanteAusenciaAcciones
            ausencia={record}
            compact
            onActualizado={() => {
              fetchAusenciasPendientes();
              fetchHistorialAusencias();
            }}
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
        render: (_, record) => formatearFecha(obtenerFechaResolucion(record)),
      },
      {
        title: 'Acciones',
        key: 'acciones',
        fixed: 'right',
        width: 190,
        render: (_, record) => {
          const estado = obtenerEstado(record);
          const requiereDoc = record.requiere_justificante
            ?? requiereJustificanteParaAprobar(record.tipo);
          const cumpleJustificante = !requiereDoc || record.tiene_justificante;

          if (estado !== 'Pendiente') {
            return <span className="notif-procesada">—</span>;
          }

          if (!puedeAprobarComoGestor) {
            return (
              <Tooltip title="Solo un administrador o supervisor puede aprobar">
                <span className="notif-procesada">Pendiente</span>
              </Tooltip>
            );
          }

          return (
            <div className="notif-acciones">
              {cumpleJustificante ? (
                <Popconfirm
                  title="¿Aprobar esta ausencia?"
                  onConfirm={() => handleRespuestaAusencia(record, 2)}
                  okText="Sí"
                  cancelText="No"
                >
                  <GradientButton text="Aprobar" size="small" className="notif-btn-compact" />
                </Popconfirm>
              ) : (
                <Tooltip title="El empleado debe subir el justificante antes de aprobar">
                  <span>
                    <GradientButton
                      text="Aprobar"
                      size="small"
                      className="notif-btn-compact"
                      disabled
                    />
                  </span>
                </Tooltip>
              )}
              <Button
                danger
                size="small"
                className="notif-btn-compact"
                onClick={() => abrirModalRechazoAusencia(record)}
              >
                Rechazar
              </Button>
            </div>
          );
        },
      },
    ];

    const ocultarPorEstado = {
      pendientes: ['fecha_resolucion', 'motivo_rechazo'],
      aprobadas: ['acciones', 'motivo_rechazo'],
      rechazadas: ['acciones'],
    };
    const ocultar = ocultarPorEstado[estadoFiltro];
    if (ocultar?.length) {
      return columnas.filter((col) => !ocultar.includes(col.key));
    }
    return columnas;
  }, [estadoFiltro]);

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

      <Input
        className="notif-search"
        placeholder="Buscar por nombre"
        prefix={<SearchOutlined />}
        value={busquedaNombre}
        onChange={(e) => setBusquedaNombre(e.target.value)}
        allowClear
        aria-label="Buscar por nombre"
      />

      <Spin spinning={
        activeTab === 'horarios'
          ? (loading || loadingHistorial)
          : activeTab === 'cierres'
            ? (loading || loadingHistorialCierres)
            : (loadingAusencias || loadingHistorialAusencias)
      }>
        {activeTab === 'horarios' ? (
          <Table
            className="notif-table"
            columns={columnsCorreccion}
            dataSource={correccionesFiltradas}
            rowKey="id_peticion"
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            scroll={{ x: 1300 }}
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
            scroll={{ x: 1200 }}
            size="middle"
          />
        )}
      </Spin>

      <Modal
            open={visible}
            onCancel={() => {
              setVisible(false);
              setFirmaCierreDetalle(null);
              setResumenHoras(null);
              setDetalleCierreContext(null);
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
                </div>
                {firmaCierreDetalle?.firmado && (
                  <div className="notif-firma-cierre">
                    <p className="notif-firma-cierre__titulo">Solicitud firmada por el personal</p>
                    {firmaCierreDetalle.firma_imagen && (
                      <img
                        src={firmaCierreDetalle.firma_imagen}
                        alt="Firma del personal"
                        className="notif-firma-cierre__img"
                      />
                    )}
                    <p className="notif-firma-cierre__hash">
                      Huella de firma: <code>{firmaCierreDetalle.firma_hash}</code>
                    </p>
                    <p className="notif-firma-cierre__hash">
                      Hash del registro del mes: <code>{firmaCierreDetalle.hash_registro_mes}</code>
                    </p>
                  </div>
                )}
            </Card>
        </Modal>

      <Modal
        title="Motivo del rechazo"
        open={rechazoModalAbierto}
        onCancel={cerrarModalRechazo}
        onOk={confirmarRechazo}
        okText="Rechazar solicitud"
        cancelText="Cancelar"
        okButtonProps={{ danger: true, loading: rechazando }}
        destroyOnClose
      >
        <p className="notif-rechazo-ayuda">
          Indica el motivo para que el personal pueda consultarlo en su registro.
        </p>
        <Form form={formRechazo} layout="vertical">
          <Form.Item
            name="motivoRechazo"
            label="Motivo"
            rules={[
              { required: true, message: 'El motivo del rechazo es obligatorio' },
              { min: 5, message: 'Escribe al menos 5 caracteres' },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={500}
              showCount
              placeholder="Ej.: El horario solicitado no coincide con el registro del centro..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const Notificaciones = () => {
  const { user } = useAuth();

  if (esEmpleadoNotificacionesSesion(user) && !puedeAprobarSolicitudesEmpresaSesion(user)) {
    return <NotificacionesEmpleado />;
  }
  if (puedeAprobarSolicitudesEmpresaSesion(user)) {
    return <NotificacionesGestor />;
  }
  return null;
};

export default Notificaciones;
