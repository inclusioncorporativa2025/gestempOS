import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout, Calendar, Modal, Input, Form, message, Badge, Typography, Button, Space, DatePicker, Tooltip } from 'antd';
import { SyncOutlined, SettingOutlined, LeftOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import locale from 'antd/locale/es_ES';
import { ConfigProvider } from 'antd';
import {
  getFestivosByIdEmpresa,
  getFestivosCalendario,
  guardarFestivoEmpresa,
  eliminarFestivoEmpresa,
  sincronizarFestivosOficiales,
} from '../../features/calendario/CalendarioService';
import { getAusenciasCalendario } from '../../features/ausencias/ausenciasService';
import { getMiEmpresa } from '../../features/empresas/empresasService';
import { APP_ROUTES } from '../../constants/routes';
import { useAuth } from '../../config/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import './Calendario.css';

dayjs.locale('es');

const { Text } = Typography;

const MOBILE_BREAKPOINT = 950;

/** Tipos 1,3,4 gestionan festivos; 2,3,4 (+1) ven ausencias de toda la empresa */
const TIPOS_GESTION_FESTIVOS = [1, 2, 3, 4];
const TIPOS_AUSENCIAS_EMPRESA = [1, 2, 3, 4];

const Calendario = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tieneFeature } = usePlan();
  const puedeVerAusencias = tieneFeature('ausencias_basicas');
  const tipoUsuario = Number(user?.tipo_usuario);
  const puedeGestionarFestivos = TIPOS_GESTION_FESTIVOS.includes(tipoUsuario);
  const verAusenciasEmpresa = TIPOS_AUSENCIAS_EMPRESA.includes(tipoUsuario);

  const [festivos, setFestivos] = useState([]);
  const [eventosAusencia, setEventosAusencia] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [calendarValue, setCalendarValue] = useState(() => dayjs());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [form] = Form.useForm();
  const añoActual = dayjs().year();

  useEffect(() => {
    const fetchFestivos = async () => {
      try {
        const fetcher = puedeGestionarFestivos
          ? getFestivosByIdEmpresa
          : getFestivosCalendario;
        const data = await fetcher();
        const lista = Array.isArray(data) ? data : data?.festivos;
        if (Array.isArray(lista)) {
          setFestivos(lista.filter((f) => f.fecha_baja === null));
        } else {
          message.error('Error al cargar los festivos');
        }
      } catch {
        message.error('Error al cargar los festivos');
      }
    };

    const fetchAusencias = async () => {
      try {
        const data = await getAusenciasCalendario();
        setEventosAusencia(Array.isArray(data?.eventos) ? data.eventos : []);
      } catch (err) {
        console.error(err);
        message.error('Error al cargar las ausencias');
      }
    };

    fetchFestivos();
    if (puedeVerAusencias) {
      fetchAusencias();
    }
  }, [puedeVerAusencias, puedeGestionarFestivos]);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const diasDelMes = useMemo(() => {
    const inicio = calendarValue.startOf('month');
    const total = inicio.daysInMonth();
    return Array.from({ length: total }, (_, i) => inicio.add(i, 'day'));
  }, [calendarValue]);

  const { diasPasados, diasFuturos } = useMemo(() => {
    const hoy = dayjs().startOf('day');
    return {
      diasPasados: diasDelMes.filter((d) => d.isBefore(hoy, 'day')),
      diasFuturos: diasDelMes.filter((d) => !d.isBefore(hoy, 'day')),
    };
  }, [diasDelMes]);

  useEffect(() => {
    setHistorialAbierto(false);
  }, [calendarValue]);

  const ausenciasPorFecha = useMemo(() => {
    const map = new Map();
    eventosAusencia.forEach((ev) => {
      if (!map.has(ev.fecha)) map.set(ev.fecha, []);
      map.get(ev.fecha).push(ev);
    });
    return map;
  }, [eventosAusencia]);

  const getAusenciasDelDia = (date) =>
    ausenciasPorFecha.get(date.format('YYYY-MM-DD')) || [];

  const renderAusenciaCelda = (ev) => (
    <div
      key={`${ev.id_ausencia}-${ev.id_usuario}-${ev.fecha}`}
      className="cal-ausencia-item"
      title={
        verAusenciasEmpresa && ev.nombre_usuario
          ? `${ev.nombre_usuario}\n${ev.tipo}`
          : ev.tipo
      }
    >
      <span className="cal-ausencia-dot" aria-hidden />
      <div className="cal-ausencia-textos">
        {verAusenciasEmpresa && ev.nombre_usuario && (
          <span className="cal-ausencia-nombre">{ev.nombre_usuario}</span>
        )}
        <span className="cal-ausencia-tipo">{ev.tipo}</span>
      </div>
    </div>
  );

  const renderAusenciaAgenda = (ev) => (
    <div
      key={`agenda-${ev.id_ausencia}-${ev.id_usuario}-${ev.fecha}`}
      className="cal-agenda-event cal-agenda-event--ausencia"
    >
      <span className="cal-ausencia-dot" aria-hidden />
      <div className="cal-agenda-event__textos">
        {verAusenciasEmpresa && ev.nombre_usuario && (
          <span className="cal-agenda-event__titulo">{ev.nombre_usuario}</span>
        )}
        <span className="cal-agenda-event__subtitulo">{ev.tipo}</span>
      </div>
    </div>
  );

  const renderFestivoAgenda = (festivo) => (
    <div
      className={`cal-agenda-event cal-agenda-event--festivo cal-agenda-event--festivo-${festivo.origen === 'oficial' ? 'oficial' : 'local'}`}
    >
      <span
        className={`cal-agenda-event__dot cal-agenda-event__dot--${festivo.origen === 'oficial' ? 'oficial' : 'local'}`}
        aria-hidden
      />
      <span className="cal-agenda-event__titulo">{festivo.descripcion}</span>
    </div>
  );

  const mostrarDetalleAusencias = (date, ausenciasDia) => {
    Modal.info({
      title: `Ausencias — ${date.format('D [de] MMMM [de] YYYY')}`,
      width: 480,
      content: (
        <ul className="cal-ausencias-lista">
          {ausenciasDia.map((ev) => (
            <li key={`${ev.id_ausencia}-${ev.id_usuario}-${ev.tipo}`}>
              {verAusenciasEmpresa && ev.nombre_usuario && (
                <div>
                  <Text strong>{ev.nombre_usuario}</Text>
                </div>
              )}
              <Text type={verAusenciasEmpresa && ev.nombre_usuario ? 'secondary' : undefined}>
                {ev.tipo}
              </Text>
            </li>
          ))}
        </ul>
      ),
      okText: 'Cerrar',
    });
  };

  const showModal = (date) => {
    setSelectedDate(date);
    const fechaIso = date.format('YYYY-MM-DD');
    const yaEsFestivo = festivos.find((f) => f.fecha === fechaIso);
    const ausenciasDia = getAusenciasDelDia(date);

    if (puedeVerAusencias && ausenciasDia.length > 0) {
      mostrarDetalleAusencias(date, ausenciasDia);
    }

    if (!puedeGestionarFestivos) {
      return;
    }

    if (yaEsFestivo) {
      const esOficial = yaEsFestivo.origen === 'oficial';
      Modal.confirm({
        title: '¿Deseas eliminar este festivo?',
        content: (
          <>
            <div>{yaEsFestivo.descripcion}</div>
            {esOficial && (
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                Festivo oficial importado. Puedes volver a importarlo desde el calendario.
              </Text>
            )}
          </>
        ),
        okText: 'Eliminar',
        cancelText: 'Cancelar',
        onOk: async () => {
          const result = await eliminarFestivoEmpresa(yaEsFestivo.id_festivo);
          if (result?.message) {
            setFestivos((prev) => prev.filter((f) => f.id_festivo !== yaEsFestivo.id_festivo));
            message.success('Festivo eliminado');
          } else {
            message.error('Error al eliminar festivo');
          }
        },
      });
    } else if (!puedeVerAusencias || !ausenciasDia.length) {
      setIsModalVisible(true);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const descripcion = values.descripcion;
      const fecha = selectedDate.format('YYYY-MM-DD');

      const result = await guardarFestivoEmpresa({ fecha, descripcion });

      if (result && result.id_festivo) {
        setFestivos([...festivos, result]);
        message.success('Festivo guardado correctamente');
        setIsModalVisible(false);
        form.resetFields();
      } else {
        message.error('Error al guardar festivo');
      }
    } catch (error) {
      console.error(error);
      message.error('Error al validar el formulario');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const mostrarModalConfigEmpresa = useCallback(() => {
    Modal.confirm({
      title: 'Datos de empresa sin configurar',
      icon: <SettingOutlined />,
      content: (
        <p>
          Para importar los festivos oficiales debes guardar la{' '}
          <strong>comunidad autónoma</strong> en la configuración de la empresa.
        </p>
      ),
      okText: 'Ir a configuración',
      cancelText: 'Cerrar',
      onOk: () => {
        navigate(APP_ROUTES.settingsEmpresa);
      },
    });
  }, [navigate]);

  const empresaTieneRegionFestivos = async () => {
    try {
      const empresa = await getMiEmpresa();
      return Boolean(empresa?.codigo_region_festivos?.trim());
    } catch {
      return false;
    }
  };

  const handleSincronizarOficiales = async () => {
    const tieneRegion = await empresaTieneRegionFestivos();
    if (!tieneRegion) {
      mostrarModalConfigEmpresa();
      return;
    }

    setSyncing(true);
    try {
      const data = await sincronizarFestivosOficiales(añoActual);
      if (Array.isArray(data.festivos)) {
        setFestivos(data.festivos.filter((f) => f.fecha_baja === null));
      }
      const { creados = 0, actualizados = 0 } = data.resultado || {};
      message.success(
        `Festivos ${añoActual} importados: ${creados} nuevos, ${actualizados} actualizados`,
      );
    } catch (error) {
      if (error.code === 'EMPRESA_FESTIVOS_SIN_CONFIGURAR') {
        mostrarModalConfigEmpresa();
      } else {
        message.error(error.message || 'No se pudieron importar los festivos oficiales');
      }
    } finally {
      setSyncing(false);
    }
  };

  const dateCellRender = (value) => {
    const fechaIso = value.format('YYYY-MM-DD');
    const festivo = festivos.find((f) => f.fecha === fechaIso);
    const ausenciasDia = ausenciasPorFecha.get(fechaIso) || [];

    return (
      <div className="cal-cell-content">
        {festivo && (
          <Badge
            status={festivo.origen === 'oficial' ? 'warning' : 'error'}
            text={festivo.descripcion}
            className={`cal-badge${festivo.origen === 'oficial' ? ' cal-badge--oficial' : ''}`}
          />
        )}
        {puedeVerAusencias && ausenciasDia.slice(0, 3).map((ev) => renderAusenciaCelda(ev))}
        {puedeVerAusencias && ausenciasDia.length > 3 && (
          <Text type="secondary" className="cal-mas-ausencias">
            +{ausenciasDia.length - 3} más
          </Text>
        )}
      </div>
    );
  };

  const cambiarMes = (delta) => {
    setCalendarValue((prev) => prev.add(delta, 'month'));
  };

  const renderBotonImportar = (compacto = false) => (
    <Tooltip title={`Importar festivos oficiales ${añoActual}`}>
      <Button
        type={compacto ? 'text' : 'default'}
        size={compacto ? 'middle' : 'small'}
        icon={<SyncOutlined />}
        loading={syncing}
        onClick={handleSincronizarOficiales}
        className={compacto ? 'cal-mobile-nav__import' : 'cal-import-btn'}
        aria-label={`Importar festivos oficiales ${añoActual}`}
      >
        {!compacto && `Importar ${añoActual}`}
      </Button>
    </Tooltip>
  );

  const renderLeyenda = () => (
    <div className="cal-leyenda">
      <Badge status="warning" text="Festivo oficial" />
      <Badge status="error" text="Festivo local" />
      {puedeVerAusencias && (
        <Badge status="processing" text={verAusenciasEmpresa ? 'Ausencia (equipo)' : 'Mi ausencia'} />
      )}
      {puedeGestionarFestivos && (
        <>
          <Text
            type="secondary"
            className={`cal-leyenda-hint${isMobile ? ' cal-leyenda-hint--mobile' : ''}`}
          >
            Pulsa un día vacío para añadir festivo local
          </Text>
          {!isMobile && (
            <Space className="cal-leyenda-actions">
              {renderBotonImportar(false)}
            </Space>
          )}
        </>
      )}
    </div>
  );

  const renderAgendaMovil = () => {
    const diasPasadosConEventos = diasPasados.filter((date) => {
      const fechaIso = date.format('YYYY-MM-DD');
      const festivo = festivos.find((f) => f.fecha === fechaIso);
      const ausenciasDia = getAusenciasDelDia(date);
      return Boolean(festivo || ausenciasDia.length);
    }).length;

    const renderDiaAgenda = (date, { esPasado = false } = {}) => {
      const fechaIso = date.format('YYYY-MM-DD');
      const festivo = festivos.find((f) => f.fecha === fechaIso);
      const ausenciasDia = getAusenciasDelDia(date);
      const hasContent = Boolean(festivo || ausenciasDia.length);
      const isToday = date.isSame(dayjs(), 'day');

      return (
        <button
          key={fechaIso}
          type="button"
          className={[
            'cal-mobile-day',
            hasContent ? 'cal-mobile-day--has-events' : '',
            isToday ? 'cal-mobile-day--today' : '',
            esPasado ? 'cal-mobile-day--past' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => showModal(date)}
        >
          <div className="cal-mobile-day__header">
            <span className="cal-mobile-day__fecha">
              {date.format('ddd D MMM')}
            </span>
            {isToday && (
              <span className="cal-hoy-chip" aria-label="Día actual">
                Hoy
              </span>
            )}
          </div>
          {hasContent ? (
            <div className="cal-mobile-day__events">
              {festivo && renderFestivoAgenda(festivo)}
              {puedeVerAusencias && ausenciasDia.map((ev) => renderAusenciaAgenda(ev))}
            </div>
          ) : (
            <span className="cal-mobile-day__vacio">Sin eventos</span>
          )}
        </button>
      );
    };

    return (
    <>
      <div className="cal-mobile-nav">
        <Button
          type="text"
          icon={<LeftOutlined />}
          aria-label="Mes anterior"
          onClick={() => cambiarMes(-1)}
        />
        <DatePicker
          picker="month"
          value={calendarValue}
          onChange={(date) => date && setCalendarValue(date)}
          allowClear={false}
          format="MMMM YYYY"
          className="cal-mobile-nav__picker"
          inputReadOnly
        />
        <Button
          type="text"
          icon={<RightOutlined />}
          aria-label="Mes siguiente"
          onClick={() => cambiarMes(1)}
        />
        {puedeGestionarFestivos && renderBotonImportar(true)}
      </div>

      <div className="cal-mobile-agenda">
        {diasPasados.length > 0 && (
          <div className="cal-mobile-historial">
            <button
              type="button"
              className="cal-mobile-historial__toggle"
              onClick={() => setHistorialAbierto((prev) => !prev)}
              aria-expanded={historialAbierto}
            >
              <span>
                {historialAbierto ? 'Ocultar historial' : 'Ver historial'}
                {' '}({diasPasados.length} {diasPasados.length === 1 ? 'día' : 'días'})
                {diasPasadosConEventos > 0 && (
                  <span className="cal-mobile-historial__hint">
                    {' '}· {diasPasadosConEventos} con eventos
                  </span>
                )}
              </span>
              <DownOutlined className={`cal-mobile-historial__icon${historialAbierto ? ' cal-mobile-historial__icon--open' : ''}`} />
            </button>
            {historialAbierto && (
              <div className="cal-mobile-historial__lista">
                {diasPasados.map((date) => renderDiaAgenda(date, { esPasado: true }))}
              </div>
            )}
          </div>
        )}

        {diasFuturos.length > 0 ? (
          diasFuturos.map((date) => renderDiaAgenda(date))
        ) : (
          <p className="cal-mobile-empty-futuro">No quedan días por delante este mes</p>
        )}
      </div>
    </>
    );
  };

  return (
    <ConfigProvider locale={locale}>
      <Layout className="calendario-layout">
        {renderLeyenda()}

        {isMobile ? (
          renderAgendaMovil()
        ) : (
          <Calendar
            fullscreen
            value={calendarValue}
            onPanelChange={setCalendarValue}
            cellRender={dateCellRender}
            onSelect={showModal}
          />
        )}

        {puedeGestionarFestivos && (
          <Modal
            title={`Agregar festivo local para ${selectedDate?.format('D [de] MMMM [de] YYYY')}`}
            open={isModalVisible}
            onOk={handleOk}
            onCancel={handleCancel}
            okText="Guardar"
            cancelText="Cancelar"
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="descripcion"
                label="Descripción del festivo local"
                rules={[{ required: true, message: 'Por favor, ingrese una descripción' }]}
              >
                <Input placeholder="Ej. Festivo municipal, puente de empresa…" />
              </Form.Item>
            </Form>
          </Modal>
        )}
      </Layout>
    </ConfigProvider>
  );
};

export default Calendario;
