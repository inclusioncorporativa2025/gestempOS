import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Card, Table, Button, Row, Col, Modal, Form, Input, TimePicker, message, notification, Select, DatePicker, Checkbox, Collapse, Empty, Dropdown, Tooltip, Tag, Radio, Typography } from 'antd';
import {
  MoreOutlined,
  ExportOutlined,
  PlusCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';
import { crearPeticionEdicion, crearPeticionCierreMes, getPeticionesByIdUsuario, getPeticionesByIdEmpresa, marcarPeticionesVistas } from "../../features/fichaje/fichajeService";
import { getDatosUsuarioById } from "../../features/fichaje/fichajeService";
import { descargarExcelDesdeAPI, getHorasTotalesMesByIdUsuario } from "../../features/user/usuarioService";
import { crearAusencia } from "../../features/ausencias/ausenciasService";

import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/es';
import { getIdUsuario, getIdEmpresa, getNombreUsuario } from '../../utils/authSession';
import { parseFechaFichaje } from '../../utils/fechaFichaje';
import { parseUbicacionCoords } from '../../utils/ubicacion';
import { notifyNotificacionesActualizadas } from '../../hooks/useNotificacionesPendientes';
import usePlan from '../../hooks/usePlan';
import {
  esTipoVacaciones,
  getTiposAusenciaSeleccionables,
  requiereComentarioAusencia,
} from '../../constants/tiposAusencia';
import { DECLARACION_CIERRE_MENSUAL, ETIQUETA_CONFIRMACION_CIERRE } from '../../utils/cierreMensualLegal';
import { generarPdfCierreMensual } from '../../utils/generarPdfCierreMensual';
import UbicacionMapModal from '../components/UbicacionMapModal';
import SignaturePad from '../components/shared/SignaturePad';
import './TimeLogsPanel.css';
import moment from 'moment';

dayjs.extend(isSameOrBefore);
dayjs.locale('es');

const formatEtiquetaDia = (dateStr) => {
  const d = dayjs(dateStr, 'DD/MM/YYYY');
  if (!d.isValid()) return dateStr || 'Sin fecha';
  const dia = d.format('dddd');
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${dateStr}`;
};

const esFechaHoy = (dateStr) => {
  const d = dayjs(dateStr, 'DD/MM/YYYY');
  return d.isValid() && d.isSame(dayjs(), 'day');
};

const calcularDifTiempo = (entrada, salida) => {
  if (!entrada?.isValid() || !salida?.isValid()) return '';
  const diffMs = salida.diff(entrada);
  if (diffMs < 0) return '';
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMin = Math.floor((diffMs / (1000 * 60)) % 60);
  return `${diffHrs}h ${diffMin}min`;
};

const formatearFechaHoraHistorial = (fecha) => {
  if (!fecha) return '-';
  const d = parseFechaFichaje(fecha);
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : '-';
};

const textoTooltipEstadoEdicion = (historial) => {
  if (!historial) return '';
  const origEntrada = formatearFechaHoraHistorial(historial.entrada_original);
  const origSalida = formatearFechaHoraHistorial(historial.salida_original);
  const nuevaEntrada = formatearFechaHoraHistorial(historial.nueva_entrada);
  const nuevaSalida = formatearFechaHoraHistorial(historial.nueva_salida);
  if (historial.fecha_aceptacion) {
    return `Solicitud aprobada\nEntrada: ${origEntrada} → ${nuevaEntrada}\nSalida: ${origSalida} → ${nuevaSalida}`;
  }
  if (historial.fecha_cancelacion) {
    const motivo = historial.motivo_rechazo
      ? `\nMotivo: ${historial.motivo_rechazo}`
      : '';
    return `Solicitud rechazada\nSe solicitó:\nEntrada: ${origEntrada} → ${nuevaEntrada}\nSalida: ${origSalida} → ${nuevaSalida}${motivo}`;
  }
  return '';
};

const obtenerEstadoSolicitud = (peticion) => {
  if (peticion.fecha_aceptacion) return 'Aprobada';
  if (peticion.fecha_cancelacion) return 'Rechazada';
  return 'Pendiente';
};

const colorEstadoSolicitud = (estado) => {
  if (estado === 'Aprobada') return 'green';
  if (estado === 'Rechazada') return 'red';
  return 'orange';
};

const mesTieneCierreActivo = (mesesCierre, mesFormateado) =>
  (mesesCierre || []).some(
    (mc) => mc.mes === mesFormateado && !mc.fecha_cancelacion,
  );

const TimeLogsPanel = () => {
    const { planId, tieneFeature } = usePlan();
    const puedeAusencias = tieneFeature('ausencias_basicas');
    const entradasAusencia = useMemo(
      () => getTiposAusenciaSeleccionables(planId),
      [planId],
    );

    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);  // Estado para habilitar/deshabilitar el botón Enviar
    const [fichajesConPeticion, setFichajesConPeticion] = useState([]);
    const [historialPorFichaje, setHistorialPorFichaje] = useState({});
    const [solicitudesHorario, setSolicitudesHorario] = useState([]);
const [mesesCierre, setMesesCierre] = useState([]);
const [exportModalVisible, setExportModalVisible] = useState(false);
const [absenceModalVisible, setAbsenceModalVisible] = useState(false);

const [exportDateRange, setExportDateRange] = useState(null);
const [absenceFechaDesde, setAbsenceFechaDesde] = useState(null);
const [absenceFechaHasta, setAbsenceFechaHasta] = useState(null);
const [id_usuario, setIdUsuario] = useState(null);
const [comentario, setComentario] = useState("");

const [selectedEntrada, setSelectedEntrada] = useState(null);
  const [fraccionDia, setFraccionDia] = useState('completo');
  const [todoElDia, setTodoElDia] = useState(false);
  const [horaDesde, setHoraDesde] = useState(null);
  const [horaHasta, setHoraHasta] = useState(null);
const [diasExpandidos, setDiasExpandidos] = useState([]);
const [mapModalOpen, setMapModalOpen] = useState(false);
const [mapUbicacion, setMapUbicacion] = useState(null);
const [cierreModalOpen, setCierreModalOpen] = useState(false);
const [firmaCierre, setFirmaCierre] = useState(null);
const [confirmoRegistros, setConfirmoRegistros] = useState(false);
const [enviandoCierre, setEnviandoCierre] = useState(false);

    const esVacaciones = esTipoVacaciones(selectedEntrada);
    const esUnSoloDia = Boolean(
      absenceFechaDesde
      && (!absenceFechaHasta || absenceFechaDesde.isSame(absenceFechaHasta, 'day')),
    );
    const mostrarFraccionVacaciones = esVacaciones && esUnSoloDia;
    const esRangoVariosDiasVacaciones = Boolean(
      esVacaciones
      && absenceFechaDesde
      && absenceFechaHasta
      && !absenceFechaDesde.isSame(absenceFechaHasta, 'day'),
    );

    const { Text } = Typography;

    const verUbicacionEnMapa = (ubicacion) => {
      setMapUbicacion(ubicacion);
      setMapModalOpen(true);
    };

    const cerrarMapaUbicacion = () => {
      setMapModalOpen(false);
      setMapUbicacion(null);
    };

    const setVisibleModalExportar =  (id_usuario)=> {
        setIdUsuario(id_usuario);
        setExportModalVisible(true);
    }

    
 
// Método para añadir ausencia
const anadirAusencia = async () => {
  try {
    const idUsuario = getIdUsuario();
    const idEmpresa = getIdEmpresa();
    const usuario_alta = getIdUsuario();

    if (!selectedEntrada) {
      return message.error('Selecciona el tipo de ausencia');
    }

    if (requiereComentarioAusencia(selectedEntrada) && !String(comentario || '').trim()) {
      return message.error('Indica el motivo en el comentario');
    }

    if (!absenceFechaDesde) {
      return message.error("Selecciona la fecha desde y la fecha hasta.");
    }

    const fechaHastaEnvio = absenceFechaHasta || absenceFechaDesde;

    const fecha_desde = absenceFechaDesde.format("DD-MM-YYYY");
    const fecha_hasta = fechaHastaEnvio.format("DD-MM-YYYY");

    // Si "todo el día" o vacaciones de un solo día con fracción, sin horas concretas
    const usarFraccionVacaciones = esVacaciones && absenceFechaDesde.isSame(fechaHastaEnvio, 'day');
    const hora_ausencia_desde = (todoElDia || usarFraccionVacaciones) ? null : horaDesde?.format("HH:mm:ss");
    const hora_ausencia_hasta = (todoElDia || usarFraccionVacaciones) ? null : horaHasta?.format("HH:mm:ss");
    const fraccion_dia = usarFraccionVacaciones ? fraccionDia : null;

    const datos = await crearAusencia(
      idUsuario,
      idEmpresa,
      fecha_desde,
      fecha_hasta,
      hora_ausencia_desde,
      hora_ausencia_hasta,
      comentario,
      usuario_alta,
      selectedEntrada,
      fraccion_dia,
    );

    message.success(
      datos?.pendiente_aprobacion
        ? 'Solicitud de ausencia enviada. Recibirás aviso cuando se resuelva.'
        : 'Ausencia añadida correctamente',
    );
    await fetchData();

    // Cerrar modal y limpiar
    setAbsenceModalVisible(false);
    setAbsenceFechaDesde(null);
    setAbsenceFechaHasta(null);
    setHoraDesde(null);
    setHoraHasta(null);
    setTodoElDia(false);
    setFraccionDia('completo');
    setSelectedEntrada(null);
    setComentario("");

    return datos;
  } catch (error) {
    console.error("Error añadiendo ausencia:", error);
    const detalle = error.detalle ? ` (${error.detalle})` : '';
    message.error((error.message || 'Error al añadir ausencia') + detalle, 6);
  }
};
    const handleExport = () => {

        const idUsuario = getIdUsuario(); 


    
        if (!exportDateRange || exportDateRange.length !== 2) {
            return message.error('Por favor, selecciona un rango de meses válido.');
        }
    
        const [startMonth, endMonth] = exportDateRange;
    
        if (startMonth && endMonth) {
            const startDate = startMonth.startOf('month').format('YYYY-MM-DD');
            const endDate = endMonth.endOf('month').format('YYYY-MM-DD');
    
            descargarExcelDesdeAPI(startDate, endDate, idUsuario);
            setExportModalVisible(false);
        } else {
            message.error('Los meses seleccionados no son válidos.');
        }
    };

const fetchData = async () => {
  try {
    const idUsuario = getIdUsuario();

    const registros = await getDatosUsuarioById(idUsuario);

    const peticionesResp = await getPeticionesByIdUsuario();
    const mapHistorial = {};
    (peticionesResp?.historialEdiciones || []).forEach((p) => {
      const key = p.id_fichaje;
      const existente = mapHistorial[key];
      if (
        !existente
        || dayjs(p.fecha_alta).isAfter(dayjs(existente.fecha_alta))
      ) {
        mapHistorial[key] = p;
      }
    });

    const todasSolicitudes = [
      ...(peticionesResp?.peticiones || []),
      ...(peticionesResp?.historialEdiciones || []),
    ].sort((a, b) => dayjs(b.fecha_alta).valueOf() - dayjs(a.fecha_alta).valueOf());

   const mergedData = (registros.info || []).map((item, index) => {
  const fechaEntrada = item.fecha_entrada ? parseFechaFichaje(item.fecha_entrada) : null;
  const fechaSalida = item.fecha_salida ? parseFechaFichaje(item.fecha_salida) : null;
  const historial = item.id_fichaje ? mapHistorial[item.id_fichaje] : null;
  const fechaOriginalHistorial = historial?.entrada_original
    ? parseFechaFichaje(historial.entrada_original)
    : null;
  const fecha = item.fecha_original
    ? dayjs(item.fecha_original, 'YYYY-MM-DD')
    : fechaOriginalHistorial && fechaOriginalHistorial.isValid()
    ? fechaOriginalHistorial
    : fechaEntrada;

  const tiposConDuracion = ['fichaje', 'descanso'];
  const totalHoras =
    tiposConDuracion.includes(item.tipo) || (item.tipo === 'ausencia' && !item.sin_hora)
      ? calcularDifTiempo(fechaEntrada, fechaSalida)
      : '';

  return {
    key: `${item.tipo || "registro"}-${item.id_fichaje || item.id_ausencia || item.id_descanso || index}`,
    idFichaje: item.id_fichaje ?? null,
    tipo:
      item.tipo === "fichaje"
        ? "Fichaje"
        : item.tipo === "ausencia"
        ? "Ausencia"
        : item.tipo === "descanso"
        ? "Descanso"
        : "Registro",
    date: fecha && fecha.isValid() ? fecha.format("DD/MM/YYYY") : "",
    checkIn:
      item.sin_hora
        ? ""
        : fechaEntrada && fechaEntrada.isValid()
        ? fechaEntrada.format("HH:mm")
        : "",
    dateOut:
      fechaSalida && fechaSalida.isValid()
        ? fechaSalida.format("DD/MM/YYYY")
        : fecha && fecha.isValid()
        ? fecha.format("DD/MM/YYYY")
        : "",
    checkOut:
      item.sin_hora
        ? ""
        : fechaSalida && fechaSalida.isValid()
        ? fechaSalida.format("HH:mm")
        : "",
    totalH: totalHoras,
    ubicacionEntrada: item.ubicacion_entrada,
    ubicacionSalida: item.ubicacion_salida,
    comentarios: item.comentarios,
    estadoEdicion: historial?.fecha_aceptacion
      ? 'aprobada'
      : historial?.fecha_cancelacion
      ? 'rechazada'
      : null,
    historialEdicion: historial,
  };
});

    // Ordenar por fecha más reciente
    const sortedData = mergedData.sort((a, b) => {
      const fechaA = dayjs(a.date, "DD/MM/YYYY");
      const fechaB = dayjs(b.date, "DD/MM/YYYY");
      return fechaB.valueOf() - fechaA.valueOf();
    });

    setData(sortedData);
    if (selectedMonth) {
      const filtered = sortedData.filter((item) => {
        const itemDate = moment(item.date, 'DD/MM/YYYY');
        return (
          itemDate.isValid() &&
          itemDate.month() === selectedMonth.month() &&
          itemDate.year() === selectedMonth.year()
        );
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(sortedData);
    }

    const pendingKeys = (peticionesResp?.peticiones || []).map(
      (p) => `fichaje-${p.id_fichaje}`,
    );
    setFichajesConPeticion(pendingKeys);
    setHistorialPorFichaje(mapHistorial);
    setSolicitudesHorario(todasSolicitudes);
    await marcarPeticionesVistas();
    notifyNotificacionesActualizadas();
  } catch (error) {
    console.error("Error al cargar los datos:", error);
    message.error("Error al cargar los datos");
  }
};
    
const getPeticionesEmpresa =  async () => {
    try{
        const peticiones = await getPeticionesByIdEmpresa();
    }catch(error){
        message.error('Error obteniendo peticiones empresa');

    }
    
}

const crearPeticionMensual = async (firmaImagen) => {
  try {
    if (!selectedMonth || !selectedMonth.isValid()) {
      message.error('Mes no válido');
      return false;
    }

    const mesFormateado = selectedMonth.format('YYYY-MM');
    const idUsuario = getIdUsuario();
    const data = await crearPeticionCierreMes(mesFormateado, firmaImagen);

    if (data?.error) {
      message.error(data.error || 'No se pudo crear la petición');
      return false;
    }

    const registrosPdf = filteredData
      .filter((r) => r.tipo === 'Fichaje')
      .map((r) => ({
        fecha: r.date,
        hora_entrada: r.checkIn,
        hora_salida: r.checkOut,
        dif_tiempo: r.totalH,
      }));

    const totalMin = registrosPdf.reduce((sum, r) => {
      const match = String(r.dif_tiempo || '').match(/(\d+)h\s*(\d+)m/);
      return sum + (match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : 0);
    }, 0);
    const totalHorasPdf = `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;

    const jornadaMes = await getHorasTotalesMesByIdUsuario(mesFormateado, idUsuario);

    const datosPdf = {
      nombreEmpleado: getNombreUsuario(),
      mes: mesFormateado,
      registros: registrosPdf,
      totalHoras: totalHorasPdf,
      totalHorasEsperadas: jornadaMes?.horasMensuales || '',
      resumenHoras: jornadaMes?.resumen || null,
      firmaImagen,
      firmaHash: data?.info?.firma_hash || null,
      hashRegistroMes: data?.info?.hash_registro_mes || null,
      fechaSolicitud: new Date().toISOString(),
      estado: 'Pendiente',
    };

    notification.success({
      message: 'Solicitud de cierre enviada',
      description: (
        <div className="tlp-cierre-notif">
          <p>Tu solicitud firmada ha sido enviada al gestor para su revisión.</p>
          <Button
            type="link"
            size="small"
            className="tlp-cierre-notif__btn"
            onClick={() => { void generarPdfCierreMensual(datosPdf); }}
          >
            Descargar copia en PDF
          </Button>
        </div>
      ),
      duration: 10,
    });

    await fetchData();
    notifyNotificacionesActualizadas();
    return true;
  } catch (error) {
    message.error('Error al crear la solicitud de cierre');
    console.error(error);
    return false;
  }
};

