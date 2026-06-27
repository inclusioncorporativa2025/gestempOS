import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout, Calendar, Modal, Input, Form, message, Badge, Typography, Button, Space } from 'antd';
import { SyncOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import locale from 'antd/locale/es_ES';
import { ConfigProvider } from 'antd';
import {
  getFestivosByIdEmpresa,
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
  const [form] = Form.useForm();
  const añoActual = dayjs().year();

  useEffect(() => {
    const fetchFestivos = async () => {
      try {
        const data = await getFestivosByIdEmpresa();
        if (Array.isArray(data)) {
          setFestivos(data.filter((f) => f.fecha_baja === null));
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
  }, [puedeVerAusencias]);

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

  return (
    <ConfigProvider locale={locale}>
      <Layout className="calendario-layout">
        <div className="cal-leyenda">
          <Badge status="warning" text="Festivo oficial" />
          <Badge status="error" text="Festivo local" />
          {puedeVerAusencias && (
            <Badge status="processing" text={verAusenciasEmpresa ? 'Ausencia (equipo)' : 'Mi ausencia'} />
          )}
          {puedeGestionarFestivos && (
            <>
              <Text type="secondary" className="cal-leyenda-hint">
                Pulsa un día vacío para añadir festivo local
              </Text>
              <Space className="cal-leyenda-actions">
                <Button
                  type="default"
                  icon={<SyncOutlined />}
                  loading={syncing}
                  onClick={handleSincronizarOficiales}
                >
                  Importar festivos oficiales {añoActual}
                </Button>
              </Space>
            </>
          )}
        </div>

        <Calendar
          fullscreen
          cellRender={dateCellRender}
          onSelect={showModal}
        />

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
