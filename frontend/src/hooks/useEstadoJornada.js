import { useState, useEffect, useCallback } from 'react';
import { getUltimoRegistroById } from '../features/empresas/empresasService';
import { getFechaEuropeMadrid } from '../utils/Helper';

export const JORNADA_ACTUALIZADA = 'gestemp:jornada-actualizada';

export const notifyJornadaActualizada = () => {
  window.dispatchEvent(new CustomEvent(JORNADA_ACTUALIZADA));
};

const calcularHorasDesde = (entrada) => {
  if (!entrada) return '00:00';
  const ahora = getFechaEuropeMadrid();
  const diffMs = ahora.getTime() - entrada.getTime();
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
};

/**
 * Estado de jornada del usuario: out | in | break
 * y acciones de fichaje disponibles según último registro.
 */
export const useEstadoJornada = () => {
  const [estadoJornada, setEstadoJornada] = useState('out');
  const [horasTrabajadas, setHorasTrabajadas] = useState('00:00');
  const [tiposRegistros, setTiposRegistros] = useState([]);
  const [entradaMs, setEntradaMs] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const ultimoRegistro = await getUltimoRegistroById();
      const registros = [];

      if (ultimoRegistro?.info != null) {
        const { fecha_entrada, fecha_salida } = ultimoRegistro.info;

        const parseFecha = (fecha) => {
          if (!fecha) return null;
          return new Date(new Date(fecha).getTime());
        };

        const entrada = parseFecha(fecha_entrada);
        const salida = parseFecha(fecha_salida);

        if (entrada && !salida && ultimoRegistro.descanso == null) {
          setEntradaMs(entrada.getTime());
          setHorasTrabajadas(calcularHorasDesde(entrada));
          setEstadoJornada('in');
          registros.push({ id: 2, nombre: 'Salida' });
          registros.push({ id: 3, nombre: 'Descanso' });
        } else if (ultimoRegistro.descanso != null) {
          setEntradaMs(null);
          setEstadoJornada('break');
          registros.push({ id: 4, nombre: 'Fin Descanso' });
        } else {
          setEntradaMs(null);
          setEstadoJornada('out');
          setHorasTrabajadas('00:00');
          registros.push({ id: 1, nombre: 'Entrada' });
        }
      } else {
        setEntradaMs(null);
        setEstadoJornada('out');
        setHorasTrabajadas('00:00');
        registros.push({ id: 1, nombre: 'Entrada' });
      }

      setTiposRegistros(registros);
    } catch (error) {
      console.error('Error al obtener estado de jornada:', error);
      setTiposRegistros([]);
      setHorasTrabajadas('00:00');
      setEstadoJornada('out');
      setEntradaMs(null);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const onActualizada = () => refetch();
    window.addEventListener(JORNADA_ACTUALIZADA, onActualizada);
    return () => window.removeEventListener(JORNADA_ACTUALIZADA, onActualizada);
  }, [refetch]);

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

  return {
    estadoJornada,
    horasTrabajadas,
    tiposRegistros,
    refetch,
  };
};