const abrirModalCierre = () => {
  if (!selectedMonth?.isValid()) {
    message.warning('Selecciona primero el mes que deseas cerrar');
    return;
  }
  setFirmaCierre(null);
  setConfirmoRegistros(false);
  setCierreModalOpen(true);
};

const cerrarModalCierre = () => {
  setCierreModalOpen(false);
  setFirmaCierre(null);
  setConfirmoRegistros(false);
};

const confirmarCierreMensual = async () => {
  if (!confirmoRegistros) {
    message.warning('Debes confirmar que los registros del mes son correctos');
    return;
  }
  if (!firmaCierre) {
    message.warning('Debes firmar la solicitud antes de enviarla');
    return;
  }

  setEnviandoCierre(true);
  const ok = await crearPeticionMensual(firmaCierre);
  setEnviandoCierre(false);
  if (ok) cerrarModalCierre();
};

    useEffect(() => {
        fetchData();
    }, []);

    const showEditModal = (record) => {
        setEditingRecord(record);
        form.setFieldsValue({
            date: dayjs(record.date, 'DD/MM/YYYY'),
            checkIn: moment(record.checkIn, 'HH:mm'),
            checkInType: record.checkInType,
            dateOut: dayjs(record.dateOut || record.date, 'DD/MM/YYYY'),
            checkOut: record.checkOut ? moment(record.checkOut, 'HH:mm') : null,
            exitType: record.exitType,
        });
        setIsModalOpen(true);
    };


    const getPeticionesUsuario = async () => {
        const peticiones = await getPeticionesByIdUsuario();
        return peticiones;

    }
 const handleEditSubmit = async () => {
    try {
        const values = await form.validateFields();

        if (!values.checkIn) {
            throw new Error('Hora de entrada no válida');
        }
        if (!values.checkOut) {
            throw new Error('Hora de salida no válida');
        }

        const fechaEntrada = dayjs(values.date);
        const fechaSalida = dayjs(values.dateOut);
        const entrada = fechaEntrada
            .hour(values.checkIn.hour())
            .minute(values.checkIn.minute())
            .second(0);
        const salida = fechaSalida
            .hour(values.checkOut.hour())
            .minute(values.checkOut.minute())
            .second(0);

        if (!entrada.isValid() || !salida.isValid()) {
            message.error('Fecha u hora no válida');
            return;
        }

        if (entrada.isAfter(salida)) {
            message.error('La fecha y hora de entrada deben ser anteriores a la de salida');
            return;
        }

        if (entrada.isAfter(dayjs()) || salida.isAfter(dayjs())) {
            message.error('Las fechas no pueden ser futuras');
            return;
        }

        const peticionPayload = {
            id_fichaje: editingRecord.key.replace('fichaje-', ''),
            fecha_entrada: fechaEntrada.format('YYYY-MM-DD'),
            fecha_salida: fechaSalida.format('YYYY-MM-DD'),
            hora_entrada: values.checkIn.format('HH:mm'),
            hora_salida: values.checkOut.format('HH:mm'),
            justificacion: values.justificacion,
        };

        await crearPeticionEdicion(peticionPayload);

        notifyNotificacionesActualizadas();
        message.success('Solicitud enviada. Pendiente de aprobación por un administrador o supervisor.');
        setIsModalOpen(false);
        setEditingRecord(null);
        await fetchData();
    } catch (error) {
        console.error('Error en el envío:', error);
        message.error(error.message || 'Error al enviar la solicitud');
    }
};

    
    
