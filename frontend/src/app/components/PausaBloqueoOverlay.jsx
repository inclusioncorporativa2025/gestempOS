import React, { useEffect, useState } from 'react';
import { Typography, message } from 'antd';
import { CoffeeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useEstadoJornada, notifyJornadaActualizada } from '../../hooks/useEstadoJornada';
import { useAuth } from '../../config/AuthContext';
import { crearRegistro } from '../../features/fichaje/fichajeService';
import GradientButton from './shared/GradientButton';
import './PausaBloqueoOverlay.css';

const { Title, Text } = Typography;

const TIPO_FIN_DESCANSO = 4;

const PausaBloqueoOverlay = ({ activo = true }) => {
  const { user } = useAuth();
  const { estadoJornada, tiempoPausa, refetch } = useEstadoJornada();
  const [loading, setLoading] = useState(false);

  const enPausa = activo && estadoJornada === 'break';

  useEffect(() => {
    if (!enPausa) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [enPausa]);

  if (!enPausa) return null;

  const handleVolver = async () => {
    const idUsuario = user?.id_usuario;
    if (!idUsuario) {
      message.error('Sesión no válida');
      return;
    }

    const guardarUbicacion = localStorage.getItem('guardarUbicacion') === 'true';

    setLoading(true);
    try {
      const response = await crearRegistro(TIPO_FIN_DESCANSO, idUsuario, guardarUbicacion);
      if (!response) {
        message.error('No se pudo finalizar la pausa');
        return;
      }
      message.success('Pausa finalizada. Has vuelto a la jornada.');
      await refetch();
      notifyJornadaActualizada();
    } catch (error) {
      message.error(error.message || 'No se pudo finalizar la pausa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="pausa-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pausa-overlay-title"
      aria-describedby="pausa-overlay-desc"
    >
      <div className="pausa-overlay__backdrop" aria-hidden="true" />
      <div className="pausa-overlay__panel">
        <div className="pausa-overlay__icon" aria-hidden="true">
          <CoffeeOutlined />
        </div>
        <Title level={3} id="pausa-overlay-title" className="pausa-overlay__title">
          Estás en pausa
        </Title>
        <Text id="pausa-overlay-desc" className="pausa-overlay__desc">
          Finaliza la pausa para continuar usando la aplicación.
        </Text>

        <div className="pausa-overlay__timer-block">
          <span className="pausa-overlay__timer-label">Tiempo en pausa</span>
          <time className="pausa-overlay__timer" dateTime={`PT${tiempoPausa.replace(':', 'M')}S`}>
            {tiempoPausa}
          </time>
        </div>

        <GradientButton
          block
          size="large"
          className="pausa-overlay__btn"
          iconStart={<CheckCircleOutlined />}
          loading={loading}
          onClick={handleVolver}
          text="Volver a la jornada"
        />
      </div>
    </div>
  );
};

export default PausaBloqueoOverlay;
