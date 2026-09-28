import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Card,
  Select,
  Table,
  Button,
  DatePicker,
  Tag,
  Typography,
  message,
  Spin,
  Empty,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  CameraOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { getInicialesEmpresa } from '../../utils/empresaBranding';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { APP_ROUTES } from '../../constants/routes';
import {
  getUsuariosEmpresa,
  getHorasTotalesMesByIdUsuario,
  getMiPerfil,
  editUsuario,
  editMiPerfil,
} from '../../features/user/usuarioService';
import {
  formatearTelefonoWhatsappDisplay,
  telefonoWhatsappValido,
} from '../../utils/telefonoWhatsapp';
import { listarConveniosEmpresa, obtenerConvenioUsuario } from '../../features/convenios/convenioService';
import { obtenerJornadas } from '../../features/jornada/jornadaService';
import { getAusenciasCalendario } from '../../features/ausencias/ausenciasService';
import { getFestivosCalendario } from '../../features/calendario/CalendarioService';
import { construirContextoCalendario } from '../../utils/jornadaHoras';
import {
  getDatosUsuarioById,
  getDatosUsuarioMes,
  getCierresMensualesByIdEmpresa,
  getHistorialCierresMensuales,
  getFirmaCierreMensual,
  getPeticionesByIdUsuario,
} from '../../features/fichaje/fichajeService';
import { etiquetaTipoHora, TIPO_HORA_BOLSA } from '../../utils/tipoHora';
import BolsaHorasPanel from '../components/BolsaHorasPanel';
import ResumenHorasTotales from '../components/ResumenHorasTotales';
import VacacionesSaldoPanel from '../components/VacacionesSaldoPanel';
import RetribucionPanel from '../components/RetribucionPanel';
import MisNominasPanel from '../components/MisNominasPanel';
import NominaDocumentoPanel from '../components/NominaDocumentoPanel';
import { usePlan } from '../../hooks/usePlan';
import { getTipoUsuario, getIdUsuario } from '../../utils/authSession';
import { puedeVerFichaPersonal, puedeAutogestionarVacacionesSaldo } from '../../utils/tipoUsuarioLabel';
import { etiquetaTipoUsuario } from '../../utils/tipoUsuarioLabel';
import {
  combinarCierres,
  obtenerEstadoCierre,
  colorEstadoCierre,
  obtenerFechaResolucionCierre,
} from '../../utils/cierreMensualEstado';
import { generarPdfCierreMensual } from '../../utils/generarPdfCierreMensual';
import { parseFechaFichaje } from '../../utils/fechaFichaje';
import RegistroDiaCard from '../components/cards/RegistroDiaCard';
import RegistroMensualModal from '../components/RegistroMensualModal';
import DatoCampoEditable from '../components/DatoCampoEditable';
import FpSeccionContrasena from '../components/FpSeccionContrasena';
import { useAuth } from '../../config/AuthContext';
import './FichaPersonal.css';
import '../components/shared/TableAcciones.css';

dayjs.locale('es');

const { Title, Text } = Typography;

const MOBILE_BREAKPOINT = 950;

const formatearFecha = (fecha) =>
  fecha && dayjs(fecha).isValid() ? dayjs(fecha).format('DD/MM/YYYY HH:mm') : '—';

const DatoCampo = ({ label, children }) => (
  <div className="fp-dato">
    <Text type="secondary" className="fp-dato__label">
      {label}
    </Text>
    <div className="fp-dato__valor">{children}</div>
  </div>
);