const handleMonthChange = (date, dateString) => {
    setSelectedMonth(date);

    if (date) {
        // Filtrar datos por mes seleccionado
        const filtered = data.filter(item => {
            const itemDate = moment(item.date, 'DD/MM/YYYY');
            return itemDate.month() === date.month() && itemDate.year() === date.year();
        });
        setFilteredData(filtered);

        // Verificar si el mes ya existe en mesesCierre
        const mesFormateado = date.format('YYYY-MM');
        const existeMes = mesTieneCierreActivo(mesesCierre, mesFormateado);

        // Nuevo: comprobar si es mes actual
        const hoy = moment();
        const esMesActual = date.month() === hoy.month() && date.year() === hoy.year();

        // Habilitar botón solo si NO existe el mes y NO es mes actual
        setIsSubmitDisabled(existeMes || esMesActual);
    } else {
        setFilteredData(data);
        setIsSubmitDisabled(true);
    }
};



    const registrosMesSeleccionado = useMemo(() => {
      if (!selectedMonth?.isValid()) return 0;
      return filteredData.filter((item) => item.tipo === 'Fichaje').length;
    }, [filteredData, selectedMonth]);

    const renderAcciones = (_, record) => {
      const tiposConUbicacion = ['Fichaje', 'Descanso'];
      if (!tiposConUbicacion.includes(record.tipo)) return null;

      const mesSeleccionadoFormateado =
        selectedMonth != null && selectedMonth ? selectedMonth.format('YYYY-MM') : null;
      const mesCerrado = mesTieneCierreActivo(mesesCierre, mesSeleccionadoFormateado);

      const isEditable =
        record.tipo === 'Fichaje' &&
        !fichajesConPeticion.includes(record.key) &&
        !!record.checkOut &&
        (!mesSeleccionadoFormateado || !mesCerrado);

      const pendienteAprobacion =
        record.tipo === 'Fichaje' && fichajesConPeticion.includes(record.key);

      const ubicaciones = [];
      const coordsEntrada = parseUbicacionCoords(record.ubicacionEntrada);
      const coordsSalida = parseUbicacionCoords(record.ubicacionSalida);
      if (coordsEntrada) ubicaciones.push({ key: 'entrada', label: 'entrada', ...coordsEntrada });
      if (coordsSalida) ubicaciones.push({ key: 'salida', label: 'salida', ...coordsSalida });

      return (
        <div className="tlp-acciones">
          {ubicaciones.map((ubicacion) => (
            <Tooltip key={ubicacion.key} title={`Ver ubicación de ${ubicacion.label}`}>
              <Button
                type="text"
                className="tlp-map-btn"
                icon={<EnvironmentOutlined />}
                onClick={() => verUbicacionEnMapa(ubicacion)}
                aria-label={`Ver ubicación de ${ubicacion.label}`}
              />
            </Tooltip>
          ))}
          {record.tipo === 'Fichaje' && (
            <Tooltip title={isEditable ? 'Editar fichaje' : 'No se puede editar este registro'}>
              <Button
                type="text"
                className="tlp-edit-btn"
                icon={<EditOutlined />}
                disabled={!isEditable}
                onClick={() => showEditModal(record)}
                aria-label="Editar fichaje"
              />
            </Tooltip>
          )}
          {pendienteAprobacion && (
            <Tag color="orange" className="tlp-pendiente-tag">
              Pendiente
            </Tag>
          )}
          {record.estadoEdicion === 'aprobada' && (
            <Tooltip title={textoTooltipEstadoEdicion(record.historialEdicion)}>
              <Tag color="green" className="tlp-estado-tag">
                Aprobada
              </Tag>
            </Tooltip>
          )}
          {record.estadoEdicion === 'rechazada' && (
            <Tooltip title={textoTooltipEstadoEdicion(record.historialEdicion)}>
              <Tag color="red" className="tlp-estado-tag">
                Rechazada
              </Tag>
            </Tooltip>
          )}
        </div>
      );
    };

    const columnsSolicitudes = [
      {
        title: 'Fecha fichaje',
        key: 'fecha_fichaje',
        render: (_, record) => formatearFechaHoraHistorial(record.entrada_original).split(' ')[0],
      },
      {
        title: 'Entrada solicitada',
        key: 'nueva_entrada',
        render: (_, record) => {
          const orig = formatearFechaHoraHistorial(record.entrada_original);
          const nueva = formatearFechaHoraHistorial(record.nueva_entrada);
          return `${orig} → ${nueva}`;
        },
      },
      {
        title: 'Salida solicitada',
        key: 'nueva_salida',
        render: (_, record) => {
          const orig = formatearFechaHoraHistorial(record.salida_original);
          const nueva = formatearFechaHoraHistorial(record.nueva_salida);
          return `${orig} → ${nueva}`;
        },
      },
      {
        title: 'Estado',
        key: 'estado',
        render: (_, record) => {
          const estado = obtenerEstadoSolicitud(record);
          return <Tag color={colorEstadoSolicitud(estado)}>{estado}</Tag>;
        },
      },
      {
        title: 'Motivo rechazo',
        key: 'motivo_rechazo',
        render: (_, record) => record.motivo_rechazo || '—',
      },
      {
        title: 'Fecha solicitud',
        key: 'fecha_alta',
        render: (_, record) => formatearFechaHoraHistorial(record.fecha_alta),
      },
      {
        title: 'Fecha resolución',
        key: 'fecha_resolucion',
        render: (_, record) => formatearFechaHoraHistorial(
          record.fecha_aceptacion || record.fecha_cancelacion,
        ),
      },
    ];

    const columns = [
      {
        title: 'Tipo',
        dataIndex: 'tipo',
        key: 'tipo',
      },
      {
        title: 'Hora Entrada',
        dataIndex: 'checkIn',
        key: 'checkIn',
      },
      {
        title: 'Hora Salida',
        dataIndex: 'checkOut',
        key: 'checkOut',
      },
      {
        title: 'Dif. Tiempo',
        dataIndex: 'totalH',
        key: 'totalH',
      },
      {
        title: 'Acciones',
        key: 'actions',
        render: renderAcciones,
      },
    ];

    const gruposPorDia = useMemo(() => {
      const map = new Map();
      filteredData.forEach((row) => {
        const day = row.date || 'Sin fecha';
        if (!map.has(day)) map.set(day, []);
        map.get(day).push(row);
      });
      return Array.from(map.entries()).sort(
        (a, b) => dayjs(b[0], 'DD/MM/YYYY').valueOf() - dayjs(a[0], 'DD/MM/YYYY').valueOf(),
      );
    }, [filteredData]);

    useEffect(() => {
      if (gruposPorDia.length > 0) {
        setDiasExpandidos([gruposPorDia[0][0]]);
      } else {
        setDiasExpandidos([]);
      }
    }, [gruposPorDia]);

    const accionesMenu = {
      items: [
        {
          key: 'cierre',
          label: 'Solicitar cierre mensual',
          icon: <FileProtectOutlined />,
          disabled: isSubmitDisabled,
        },
        {
          key: 'exportar',
          label: 'Exportar registros',
          icon: <ExportOutlined />,
        },
        ...(puedeAusencias
          ? [
              {
                key: 'ausencia',
                label: 'Añadir ausencia',
                icon: <PlusCircleOutlined />,
              },
            ]
          : []),
      ],
      onClick: ({ key }) => {
        if (key === 'cierre') abrirModalCierre();
        if (key === 'exportar') setVisibleModalExportar();
        if (key === 'ausencia') setAbsenceModalVisible(true);
      },
    };

    return (
        <Layout className="tlp-layout">
            <Card>
                <div className="tlp-toolbar">
                    <DatePicker
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        picker="month"
                        className="tlp-month-picker"
                        format="MM/YYYY"
                        placeholder=""
                        allowClear={false}
                        inputReadOnly
                        suffixIcon={<CalendarOutlined />}
                        disabledDate={(current) => current && current > moment()}
                        aria-label="Seleccionar mes"
                    />
                    <Dropdown menu={accionesMenu} trigger={['click']} placement="bottomRight">
                        <Button
                            type="text"
                            className="tlp-more-btn"
                            icon={<MoreOutlined />}
                            aria-label="Más acciones"
                        />
                    </Dropdown>
                </div>

                {gruposPorDia.length === 0 ? (
                  <Empty description="No hay registros para este periodo" />
                ) : (
                  <Collapse
                    className="tlp-day-collapse"
                    activeKey={diasExpandidos}
                    onChange={(keys) => setDiasExpandidos(Array.isArray(keys) ? keys : [keys])}
                    items={gruposPorDia.map(([date, rows]) => ({
                      key: date,
                      className: esFechaHoy(date) ? 'tlp-day-item--hoy' : undefined,
                      label: (
                        <div className="tlp-day-header">
                          <span className="tlp-day-title">
                            {formatEtiquetaDia(date)}
                            {esFechaHoy(date) && (
                              <span className="tlp-hoy-chip" aria-label="Día actual">
                                Hoy
                              </span>
                            )}
                          </span>
                          <span className="tlp-day-count">
                            {rows.length} registro{rows.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ),
                      children: (
                        <Table
                          className="tlp-day-table"
                          columns={columns}
                          dataSource={rows}
                          pagination={false}
                          scroll={{ x: 700 }}
                          size="small"
                          rowKey="key"
                        />
                      ),
                    }))}
                  />
                )}

                {solicitudesHorario.length > 0 && (
                  <Collapse
                    className="tlp-solicitudes-collapse"
                    items={[{
                      key: 'solicitudes',
                      label: `Mis solicitudes de horario (${solicitudesHorario.length})`,
                      children: (
                        <Table
                          className="tlp-solicitudes-table"
                          columns={columnsSolicitudes}
                          dataSource={solicitudesHorario}
                          rowKey="id_peticion"
                          pagination={{ pageSize: 5 }}
                          scroll={{ x: 900 }}
                          size="small"
                        />
                      ),
                    }]}
                  />
                )}

                <Modal
                    title="Solicitar corrección de horario"
                    open={isModalOpen}
                    onOk={handleEditSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    okText="Enviar solicitud"
                    cancelText="Cancelar"
                >
                    <p className="tlp-solicitud-hint">
                      Los cambios no se aplican al instante: un administrador o supervisor deberá aprobar la solicitud.
                    </p>
                    <Form form={form} layout="vertical">
                        <Form.Item label="Fecha Entrada" name="date"
                         rules={[{ required: true, message: 'Por favor, ingresa la fecha de entrada' }]}>
                        <DatePicker
                            format="DD/MM/YYYY"
                            className="tlp-full-width"
                            disabledDate={(current) => current && current.isAfter(dayjs(), 'day')}
                        />
                        </Form.Item>
                        <Form.Item
                            label="Hora Entrada"
                            name="checkIn"
                            rules={[{ required: true, message: 'Por favor, ingresa la hora de entrada' }]} 
                        >
                            <TimePicker format="HH:mm" />
                        </Form.Item>
                        <Form.Item label="Fecha Salida" name="dateOut" rules={[{ required: true, message: 'Por favor, ingresa la fecha de salida' }]} >
                        <DatePicker
                            format="DD/MM/YYYY"
                            className="tlp-full-width"
                            disabledDate={(current) => current && current.isAfter(dayjs(), 'day')}
                        />

                        </Form.Item>
                        <Form.Item
                            label="Hora Salida"
                            name="checkOut"
                            rules={[{ required: true, message: 'Por favor, ingresa la hora de salida' }]}
                        >
                            <TimePicker format="HH:mm" />
                        </Form.Item>
                        <Form.Item
                            label="Justificación"
                            name="justificacion"
                            rules={[{ required: true, message: 'Por favor, ingrese una justificación' }]}
                        >
                            <Input />
                        </Form.Item>
                    </Form>
                </Modal>
            </Card>
                  {/* Modal de exportación */}
                <Modal
                    title="Exportar datos"
                    open={exportModalVisible}
                    onCancel={() => setExportModalVisible(false)}
                    onOk={handleExport}
                    okText="Descargar"
                    cancelText="Cancelar"
                >
                    <DatePicker.RangePicker
                        picker="month"
                        className="tlp-full-width"
                        format="MM/YYYY"
                        onChange={(dates) => setExportDateRange(dates)}
                        disabledDate={(current) => current && current > dayjs()}
                    />
                </Modal>

                       {/* Modal de ausencia */}
                {puedeAusencias && (
                <Modal
                    title="Añadir ausencia"
                    open={absenceModalVisible}
                    onCancel={() => {
                        setAbsenceModalVisible(false);
                        setAbsenceFechaDesde(null);
                        setAbsenceFechaHasta(null);
                        setFraccionDia('completo');
                        setSelectedEntrada(null);
                    }}
                    onOk={anadirAusencia}
                    okText="Añadir"
                    cancelText="Cancelar"
                >
                    <Row>
                    <Col xs={24} sm={12} md={12} lg={12} xl={12}>
                        <DatePicker
                        className="tlp-full-width"
                        format="DD/MM/YYYY"
                        placeholder="Desde"
                        value={absenceFechaDesde}
                        onChange={(date) => {
                            const eraUnSoloDia = Boolean(
                              absenceFechaDesde
                              && absenceFechaHasta
                              && absenceFechaDesde.isSame(absenceFechaHasta, 'day'),
                            );
                            setAbsenceFechaDesde(date);
                            if (date && absenceFechaHasta && absenceFechaHasta.isBefore(date, 'day')) {
                                setAbsenceFechaHasta(null);
                            } else if (esVacaciones && date && (!absenceFechaHasta || eraUnSoloDia)) {
                                setAbsenceFechaHasta(date);
                            }
                        }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={12} xl={12}>
                        <DatePicker
                        className="tlp-full-width"
                        format="DD/MM/YYYY"
                        placeholder="Hasta"
                        value={absenceFechaHasta}
                        disabled={!absenceFechaDesde}
                        disabledDate={(current) =>
                            absenceFechaDesde && current.isBefore(absenceFechaDesde, 'day')
                        }
                        onChange={setAbsenceFechaHasta}
                        />
                    </Col>

                    {mostrarFraccionVacaciones && (
                    <Col span={24}>
                        <Text type="secondary" className="tlp-fraccion-label">Duración del día</Text>
                        <Radio.Group
                          className="tlp-fraccion-group"
                          value={fraccionDia}
                          onChange={(e) => setFraccionDia(e.target.value)}
                          optionType="button"
                          buttonStyle="solid"
                        >
                          <Radio.Button value="completo">Día completo</Radio.Button>
                          <Radio.Button value="manana">Mañana</Radio.Button>
                          <Radio.Button value="tarde">Tarde</Radio.Button>
                        </Radio.Group>
                    </Col>
                    )}

                    {esRangoVariosDiasVacaciones && (
                    <Col span={24}>
                        <Text type="secondary" className="tlp-fraccion-hint">
                          Para medio día (mañana o tarde), indica la misma fecha en Desde y Hasta.
                        </Text>
                    </Col>
                    )}

                    {!esVacaciones && (
                    <>
                    <Col xs={12} sm={12} md={12} lg={12} xl={12}>
                        <TimePicker
                        disabled={todoElDia}
                        placeholder="Hora desde"
                        format="HH:mm:ss"
                        className="tlp-timepicker"
                        value={horaDesde}
                        onChange={(value) => setHoraDesde(value)}
                        />
                    </Col>
                    <Col xs={12} sm={12} md={12} lg={12} xl={12}>
                        <TimePicker
                        disabled={todoElDia}
                        placeholder="Hora hasta"
                        format="HH:mm:ss"
                        className="tlp-timepicker"
                        value={horaHasta}
                        onChange={(value) => setHoraHasta(value)}
                        />
                    </Col>
                    <Col>
                   <Checkbox
                        checked={todoElDia}
                        className="tlp-checkbox"
                        onChange={(e) => {
                            setTodoElDia(e.target.checked);
                            if (e.target.checked) {
                            setHoraDesde(null);
                            setHoraHasta(null);
                            }
                        }}
                        >
                        Todo el día
                        </Checkbox>

                    </Col>
                    </>
                    )}

                    </Row>
                   


                        <Select
                        placeholder="Selecciona el tipo de registro"
                        className="tlp-select"
                        value={selectedEntrada}
                        onChange={(value) => {
                          setSelectedEntrada(value);
                          if (!esTipoVacaciones(value)) {
                            setFraccionDia('completo');
                            return;
                          }
                          if (absenceFechaDesde && !absenceFechaHasta) {
                            setAbsenceFechaHasta(absenceFechaDesde);
                          }
                        }}
                            dropdownStyle={{
                            maxHeight: '250px',
                            overflowY: 'auto',
                            whiteSpace: 'nowrap',
                        }}
                        
                        optionLabelProp="label"
                        >
                             {entradasAusencia.map((entrada) => (
                        <Select.Option key={entrada} value={entrada}>
                        {entrada}
                        </Select.Option>
                    ))}
                        </Select>
                        <Input
                        placeholder={
                          requiereComentarioAusencia(selectedEntrada)
                            ? 'Comentario (obligatorio para «Otros»)'
                            : 'Comentario (opcional)'
                        }
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        />                    
                </Modal>
                )}

                <Modal
                  title="Solicitar cierre mensual firmado"
                  open={cierreModalOpen}
                  onCancel={cerrarModalCierre}
                  onOk={confirmarCierreMensual}
                  okText="Enviar solicitud firmada"
                  cancelText="Cancelar"
                  confirmLoading={enviandoCierre}
                  okButtonProps={{ disabled: !confirmoRegistros || !firmaCierre }}
                  width={520}
                  destroyOnClose
                  className="tlp-cierre-modal"
                >
                  <div className="tlp-cierre-modal__body">
                    <p className="tlp-cierre-modal__intro">
                      Vas a enviar al gestor la solicitud de <strong>cierre del mes de{' '}
                      {selectedMonth?.isValid() ? selectedMonth.format('MMMM [de] YYYY') : '—'}</strong>.
                      Incluye los fichajes registrados en ese periodo ({registrosMesSeleccionado} fichajes)
                      y quedará vinculada a tu firma y a una huella de integridad del registro.
                    </p>
                    <p className="tlp-cierre-modal__aviso">
                      Una vez enviada, no podrás editar los fichajes de ese mes hasta que el gestor resuelva la solicitud.
                    </p>
                    <div className="tlp-cierre-modal__legal">
                      <p className="tlp-cierre-modal__legal-titulo">Declaración</p>
                      <p className="tlp-cierre-modal__legal-texto">{DECLARACION_CIERRE_MENSUAL}</p>
                    </div>
                    <Checkbox
                      checked={confirmoRegistros}
                      onChange={(e) => setConfirmoRegistros(e.target.checked)}
                    >
                      {ETIQUETA_CONFIRMACION_CIERRE}
                    </Checkbox>
                    <SignaturePad onChange={setFirmaCierre} />
                  </div>
                </Modal>

            <UbicacionMapModal
              open={mapModalOpen}
              onClose={cerrarMapaUbicacion}
              ubicacion={mapUbicacion}
            />
        </Layout>

        
    );
};

export default TimeLogsPanel;
