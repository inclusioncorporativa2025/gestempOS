import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Card,
  Tabs,
  Descriptions,
  Table,
  Button,
  DatePicker,
  Tag,
  Typography,
  message,
  Spin,
  Empty,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import esES from 'antd/es/locale/es_ES';
import { ConfigProvider } from 'antd';

import { APP_ROUTES } from '../../constants/routes';
import { getUsuariosEmpresa, getHorasTotalesMesByIdUsuario, getMiPerfil } from '../../features/user/usuarioService';
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
import VacacionesSaldoPanel from '../components/VacacionesSaldoPanel';
import RetribucionPanel from '../components/RetribucionPanel';
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
import './FichaPersonal.css';

dayjs.locale('es');

const { Title, Text } = Typography;

const formatearFecha = (fecha) =>
  fecha && dayjs(fecha).isValid() ? dayjs(fecha).format('DD/MM/YYYY HH:mm') : '—';

const FichaPersonal = () => {
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
  const tipoHoraEfectivo = usuario.tipo_hora ?? jornadaAsignada?.tipo_hora ?? resumenHoras?.tipo_hora;
  const esBolsa = Number(tipoHoraEfectivo) === TIPO_HORA_BOLSA;

  const tabItems = [
    {
      key: 'datos',
      label: 'Datos',
      children: (
        <Descriptions
          className="fp-datos-grid"
          bordered
          column={{ xs: 1, sm: 2 }}
          size="middle"
        >
          <Descriptions.Item label="Nombre">{usuario.nombre}</Descriptions.Item>
          <Descriptions.Item label="Email">{usuario.email}</Descriptions.Item>
          <Descriptions.Item label="DNI">{usuario.dni}</Descriptions.Item>
          <Descriptions.Item label="Tipo">
            {etiquetaTipoUsuario(usuario.tipo_usuario)}
          </Descriptions.Item>
          <Descriptions.Item label="Tipo de hora">
            {usuario.tipo_hora != null
              ? etiquetaTipoHora(usuario.tipo_hora)
              : jornadaAsignada?.tipo_hora
                ? `${etiquetaTipoHora(jornadaAsignada.tipo_hora)} (jornada)`
                : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Fecha de alta">
            {usuario.fecha_alta ? dayjs(usuario.fecha_alta).format('DD/MM/YYYY') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Activo">
            {usuario.activo ? 'Sí' : 'No'}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'horario',
      label: 'Horario',
      children: jornadaAsignada ? (
        <div>
          <Title level={5} style={{ marginTop: 0 }}>
            {jornadaAsignada.nombre}
          </Title>
          <RegistroDiaCard
            tipo={jornadaAsignada}
            variant={esPropio ? 'resumen' : 'detalle'}
            contextoCalendario={esPropio ? contextoCalendario : null}
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
          <div className="fp-totales">
            <span className="fp-total-sep">
              Total horas trabajadas: {totalHoras}
            </span>
            <span>Total horas esperadas: {totalHorasEsperadas}</span>
            {resumenHoras?.tipo_hora_label && (
              <span>Tipo de hora: {resumenHoras.tipo_hora_label}</span>
            )}
            {resumenHoras?.desglose && <span>{resumenHoras.desglose}</span>}
            {resumenHoras?.saldo_bolsa && (
              <span>Saldo bolsa: {resumenHoras.saldo_bolsa}</span>
            )}
          </div>
        </>
      ),
    },
  ];

  return (
    <ConfigProvider locale={esES}>
      <div className="fp-page">
        <div className="fp-header">
          <div className="fp-header-main">
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
            <Title level={2} className="fp-title">
              {esMiPerfil ? 'Mi perfil' : 'Ficha de personal'}
            </Title>
            <Text className="fp-subtitle">
              {usuario.nombre} · {usuario.dni}
            </Text>
          </div>
        </div>

        <Card className="fp-card">
          <Tabs items={tabItems} destroyInactiveTabPane={false} />
        </Card>

        <Modal
          open={detalleCierreOpen}
          onCancel={() => {
            setDetalleCierreOpen(false);
            setDetalleCierre(null);
            setFirmaCierreDetalle(null);
          }}
          footer={null}
          width="80%"
          title={
            detalleCierre
              ? `Cierre de ${dayjs(`${detalleCierre.mes}-01`).format('MMMM [de] YYYY')}`
              : 'Detalle del cierre'
          }
          destroyOnClose
        >
          {loadingDetalleCierre ? (
            <div className="fp-loading">
              <Spin />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12, textAlign: 'right' }}>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={descargarPdfCierre}
                  disabled={!detalleCierre}
                >
                  Descargar PDF
                </Button>
              </div>
              <Table
                columns={columnsRegistro.filter((c) => c.key !== 'tipo')}
                dataSource={registroDetalleCierre}
                rowKey="fecha"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 600 }}
              />
              <div className="fp-totales">
                <span className="fp-total-sep">
                  Total horas trabajadas: {totalHorasDetalle}
                </span>
                <span>Total horas esperadas: {totalEsperadasDetalle}</span>
                {resumenHorasDetalle?.tipo_hora_label && (
                  <span>Tipo de hora: {resumenHorasDetalle.tipo_hora_label}</span>
                )}
                {resumenHorasDetalle?.desglose && (
                  <span>{resumenHorasDetalle.desglose}</span>
                )}
                {resumenHorasDetalle?.saldo_bolsa && (
                  <span>Saldo bolsa: {resumenHorasDetalle.saldo_bolsa}</span>
                )}
              </div>
              {firmaCierreDetalle?.firmado && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>Firma del personal</Text>
                  {firmaCierreDetalle.firma_imagen && (
                    <div style={{ marginTop: 8 }}>
                      <img
                        src={firmaCierreDetalle.firma_imagen}
                        alt="Firma del personal"
                        style={{ maxWidth: 280, border: '1px solid #eee', borderRadius: 8 }}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default FichaPersonal;