const FichaPersonal = () => {
  const { patchUser } = useAuth();
  const { tieneFeature } = usePlan();
  const puedeVerVacaciones = tieneFeature('vacaciones');
  const puedeVerAusencias = tieneFeature('ausencias_basicas');
  const puedeVerNominas = tieneFeature('nominas');
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const esMiPerfil = location.pathname === APP_ROUTES.miPerfil;
  const idSesion = getIdUsuario();
  const idUsuario = esMiPerfil ? idSesion : Number(id);

  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [jornadaAsignada, setJornadaAsignada] = useState(null);
  const [contextoCalendario, setContextoCalendario] = useState(null);
  const [cierres, setCierres] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().startOf('month'));
  const [registroHoras, setRegistroHoras] = useState([]);
  const [totalHoras, setTotalHoras] = useState('0h 0m');
  const [totalHorasEsperadas, setTotalHorasEsperadas] = useState('—');
  const [resumenHoras, setResumenHoras] = useState(null);
  const [loadingRegistro, setLoadingRegistro] = useState(false);

  const [detalleCierreOpen, setDetalleCierreOpen] = useState(false);
  const [detalleCierre, setDetalleCierre] = useState(null);
  const [registroDetalleCierre, setRegistroDetalleCierre] = useState([]);
  const [totalHorasDetalle, setTotalHorasDetalle] = useState('0h 0m');
  const [totalEsperadasDetalle, setTotalEsperadasDetalle] = useState('—');
  const [resumenHorasDetalle, setResumenHorasDetalle] = useState(null);
  const [firmaCierreDetalle, setFirmaCierreDetalle] = useState(null);
  const [loadingDetalleCierre, setLoadingDetalleCierre] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('datos');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [conveniosEmpresa, setConveniosEmpresa] = useState([]);
  const [convenioResuelto, setConvenioResuelto] = useState(null);
  const [convenioSeleccionado, setConvenioSeleccionado] = useState(undefined);
  const [guardandoConvenio, setGuardandoConvenio] = useState(false);
  const [resaltarTelefonoWhatsapp, setResaltarTelefonoWhatsapp] = useState(false);

  useEffect(() => {
    if (location.state?.focusTelefonoWhatsapp) {
      setActiveTabKey('datos');
      setResaltarTelefonoWhatsapp(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state?.focusTelefonoWhatsapp, navigate]);

  useEffect(() => {
    if (!resaltarTelefonoWhatsapp) return undefined;
    const timer = window.setTimeout(() => setResaltarTelefonoWhatsapp(false), 4000);
    return () => window.clearTimeout(timer);
  }, [resaltarTelefonoWhatsapp]);

  useEffect(() => {
    if (!resaltarTelefonoWhatsapp || activeTabKey !== 'datos') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('fp-telefono-whatsapp')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTabKey, resaltarTelefonoWhatsapp]);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const cargarFicha = useCallback(async () => {
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      message.error('Identificador de personal no válido');
      navigate(esMiPerfil ? APP_ROUTES.home : APP_ROUTES.users);
      return;
    }

    const tipoActual = Number(getTipoUsuario());
    const esPropio = esMiPerfil || idUsuario === idSesion;
    if (!esPropio && !puedeVerFichaPersonal(tipoActual)) {
      message.error('No tienes permiso para ver esta ficha');
      navigate(APP_ROUTES.home);
      return;
    }

    setLoading(true);
    try {
      let jornadasLista = [];
      let encontrado = null;
      let todosCierres = [];

      if (esPropio) {
        const [perfil, peticiones] = await Promise.all([
          getMiPerfil(),
          getPeticionesByIdUsuario(),
        ]);
        encontrado = perfil;
        todosCierres = peticiones?.mesesCierre || [];

        try {
          const festivosData = await getFestivosCalendario();
          let ausencias = [];
          if (puedeVerAusencias) {
            const ausenciasData = await getAusenciasCalendario();
            ausencias = ausenciasData?.eventos || [];
          }
          setContextoCalendario(
            construirContextoCalendario({
              ausencias,
              festivos: festivosData?.festivos || [],
            }),
          );
        } catch {
          setContextoCalendario(null);
        }
      } else {
        setContextoCalendario(null);
        const [usuarios, pendientes, historial, jornadas] = await Promise.all([
          getUsuariosEmpresa(),
          getCierresMensualesByIdEmpresa(),
          getHistorialCierresMensuales(),
          obtenerJornadas(),
        ]);
        jornadasLista = jornadas || [];

        encontrado = (usuarios || []).find(
          (u) => Number(u.id_usuario) === idUsuario,
        );

        if (!encontrado) {
          message.error('No se encontró el personal indicado');
          navigate(APP_ROUTES.users);
          return;
        }

        todosCierres = combinarCierres(
          pendientes?.info || [],
          historial?.info || [],
        ).filter((item) => Number(item.usuario_alta) === idUsuario);
      }

      if (!encontrado) {
        message.error('No se encontró el personal indicado');
        navigate(esMiPerfil ? APP_ROUTES.home : APP_ROUTES.users);
        return;
      }

      setUsuario(encontrado);
      setConvenioSeleccionado(encontrado.id_empresa_convenio ?? undefined);

      try {
        const convenio = await obtenerConvenioUsuario(idUsuario);
        setConvenioResuelto(convenio);
      } catch {
        setConvenioResuelto(null);
      }

      if (!esPropio && puedeVerFichaPersonal(Number(getTipoUsuario()))) {
        try {
          const lista = await listarConveniosEmpresa();
          setConveniosEmpresa((lista || []).filter((c) => c.activo));
        } catch {
          setConveniosEmpresa([]);
        }
      } else {
        setConveniosEmpresa([]);
      }

      const idJornada = encontrado.jornadas?.[0]?.id_jornada;
      const jornada =
        encontrado.jornada_asignada ||
        jornadasLista.find((j) => Number(j.id_jornada) === Number(idJornada)) ||
        null;
      setJornadaAsignada(jornada);
      setCierres(todosCierres);
    } catch {
      message.error('Error al cargar la ficha de personal');
      navigate(esMiPerfil ? APP_ROUTES.home : APP_ROUTES.users);
    } finally {
      setLoading(false);
    }
  }, [esMiPerfil, idSesion, idUsuario, navigate, puedeVerAusencias]);

  useEffect(() => {
    cargarFicha();
  }, [cargarFicha]);

  const mapRegistrosMes = useCallback((items, mes) => {
    const registros = (items || [])
      .map((item) => {
        const horaEntrada = parseFechaFichaje(item.fecha_entrada);
        const horaSalida = item.fecha_salida
          ? parseFechaFichaje(item.fecha_salida)
          : null;

        let dif_tiempo = 'No registrada';
        let minutos = 0;
        if (horaSalida && horaEntrada?.isValid() && horaSalida.isValid()) {
          const diffMinutes = horaSalida.diff(horaEntrada, 'minute');
          minutos = diffMinutes;
          dif_tiempo = `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
        }

        return {
          key: `${item.fecha_entrada}-${item.tipo || 'fichaje'}`,
          fecha: horaEntrada?.format('DD/MM/YYYY') || '—',
          hora_entrada: horaEntrada?.format('HH:mm') || '—',
          hora_salida: horaSalida ? horaSalida.format('HH:mm') : 'No registrada',
          dif_tiempo,
          minutos,
          tipo: item.tipo,
        };
      })
      .filter((item) => {
        const fecha = dayjs(item.fecha, 'DD/MM/YYYY');
        return fecha.isValid() && fecha.isSame(mes, 'month');
      });

    registros.sort(
      (a, b) => dayjs(b.fecha, 'DD/MM/YYYY').valueOf() - dayjs(a.fecha, 'DD/MM/YYYY').valueOf(),
    );
    return registros;
  }, []);

  const calcularTotalHoras = (registros) => {
    const minutos = registros.reduce((sum, r) => sum + (r.minutos || 0), 0);
    return `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
  };

  const cargarRegistroMes = useCallback(async (mes) => {
    if (!idUsuario || !mes?.isValid()) return;
    setLoadingRegistro(true);
    try {
      const mesStr = mes.format('YYYY-MM');
      const [result, jornadaMes] = await Promise.all([
        getDatosUsuarioById(idUsuario),
        getHorasTotalesMesByIdUsuario(mesStr, idUsuario),
      ]);

      const registros = mapRegistrosMes(result?.info || [], mes);
      setRegistroHoras(registros);
      setTotalHoras(calcularTotalHoras(registros));
      setTotalHorasEsperadas(jornadaMes?.horasMensuales || 'No configurada');
      setResumenHoras(jornadaMes?.resumen || null);
    } catch (error) {
      message.error(error?.message || 'Error al cargar el registro del mes');
      setRegistroHoras([]);
    } finally {
      setLoadingRegistro(false);
    }
  }, [idUsuario, mapRegistrosMes]);

  useEffect(() => {
    if (usuario && selectedMonth?.isValid()) {
      cargarRegistroMes(selectedMonth);
    }
  }, [usuario, selectedMonth, cargarRegistroMes]);

  const abrirDetalleCierre = async (cierre) => {
    setDetalleCierre(cierre);
    setDetalleCierreOpen(true);
    setLoadingDetalleCierre(true);
    setFirmaCierreDetalle(null);

    try {
      const response = await getDatosUsuarioMes(idUsuario, cierre.mes);
      const registros = (response?.info || []).map((item) => {
        const horaEntrada = parseFechaFichaje(item.fecha_entrada);
        const horaSalida = item.fecha_salida
          ? parseFechaFichaje(item.fecha_salida)
          : null;
        let dif_tiempo = 'No registrada';
        let minutos = 0;
        if (horaSalida && horaEntrada?.isValid() && horaSalida.isValid()) {
          const diffMinutes = horaSalida.diff(horaEntrada, 'minute');
          minutos = diffMinutes;
          dif_tiempo = `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
        }
        return {
          fecha: horaEntrada?.format('DD/MM/YYYY') || '—',
          hora_entrada: horaEntrada?.format('HH:mm') || '—',
          hora_salida: horaSalida ? horaSalida.format('HH:mm') : 'No registrada',
          dif_tiempo,
          minutos,
        };
      });

      registros.sort(
        (a, b) => dayjs(b.fecha, 'DD/MM/YYYY').valueOf() - dayjs(a.fecha, 'DD/MM/YYYY').valueOf(),
      );

      const jornadaMes = await getHorasTotalesMesByIdUsuario(cierre.mes, idUsuario);
      setRegistroDetalleCierre(registros);
      setTotalHorasDetalle(calcularTotalHoras(registros));
      setTotalEsperadasDetalle(jornadaMes?.horasMensuales || 'No configurada');
      setResumenHorasDetalle(jornadaMes?.resumen || null);

      if (cierre.id_mes_cierre) {
        const firma = await getFirmaCierreMensual(cierre.id_mes_cierre);
        setFirmaCierreDetalle(firma);
      }
    } catch {
      message.error('Error al cargar el detalle del cierre');
    } finally {
      setLoadingDetalleCierre(false);
    }
  };

  const descargarPdfCierre = async () => {
    if (!detalleCierre || !usuario) return;
    try {
      await generarPdfCierreMensual({
      nombreEmpleado: usuario.nombre,
      mes: detalleCierre.mes,
      registros: registroDetalleCierre,
      totalHoras: totalHorasDetalle,
      totalHorasEsperadas: totalEsperadasDetalle,
      resumenHoras: resumenHorasDetalle,
      firmaImagen: firmaCierreDetalle?.firma_imagen || null,
      firmaHash: firmaCierreDetalle?.firma_hash || null,
      hashRegistroMes: firmaCierreDetalle?.hash_registro_mes || null,
      fechaSolicitud: detalleCierre.fecha_alta,
      estado: obtenerEstadoCierre(detalleCierre),
      });
    } catch (error) {
      console.error('Error al generar PDF de cierre:', error);
    }
  };

  const columnsRegistro = useMemo(() => [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
    { title: 'Entrada', dataIndex: 'hora_entrada', key: 'hora_entrada' },
    { title: 'Salida', dataIndex: 'hora_salida', key: 'hora_salida' },
    { title: 'Tiempo', dataIndex: 'dif_tiempo', key: 'dif_tiempo' },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      render: (tipo) => {
        const config = {
          fichaje: { color: 'green', label: 'Fichaje' },
          ausencia: { color: 'red', label: 'Ausencia' },
          descanso: { color: 'orange', label: 'Descanso' },
        };
        const item = config[tipo] || { color: 'default', label: tipo || '—' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
  ], []);

  const columnsCierres = useMemo(() => [
    {
      title: 'Mes',
      dataIndex: 'mes',
      key: 'mes',
      render: (mes) => dayjs(`${mes}-01`).format('MMMM [de] YYYY'),
    },
    {
      title: 'Fecha solicitud',
      dataIndex: 'fecha_alta',
      key: 'fecha_alta',
      render: formatearFecha,
    },
    {
      title: 'Estado',
      key: 'estado',
      render: (_, record) => {
        const estado = obtenerEstadoCierre(record);
        return (
          <span>
            <Tag color={colorEstadoCierre(estado)}>{estado}</Tag>
            {record.firma_hash && <Tag color="blue">Firmado</Tag>}
          </span>
        );
      },
    },
    {
      title: 'Resolución',
      key: 'fecha_resolucion',
      render: (_, record) => formatearFecha(obtenerFechaResolucionCierre(record)),
    },
    {
      title: 'Detalle',
      key: 'detalle',
      width: 90,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          className="tbl-accion-btn"
          onClick={() => abrirDetalleCierre(record)}
          aria-label="Ver detalle del cierre"
        />
      ),
    },
  ], []);

  if (loading) {
    return (
      <div className="fp-loading">
        <Spin size="large" tip="Cargando ficha..." />
      </div>
    );
  }

  if (!usuario) return null;

  const tipoUsuarioActual = getTipoUsuario();
  const esPropio = esMiPerfil || idUsuario === idSesion;
  const puedeAjustarBolsa = puedeVerFichaPersonal(tipoUsuarioActual) && Number(tipoUsuarioActual) !== 6;
  const puedeGestionarVacaciones = puedeAjustarBolsa && puedeVerVacaciones
    && (!esPropio || puedeAutogestionarVacacionesSaldo(tipoUsuarioActual));
  const puedeGestionarNominas = puedeAjustarBolsa && puedeVerNominas && !esPropio;
  const puedeEditarConvenio = puedeAjustarBolsa && !esPropio && conveniosEmpresa.length > 0;

  const etiquetaModoConteo = (modo) => (
    modo === 'laboral' ? 'Días laborables' : 'Días naturales'
  );

  const nombreConvenioVisible = convenioResuelto?.empresa_convenio?.nombre
    || convenioResuelto?.empresa_convenio?.catalogo?.nombre
    || usuario.convenio_nombre
    || 'Convenio por defecto de la empresa';

  const modoConteoVisible = convenioResuelto?.modo_conteo_etiqueta
    || etiquetaModoConteo(usuario.convenio_modo_conteo || convenioResuelto?.reglas?.modo_conteo_vacaciones);

  const puedeEditarTelefonoWhatsapp = esMiPerfil || (puedeAjustarBolsa && !esPropio);

  const aplicarPerfilLocal = (perfil) => {
    if (!perfil) return;
    setUsuario((prev) => (prev ? { ...prev, ...perfil } : prev));
  };

  const guardarCampoMiPerfil = async (payload, { mensajeOk = 'Cambios guardados' } = {}) => {
    try {
      const data = await editMiPerfil(payload);
      aplicarPerfilLocal(data.perfil);
      if (payload.nombre != null) {
        patchUser({ nombre: data.perfil.nombre });
      }
      message.success(mensajeOk);
      return data.perfil;
    } catch (error) {
      message.error(error.message || 'No se pudo guardar');
      throw error;
    }
  };

  const guardarNombreMiPerfil = async (nombreRaw) => {
    const nombre = String(nombreRaw || '').trim();
    if (!nombre) {
      message.warning('Introduce tu nombre');
      throw new Error('validation');
    }
    await guardarCampoMiPerfil({ nombre, dni: usuario.dni || '' }, { mensajeOk: 'Nombre actualizado' });
  };

  const guardarDniMiPerfil = async (dniRaw) => {
    const dni = String(dniRaw || '').trim();
    await guardarCampoMiPerfil(
      { nombre: usuario.nombre, dni },
      { mensajeOk: 'DNI actualizado' },
    );
  };

  const guardarTelefonoWhatsapp = async (valorRaw) => {
    const valor = String(valorRaw || '').trim();
    if (valor && !telefonoWhatsappValido(valor)) {
      message.warning('Introduce un móvil válido (España: 9 dígitos, p. ej. 612 345 678)');
      throw new Error('validation');
    }

    if (!esMiPerfil && usuario) {
      const idJornada = usuario.jornadas?.[0]?.id_jornada ?? jornadaAsignada?.id_jornada;
      if (!idJornada) {
        message.error('Asigna una jornada al empleado antes de guardar el teléfono');
        throw new Error('validation');
      }
    }

    try {
      if (esMiPerfil) {
        const data = await editMiPerfil({ telefonoWhatsapp: valor || null });
        aplicarPerfilLocal(data.perfil);
      } else if (usuario) {
        const idJornada = usuario.jornadas?.[0]?.id_jornada ?? jornadaAsignada?.id_jornada;
        await editUsuario(usuario.id_usuario, {
          nombre: usuario.nombre,
          dni: usuario.dni,
          tipoUsuario: usuario.tipo_usuario,
          activo: usuario.activo,
          horario: idJornada,
          telefonoWhatsapp: valor || null,
        });
        await cargarFicha();
      }
      message.success(valor ? 'Teléfono guardado' : 'Teléfono eliminado');
    } catch (error) {
      if (error.message !== 'validation') {
        message.error(error.message || 'No se pudo guardar el teléfono');
      }
      throw error;
    }
  };

  const guardarConvenio = async () => {
    if (!usuario) return;
    setGuardandoConvenio(true);
    try {
      const idJornada = usuario.jornadas?.[0]?.id_jornada ?? jornadaAsignada?.id_jornada;
      if (!idJornada) {
        message.error('Asigna una jornada antes de cambiar el convenio');
        return;
      }
      await editUsuario(usuario.id_usuario, {
        nombre: usuario.nombre,
        dni: usuario.dni,
        tipoUsuario: usuario.tipo_usuario,
        activo: usuario.activo,
        horario: idJornada,
        idEmpresaConvenio: convenioSeleccionado ?? null,
      });
      message.success('Convenio actualizado');
      await cargarFicha();
    } catch (error) {
      message.error(error.message || 'No se pudo guardar el convenio');
    } finally {
      setGuardandoConvenio(false);
    }
  };

  const tipoHoraEfectivo = usuario.tipo_hora ?? jornadaAsignada?.tipo_hora ?? resumenHoras?.tipo_hora;
  const esBolsa = Number(tipoHoraEfectivo) === TIPO_HORA_BOLSA;

  const tabItems = [
    {
      key: 'datos',
      label: 'Datos',
      children: (
        <div className="fp-datos">
          <section className="fp-datos__section">
            <Text className="fp-datos__section-title">Contacto</Text>
            <Row gutter={[24, 20]}>
              {esMiPerfil ? (
                <Col xs={24} md={12}>
                  <DatoCampoEditable
                    label="Nombre completo"
                    value={usuario.nombre || ''}
                    editable
                    onSave={guardarNombreMiPerfil}
                    inputProps={{ autoComplete: 'name', placeholder: 'Tu nombre' }}
                  />
                </Col>
              ) : null}
              <Col xs={24} md={12}>
                <DatoCampo label="Correo electrónico">
                  <a className="fp-dato__link" href={`mailto:${usuario.email}`}>
                    {usuario.email}
                  </a>
                </DatoCampo>
              </Col>
              <Col xs={24} md={12}>
                <DatoCampoEditable
                  label="Móvil (WhatsApp)"
                  value={
                    usuario.telefono_whatsapp
                      ? formatearTelefonoWhatsappDisplay(usuario.telefono_whatsapp)
                      : ''
                  }
                  editable={puedeEditarTelefonoWhatsapp}
                  onSave={guardarTelefonoWhatsapp}
                  id="fp-telefono-whatsapp"
                  highlight={resaltarTelefonoWhatsapp}
                  autoStartEdit={resaltarTelefonoWhatsapp}
                  emptyLabel="Añadir móvil"
                  inputProps={{
                    placeholder: '612 345 678 o +34 612 345 678',
                    inputMode: 'tel',
                    autoComplete: 'tel',
                  }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                {esMiPerfil ? (
                  <DatoCampoEditable
                    label="DNI / NIF"
                    value={usuario.dni || ''}
                    editable
                    onSave={guardarDniMiPerfil}
                    inputProps={{ autoComplete: 'off', placeholder: 'Opcional' }}
                  />
                ) : (
                  <DatoCampo label="DNI">{usuario.dni || '—'}</DatoCampo>
                )}
              </Col>
            </Row>
          </section>

          {esMiPerfil ? (
            <section className="fp-datos__section">
              <Text className="fp-datos__section-title">Seguridad</Text>
              <Row gutter={[24, 20]}>
                <Col xs={24}>
                  <FpSeccionContrasena />
                </Col>
              </Row>
            </section>
          ) : null}

          <section className="fp-datos__section">
            <Text className="fp-datos__section-title">Rol y jornada</Text>
            <Row gutter={[24, 20]}>
              <Col xs={24} sm={12} md={8}>
                <DatoCampo label="Rol de usuario">
                  {etiquetaTipoUsuario(usuario.tipo_usuario)}
                </DatoCampo>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <DatoCampo label="Fecha de alta">
                  {usuario.fecha_alta ? dayjs(usuario.fecha_alta).format('DD/MM/YYYY') : '—'}
                </DatoCampo>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <DatoCampo label="Estado en la empresa">
                  <Tag color={usuario.activo ? 'success' : 'default'} className="fp-dato__tag">
                    {usuario.activo ? 'Activo' : 'No activo'}
                  </Tag>
                </DatoCampo>
              </Col>
              <Col xs={24} md={12}>
                <DatoCampo label="Tipo de hora">
                  {usuario.tipo_hora != null
                    ? etiquetaTipoHora(usuario.tipo_hora)
                    : jornadaAsignada?.tipo_hora
                      ? `${etiquetaTipoHora(jornadaAsignada.tipo_hora)} (jornada)`
                      : '—'}
                </DatoCampo>
              </Col>
              <Col xs={24} md={12}>
                <DatoCampo label="Jornada asignada">
                  {jornadaAsignada?.nombre || '—'}
                </DatoCampo>
              </Col>
            </Row>
          </section>

          <section className="fp-datos__section fp-datos__section--last">
            <Text className="fp-datos__section-title">Convenio y vacaciones</Text>
            <Row gutter={[24, 20]}>
              <Col xs={24} lg={14}>
                <DatoCampo label="Convenio">
                  {puedeEditarConvenio ? (
                    <div className="fp-convenio-edit">
                      <Select
                        allowClear
                        className="fp-convenio-select"
                        placeholder="Convenio por defecto de la empresa"
                        value={convenioSeleccionado}
                        onChange={setConvenioSeleccionado}
                        options={conveniosEmpresa.map((c) => ({
                          value: c.id_empresa_convenio,
                          label: c.nombre || c.catalogo?.nombre || `Convenio #${c.id_empresa_convenio}`,
                        }))}
                      />
                      <Button
                        type="primary"
                        size="small"
                        loading={guardandoConvenio}
                        disabled={
                          (convenioSeleccionado ?? null) === (usuario.id_empresa_convenio ?? null)
                        }
                        onClick={guardarConvenio}
                      >
                        Guardar
                      </Button>
                    </div>
                  ) : (
                    nombreConvenioVisible
                  )}
                </DatoCampo>
              </Col>
              <Col xs={24} lg={10}>
                <DatoCampo label="Conteo de vacaciones">
                  {modoConteoVisible}
                </DatoCampo>
              </Col>
            </Row>
          </section>
        </div>
      ),
    },
    {
      key: 'horario',
      label: 'Horario',
      children: jornadaAsignada ? (
        <div className="fp-horario-tab">
          <Text type="secondary" className="fp-horario-tab__tipo">
            {jornadaAsignada.nombre}
          </Text>
          <RegistroDiaCard
            tipo={jornadaAsignada}
            variant={esPropio ? 'resumen' : 'detalle'}
            contextoCalendario={contextoCalendario}
          />
        </div>
      ) : (
        <Empty
          className="fp-jornada-vacia"
          description="Sin jornada asignada"
        />
      ),
    },
    {
      key: 'cierres',
      label: `Cierres (${cierres.length})`,
      children: (
        <Table
          columns={columnsCierres}
          dataSource={cierres}
          rowKey={(r) => `${r.empresa_id}-${r.id_mes_cierre}`}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: 'Sin cierres mensuales registrados' }}
          scroll={{ x: 700 }}
        />
      ),
    },
    ...(esBolsa
      ? [{
          key: 'bolsa',
          label: 'Bolsa de horas',
          children: (
            <BolsaHorasPanel
              idUsuario={idUsuario}
              mesSincronizar={selectedMonth.format('YYYY-MM')}
              puedeAjustar={puedeAjustarBolsa}
            />
          ),
        }]
      : []),
    ...(puedeGestionarNominas
      ? [{
          key: 'retribucion',
          label: 'Retribución',
          children: (
            <RetribucionPanel idUsuario={idUsuario} />
          ),
        },
        {
          key: 'nominas',
          label: 'Nóminas',
          children: (
            <NominaDocumentoPanel idUsuario={idUsuario} />
          ),
        }]
      : []),
    ...(puedeVerNominas && esPropio
      ? [{
          key: 'mi-retribucion',
          label: 'Retribución',
          children: (
            <RetribucionPanel idUsuario={idUsuario} soloLectura />
          ),
        },
        {
          key: 'mis-nominas',
          label: 'Mis nóminas',
          children: <MisNominasPanel />,
        }]
      : []),
    ...(puedeVerVacaciones && (puedeGestionarVacaciones || esPropio)
      ? [{
          key: 'vacaciones',
          label: 'Vacaciones',
          children: (
            <VacacionesSaldoPanel
              idUsuario={idUsuario}
              puedeGestionar={puedeGestionarVacaciones}
            />
          ),
        }]
      : []),
    {
      key: 'registro',
      label: 'Registro mensual',
      children: (
        <>
          <DatePicker
            className="fp-month-picker"
            picker="month"
            format="MM/YYYY"
            value={selectedMonth}
            onChange={(date) => date && setSelectedMonth(date.startOf('month'))}
            disabledDate={(current) => current && current > dayjs()}
            allowClear={false}
          />
          <Table
            columns={columnsRegistro}
            dataSource={registroHoras}
            loading={loadingRegistro}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 700 }}
            locale={{ emptyText: 'Sin registros en este mes' }}
          />
          <ResumenHorasTotales
            totalHoras={totalHoras}
            totalHorasEsperadas={totalHorasEsperadas}
            resumenHoras={resumenHoras}
            className="fp-totales"
          />
        </>
      ),
    },
  ];

  const currentTabKey = tabItems.some((t) => t.key === activeTabKey)
    ? activeTabKey
    : (tabItems[0]?.key ?? 'datos');
  const currentTab = tabItems.find((t) => t.key === currentTabKey);

  return (
      <div className="fp-page">
        {!esMiPerfil && (
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(APP_ROUTES.users)}
            className="fp-back-btn"
          >
            Volver al listado
          </Button>
        )}

        <header className="fp-hero">
          <Tooltip title="Próximamente podrás subir una foto de perfil">
            <div className="fp-hero__avatar" aria-hidden>
              <span className="fp-hero__avatar-initials">
                {getInicialesEmpresa(usuario.nombre) || <UserOutlined />}
              </span>
              <span className="fp-hero__avatar-badge">
                <CameraOutlined />
              </span>
            </div>
          </Tooltip>
          <div className="fp-hero__body">
            <Text type="secondary" className="fp-hero__eyebrow">
              {esMiPerfil ? 'Mi perfil' : 'Ficha de personal'}
            </Text>
            <Title level={2} className="fp-hero__title">
              {usuario.nombre}
            </Title>
            <div className="fp-hero__meta">
              <Tag className="fp-hero__rol">
                {etiquetaTipoUsuario(usuario.tipo_usuario)}
              </Tag>
              {usuario.email ? (
                <a className="fp-hero__meta-line" href={`mailto:${usuario.email}`}>
                  {usuario.email}
                </a>
              ) : null}
              {usuario.telefono_whatsapp ? (
                <>
                  <span className="fp-hero__sep" aria-hidden>·</span>
                  <span className="fp-hero__meta-line">
                    {formatearTelefonoWhatsappDisplay(usuario.telefono_whatsapp)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </header>

        {isMobile ? (
          <Select
            className="fp-tab-select"
            value={currentTabKey}
            options={tabItems.map(({ key, label }) => ({ value: key, label }))}
            onChange={setActiveTabKey}
            aria-label="Sección del perfil"
          />
        ) : (
          <div className="fp-submenu-wrap">
            <nav className="fp-submenu" role="tablist" aria-label="Secciones del perfil">
              {tabItems.map(({ key, label }) => {
                const activo = currentTabKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    className={
                      activo
                        ? 'fp-submenu__item fp-submenu__item--active'
                        : 'fp-submenu__item'
                    }
                    onClick={() => setActiveTabKey(key)}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        <Card className="fp-card" bordered={false}>
          <div className="fp-tab-content" role="tabpanel">
            {currentTab?.children}
          </div>
        </Card>

        <RegistroMensualModal
          open={detalleCierreOpen}
          onClose={() => {
            setDetalleCierreOpen(false);
            setDetalleCierre(null);
            setFirmaCierreDetalle(null);
          }}
          title={
            detalleCierre
              ? `Cierre de ${dayjs(`${detalleCierre.mes}-01`).format('MMMM [de] YYYY')}`
              : 'Detalle del cierre'
          }
          loading={loadingDetalleCierre}
          registros={registroDetalleCierre}
          totalHoras={totalHorasDetalle}
          totalHorasEsperadas={totalEsperadasDetalle}
          resumenHoras={resumenHorasDetalle}
          onDescargarPdf={descargarPdfCierre}
          pdfDisabled={!detalleCierre}
          firmaCierreDetalle={firmaCierreDetalle}
          nombreEmpleado={usuario?.nombre}
        />
      </div>
  );
};

export default FichaPersonal;
