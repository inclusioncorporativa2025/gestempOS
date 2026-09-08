import { useState, useEffect, useCallback } from 'react';
import { getUltimoRegistroById } from '../features/empresas/empresasService';
import { getFechaEuropeMadrid } from '../utils/Helper';
import { useAuth } from '../config/AuthContext';
import { puedeUsarFichajeSesion } from '../utils/tipoUsuarioLabel';

export const JORNADA_ACTUALIZADA = 'gestemp:jornada-actualizada';

export const GESTION_TIEMPO_REFRESH = 'gestemp:gestion-tiempo-refresh';

export const notifyJornadaActualizada = () => {
  window.dispatchEvent(new CustomEvent(JORNADA_ACTUALIZADA));
};

export const notifyGestionTiempoRefresh = () => {
  window.dispatchEvent(new CustomEvent(GESTION_TIEMPO_REFRESH));
};

const calcularHorasDesde = (entrada) => {
  if (!entrada) return '00:00';
  const ahora = getFechaEuropeMadrid();
  const diffMs = ahora.getTime() - entrada.getTime();
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
};

const calcularTiempoPausa = (inicioMs) => {
  if (!inicioMs) return '00:00';
  const diffMs = getFechaEuropeMadrid().getTime() - inicioMs;
  const totalSeg = Math.max(0, Math.floor(diffMs / 1000));
  const minutos = Math.floor(totalSeg / 60);
  const segundos = totalSeg % 60;
  return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
};

const parseFechaRegistro = (fecha) => {
  if (!fecha) return null;
  return new Date(new Date(fecha).getTime());
};

/**
 * Estado de jornada del usuario: out | in | break
 * y acciones de fichaje disponibles según último registro.
 */
export const useEstadoJornada = () => {
  const { user, ready } = useAuth();
  const puedeFichar = puedeUsarFichajeSesion(user);
  const [estadoJornada, setEstadoJornada] = useState('out');
  const [horasTrabajadas, setHorasTrabajadas] = useState('00:00');
  const [tiposRegistros, setTiposRegistros] = useState([]);
  const [entradaMs, setEntradaMs] = useState(null);
  const [pausaInicioMs, setPausaInicioMs] = useState(null);
  const [tiempoPausa, setTiempoPausa] = useState('00:00');

  const refetch = useCallback(async () => {
    if (!puedeFichar) {
      setTiposRegistros([]);
      setHorasTrabajadas('00:00');
      setTiempoPausa('00:00');
      setEstadoJornada('out');
      setEntradaMs(null);
      setPausaInicioMs(null);
      return;
    }

    try {
      const ultimoRegistro = await getUltimoRegistroById();
      const registros = [];

      if (ultimoRegistro?.info != null) {
        const { fecha_entrada, fecha_salida } = ultimoRegistro.info;

        const entrada = parseFechaRegistro(fecha_entrada);
        const salida = parseFechaRegistro(fecha_salida);

        if (entrada && !salida && ultimoRegistro.descanso == null) {
          setEntradaMs(entrada.getTime());
          setPausaInicioMs(null);
          setHorasTrabajadas(calcularHorasDesde(entrada));
          setEstadoJornada('in');
          registros.push({ id: 2, nombre: 'Salida' });
          registros.push({ id: 3, nombre: 'Descanso' });
        } else if (ultimoRegistro.descanso != null) {
          const inicioPausa = parseFechaRegistro(ultimoRegistro.descanso.fecha_entrada);
          setEntradaMs(null);
          setPausaInicioMs(inicioPausa?.getTime() ?? null);
          setTiempoPausa(calcularTiempoPausa(inicioPausa?.getTime()));
          setEstadoJornada('break');
          registros.push({ id: 4, nombre: 'Fin Descanso' });
        } else {
          setEntradaMs(null);
          setPausaInicioMs(null);
          setEstadoJornada('out');
          setHorasTrabajadas('00:00');
          setTiempoPausa('00:00');
          registros.push({ id: 1, nombre: 'Entrada' });
        }
      } else {
        setEntradaMs(null);
        setPausaInicioMs(null);
        setEstadoJornada('out');
        setHorasTrabajadas('00:00');
        setTiempoPausa('00:00');
        registros.push({ id: 1, nombre: 'Entrada' });
      }

      setTiposRegistros(registros);
    } catch (error) {
      console.error('Error al obtener estado de jornada:', error);
      setTiposRegistros([]);
      setHorasTrabajadas('00:00');
      setTiempoPausa('00:00');
      setEstadoJornada('out');
      setEntradaMs(null);
      setPausaInicioMs(null);
    }
  }, [puedeFichar]);

  useEffect(() => {
    if (!ready || !puedeFichar) return undefined;
    refetch();
  }, [ready, puedeFichar, refetch]);

  useEffect(() => {
    if (!puedeFichar) return undefined;
    const onActualizada = () => refetch();
    window.addEventListener(JORNADA_ACTUALIZADA, onActualizada);
    return () => window.removeEventListener(JORNADA_ACTUALIZADA, onActualizada);
  }, [puedeFichar, refetch]);

  useEffect(() => {
    if (!puedeFichar) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [puedeFichar, refetch]);

  // Actualizar contador cada segundo mientras está en jornada
  useEffect(() => {
    if (estadoJornada !== 'in' || !entradaMs) return undefined;

    const tick = () => {
      setHorasTrabajadas(calcularHorasDesde(new Date(entradaMs)));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [estadoJornada, entradaMs]);

  useEffect(() => {
    if (estadoJornada !== 'break' || !pausaInicioMs) return undefined;

    const tick = () => {
      setTiempoPausa(calcularTiempoPausa(pausaInicioMs));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [estadoJornada, pausaInicioMs]);

  return {
    estadoJornada,
    horasTrabajadas,
    tiempoPausa,
    pausaInicioMs,
    tiposRegistros,
    refetch,
  };
};
