import React, { useState, useEffect } from 'react';
import { Button, Typography, message, Switch } from 'antd';
import {
  LoginOutlined,
  LogoutOutlined,
  CoffeeOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { crearRegistro } from '../features/fichaje/fichajeService';
import { getFechaEuropeMadrid } from '../utils/Helper';
import { useEstadoJornada, notifyJornadaActualizada } from '../hooks/useEstadoJornada';
import { useAuth } from '../config/AuthContext';
import ConfirmPopup from '../components/shared/ConfirmPopup';
import './Home.css';

const { Title } = Typography;

const ACCIONES = {
  1: {
    nombre: 'Fichar entrada',
    descripcion: 'Iniciar jornada laboral',
    icon: LoginOutlined,
    className: 'home-action-btn--entrada',
    modalAccent: 'entrada',
  },
  2: {
    nombre: 'Fichar salida',
    descripcion: 'Finalizar jornada laboral',
    icon: LogoutOutlined,
    className: 'home-action-btn--salida',
    modalAccent: 'salida',
  },
  3: {
    nombre: 'Iniciar descanso',
    descripcion: 'Pausa durante la jornada',
    icon: CoffeeOutlined,
    className: 'home-action-btn--descanso',
    modalAccent: 'descanso',
  },
  4: {
    nombre: 'Fin de descanso',
    descripcion: 'Volver a la jornada',
    icon: CheckCircleOutlined,
    className: 'home-action-btn--fin-descanso',
    modalAccent: 'fin-descanso',
  },
};

const ESTADOS = {
  out: { label: 'Fuera de jornada', className: 'home-status--out' },
  in: { label: 'En jornada', className: 'home-status--in' },
  break: { label: 'En descanso', className: 'home-status--break' },
};

const formatearReloj = (fecha) =>
  fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const formatearFecha = (fecha) =>
  fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [horaActual, setHoraActual] = useState(() => formatearReloj(getFechaEuropeMadrid()));
  const { estadoJornada, horasTrabajadas, tiposRegistros, refetch } = useEstadoJornada();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTipoId, setPendingTipoId] = useState(null);
  const [confirmHora, setConfirmHora] = useState('');

  const [guardarUbicacion, setGuardarUbicacion] = useState(() => {
    const saved = localStorage.getItem('guardarUbicacion');
    return saved === 'true';
  });

  const { user } = useAuth();
  const nombreUsuario = user?.nombre ?? '';
  const fechaHoy = formatearFecha(getFechaEuropeMadrid());

  useEffect(() => {
    localStorage.setItem('guardarUbicacion', guardarUbicacion);
  }, [guardarUbicacion]);

  useEffect(() => {
    const tick = setInterval(() => {
      setHoraActual(formatearReloj(getFechaEuropeMadrid()));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const solicitarConfirmacion = (tipoId) => {
    const registro = tiposRegistros.find((r) => r.id === tipoId);
    if (!registro) {
      message.error('Acción no disponible');
      return;
    }

    setPendingTipoId(tipoId);
    setConfirmHora(formatearReloj(getFechaEuropeMadrid()));
    setConfirmOpen(true);
  };

  const cerrarConfirmacion = () => {
    if (loading) return;
    setConfirmOpen(false);
    setPendingTipoId(null);
  };

  const confirmarFichaje = async () => {
    if (pendingTipoId == null) return;
    await registrarFichaje(pendingTipoId);
    setConfirmOpen(false);
    setPendingTipoId(null);
  };

  const registrarFichaje = async (tipoId) => {
    const registro = tiposRegistros.find((r) => r.id === tipoId);
    if (!registro) {
      message.error('Acción no disponible');
      return;
    }

    try {
      setLoading(true);
      setLoadingId(tipoId);
      const usuario = user?.id_usuario;
      if (!usuario) {
        message.error('Sesión no válida');
        return;
      }
      const response = await crearRegistro(tipoId, usuario, guardarUbicacion);

      if (!response) {
        message.error('No se pudo registrar el fichaje');
      } else {
        const config = ACCIONES[tipoId];
        message.success(config ? `${config.nombre} registrada correctamente` : 'Fichaje registrado');
        await refetch();
        notifyJornadaActualizada();
      }
    } catch (error) {
      console.error('Error al crear registro:', error);
      message.error('Ocurrió un error al registrar el fichaje');
    } finally {
      setLoading(false);
      setLoadingId(null);
    }
  };

  const estado = ESTADOS[estadoJornada] || ESTADOS.out;

  const pendingConfig = pendingTipoId != null
    ? ACCIONES[pendingTipoId] || {
        nombre: tiposRegistros.find((r) => r.id === pendingTipoId)?.nombre || 'Fichaje',
        icon: LoginOutlined,
        modalAccent: 'entrada',
      }
    : null;

  const confirmMeta = [{ label: 'Hora', value: confirmHora }];
  if (guardarUbicacion) {
    confirmMeta.push({ value: 'Se guardará tu ubicación' });
  }

  return (
    <div className="home-page">
      <div className="home-container">
        <header className="home-header">
          <Title level={2} className="home-greeting">
            Hola, {nombreUsuario}
          </Title>
          <span className="home-date">{fechaHoy}</span>
        </header>

        <div className="home-card">
          <div className={`home-status ${estado.className}`}>
            <span className="home-status-dot" aria-hidden />
            <span>{estado.label}</span>
          </div>

          <div className="home-clock-block">
            <time className="home-clock" dateTime={horaActual}>
              {horaActual}
            </time>
            {estadoJornada === 'in' && (
              <>
                <span className="home-hours-label">Tiempo en jornada</span>
                <span className="home-hours-value">{horasTrabajadas}</span>
              </>
            )}
          </div>

          <span className="home-actions-title">¿Qué deseas registrar?</span>

          <div className="home-actions">
            {tiposRegistros.map((registro) => {
              const config = ACCIONES[registro.id] || {
                nombre: registro.nombre,
                descripcion: '',
                icon: LoginOutlined,
                className: 'home-action-btn--entrada',
              };
              const Icon = config.icon;

              return (
                <Button
                  key={registro.id}
                  type="primary"
                  block
                  size="large"
                  className={`home-action-btn ${config.className}`}
                  loading={loading && loadingId === registro.id}
                  disabled={loading && loadingId !== registro.id}
                  onClick={() => solicitarConfirmacion(registro.id)}
                >
                  <Icon />
                  <span>
                    {config.nombre}
                    {config.descripcion && (
                      <small className="home-action-desc">{config.descripcion}</small>
                    )}
                  </span>
                </Button>
              );
            })}
          </div>

          <footer className="home-footer">
            <div>
              <span className="home-footer-text">Guardar ubicación</span>
              <span className="home-footer-hint">Opcional al fichar</span>
            </div>
            <Switch
              checked={guardarUbicacion}
              onChange={setGuardarUbicacion}
              aria-label="Guardar ubicación al fichar"
            />
          </footer>
        </div>
      </div>

      {pendingConfig && (
        <ConfirmPopup
          open={confirmOpen}
          onCancel={cerrarConfirmacion}
          onConfirm={confirmarFichaje}
          title="Confirmar fichaje"
          message={
            <>
              ¿Deseas registrar <strong>{pendingConfig.nombre}</strong>?
            </>
          }
          meta={confirmMeta}
          icon={pendingConfig.icon}
          variant={pendingConfig.modalAccent}
          confirmLoading={loading}
        />
      )}
    </div>
  );
};

export default Home;
