import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { etiquetaAusenciaCalendario } from '../constants/tiposAusencia';

dayjs.locale('es');

const DIAS_SEMANA_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const minutosEntreHoras = (horaEntrada, horaSalida) => {
  const normalizar = (valor) => {
    if (valor == null || valor === '') return null;
    const str = String(valor).trim();
    const iso = str.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (iso) return `${iso[1].padStart(2, '0')}:${iso[2]}:${(iso[3] || '00').padStart(2, '0')}`;
    const hm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (hm) return `${hm[1].padStart(2, '0')}:${hm[2]}:${(hm[3] || '00').padStart(2, '0')}`;
    return null;
  };

  const entrada = normalizar(horaEntrada);
  const salida = normalizar(horaSalida);
  if (!entrada || !salida) return 0;

  const inicio = dayjs(`2020-01-01T${entrada}`);
  const fin = dayjs(`2020-01-01T${salida}`);
  if (!inicio.isValid() || !fin.isValid() || !fin.isAfter(inicio)) return 0;

  return fin.diff(inicio, 'minute');
};

export const minutosTramosDia = (dia) => {
  const tramos = Array.isArray(dia?.horario) ? dia.horario : [];
  return tramos.reduce((total, tramo) => {
    const entrada = tramo?.horaEntrada ?? tramo?.hora_entrada;
    const salida = tramo?.horaSalida ?? tramo?.hora_salida;
    return total + minutosEntreHoras(entrada, salida);
  }, 0);
};

export const minutosSemanalesJornadaFija = (dias) => {
  if (!Array.isArray(dias)) return 0;
  return dias.reduce((total, dia) => total + minutosTramosDia(dia), 0);
};

export const formatearMinutosHoras = (minutos) => {
  const total = Math.max(0, Math.round(Number(minutos) || 0));
  const horas = Math.floor(total / 60);
  const mins = total % 60;
  return `${horas}h ${mins}m`;
};

export const formatearHoraLegible = (hora) => {
  if (hora == null || hora === '') return null;
  const str = String(hora).trim();
  const iso = str.match(/T(\d{1,2}):(\d{2})/);
  const hm = str.match(/^(\d{1,2}):(\d{2})/);
  const match = iso || hm;
  if (!match) return str;

  const horas = Number.parseInt(match[1], 10);
  const minutos = match[2];
  if (minutos === '00') return `${horas}h`;
  return `${horas}:${minutos}h`;
};

const tramosDelDia = (dia) => {
  const tramos = Array.isArray(dia?.horario) ? dia.horario : [];
  return tramos
    .map((tramo) => ({
      entrada: formatearHoraLegible(tramo?.horaEntrada ?? tramo?.hora_entrada),
      salida: formatearHoraLegible(tramo?.horaSalida ?? tramo?.hora_salida),
    }))
    .filter((tramo) => tramo.entrada && tramo.salida);
};

export const textoHorarioDia = (dia) => {
  const tramos = tramosDelDia(dia);
  if (tramos.length === 0) return null;

  if (tramos.length === 1) {
    return `entras a las ${tramos[0].entrada} y sales a las ${tramos[0].salida}`;
  }

  return tramos
    .map((tramo, index) => (
      index === 0
        ? `entras a las ${tramo.entrada} y sales a las ${tramo.salida}`
        : `vuelves a las ${tramo.entrada} y sales a las ${tramo.salida}`
    ))
    .join(', ');
};

export const textoRangoDia = (dia) => {
  const tramos = tramosDelDia(dia);
  if (tramos.length === 0) return null;
  return tramos.map((tramo) => `${tramo.entrada} – ${tramo.salida}`).join(', ');
};

export const obtenerProximoDiaLaborable = (diasLaborables, contextoCalendario = null) => {
  const agenda = obtenerAgendaProximosDias(diasLaborables, contextoCalendario, 60);
  const proximoLaborable = agenda.find((item) => item.tipo === 'laborable' && item.offset >= 1);
  if (!proximoLaborable) return null;

  return {
    nombreDia: proximoLaborable.nombreDia,
    dia: proximoLaborable.dia,
    fecha: proximoLaborable.fecha,
    esManana: proximoLaborable.offset === 1,
  };
};

export const construirContextoCalendario = ({ ausencias = [], festivos = [] } = {}) => {
  const ausenciasPorFecha = new Map();
  ausencias
    .filter((evento) => evento.es_propio !== false)
    .forEach((evento) => {
      if (!evento?.fecha) return;
      if (!ausenciasPorFecha.has(evento.fecha)) {
        ausenciasPorFecha.set(evento.fecha, []);
      }
      ausenciasPorFecha.get(evento.fecha).push(evento);
    });

  const festivosPorFecha = new Map();
  festivos.forEach((festivo) => {
    if (!festivo?.fecha) return;
    festivosPorFecha.set(
      festivo.fecha,
      festivo.descripcion || 'Festivo',
    );
  });

  return { ausenciasPorFecha, festivosPorFecha };
};

export const obtenerAgendaProximosDias = (
  diasLaborables,
  contextoCalendario = null,
  limite = 14,
) => {
  if (!Array.isArray(diasLaborables) || diasLaborables.length === 0) return [];

  const mapaJornada = new Map(diasLaborables.map((dia) => [dia.dia, dia]));
  const { ausenciasPorFecha, festivosPorFecha } = contextoCalendario
    ? contextoCalendario
    : construirContextoCalendario();

  const agenda = [];

  for (let offset = 0; offset < limite; offset += 1) {
    const fecha = dayjs().add(offset, 'day');
    const fechaIso = fecha.format('YYYY-MM-DD');
    const nombreDia = DIAS_SEMANA_ES[fecha.day()];
    const diaJornada = mapaJornada.get(nombreDia);
    const festivo = festivosPorFecha.get(fechaIso);
    const ausenciasDia = ausenciasPorFecha.get(fechaIso) || [];
    const ausencia = ausenciasDia[0];

    if (festivo) {
      agenda.push({
        offset,
        fecha,
        fechaIso,
        nombreDia,
        tipo: 'festivo',
        detalle: festivo,
      });
      continue;
    }

    if (ausencia) {
      agenda.push({
        offset,
        fecha,
        fechaIso,
        nombreDia,
        tipo: 'ausencia',
        detalle: etiquetaAusenciaCalendario(ausencia.tipo),
      });
      continue;
    }

    if (diaJornada && textoHorarioDia(diaJornada)) {
      agenda.push({
        offset,
        fecha,
        fechaIso,
        nombreDia,
        tipo: 'laborable',
        dia: diaJornada,
        detalle: textoRangoDia(diaJornada),
      });
    }
  }

  return agenda;
};

const prefijoDiaRelativo = (offset, nombreDia) => {
  if (offset === 0) return 'Hoy';
  if (offset === 1) return 'Mañana';
  return `El ${nombreDia} ${dayjs().add(offset, 'day').format('D [de] MMMM')}`;
};

export const mensajeDestacadoHorario = (
  diasLaborables,
  contextoCalendario = null,
) => {
  const agenda = obtenerAgendaProximosDias(diasLaborables, contextoCalendario, 60);
  const manana = agenda.find((item) => item.offset === 1);

  if (manana) {
    if (manana.tipo === 'festivo') {
      return `${prefijoDiaRelativo(1, manana.nombreDia)} es festivo (${manana.detalle}). No tienes jornada laboral.`;
    }
    if (manana.tipo === 'ausencia') {
      return `${prefijoDiaRelativo(1, manana.nombreDia)} tienes ${manana.detalle}.`;
    }
    if (manana.tipo === 'laborable') {
      return `${prefijoDiaRelativo(1, manana.nombreDia)} ${textoHorarioDia(manana.dia)}.`;
    }
  }

  const proximoLaborable = agenda.find((item) => item.tipo === 'laborable' && item.offset >= 1);
  if (proximoLaborable) {
    const cuando = proximoLaborable.offset === 1
      ? 'mañana'
      : `el ${proximoLaborable.nombreDia.toLowerCase()} ${proximoLaborable.fecha.format('D [de] MMMM')}`;
    return `Tu próximo día laborable es ${cuando}: ${textoHorarioDia(proximoLaborable.dia)}.`;
  }

  const proximaAusencia = agenda.find((item) => item.tipo === 'ausencia' && item.offset >= 1);
  if (proximaAusencia) {
    return `${prefijoDiaRelativo(
      proximaAusencia.offset,
      proximaAusencia.nombreDia,
    )} tienes ${proximaAusencia.detalle}.`;
  }

  return null;
};

export const textoAgendaDia = (item) => {
  if (item.tipo === 'festivo') return `Festivo — ${item.detalle}`;
  if (item.tipo === 'ausencia') {
    const tipo = item.detalle.charAt(0).toUpperCase() + item.detalle.slice(1);
    return tipo;
  }
  return item.detalle;
};

export const minutosDesdeMedianoche = (hora) => {
  if (hora == null || hora === '') return null;
  const str = String(hora).trim();
  const iso = str.match(/T(\d{1,2}):(\d{2})/);
  const hm = str.match(/^(\d{1,2}):(\d{2})/);
  const match = iso || hm;
  if (!match) return null;
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
};

export const bloquesHorarioDia = (dia) => {
  const tramos = Array.isArray(dia?.horario) ? dia.horario : [];
  return tramos
    .map((tramo) => {
      const entradaRaw = tramo?.horaEntrada ?? tramo?.hora_entrada;
      const salidaRaw = tramo?.horaSalida ?? tramo?.hora_salida;
      const ini = minutosDesdeMedianoche(entradaRaw);
      const fin = minutosDesdeMedianoche(salidaRaw);
      if (ini == null || fin == null || fin <= ini) return null;
      return {
        ini,
        fin,
        etiqueta: `${formatearHoraLegible(entradaRaw)} – ${formatearHoraLegible(salidaRaw)}`,
      };
    })
    .filter(Boolean);
};

const agendaItemParaFecha = (fecha, mapaJornada, contextoCalendario) => {
  const fechaIso = fecha.format('YYYY-MM-DD');
  const nombreDia = DIAS_SEMANA_ES[fecha.day()];
  const { ausenciasPorFecha, festivosPorFecha } = contextoCalendario
    ? contextoCalendario
    : construirContextoCalendario();
  const festivo = festivosPorFecha.get(fechaIso);
  const ausenciasDia = ausenciasPorFecha.get(fechaIso) || [];
  const ausencia = ausenciasDia[0];
  const offset = fecha.startOf('day').diff(dayjs().startOf('day'), 'day');

  if (festivo) {
    return {
      offset,
      fecha,
      fechaIso,
      nombreDia,
      tipo: 'festivo',
      detalle: festivo,
    };
  }

  if (ausencia) {
    return {
      offset,
      fecha,
      fechaIso,
      nombreDia,
      tipo: 'ausencia',
      detalle: etiquetaAusenciaCalendario(ausencia.tipo),
    };
  }

  const diaJornada = mapaJornada.get(nombreDia);
  if (diaJornada && textoHorarioDia(diaJornada)) {
    return {
      offset,
      fecha,
      fechaIso,
      nombreDia,
      tipo: 'laborable',
      dia: diaJornada,
      detalle: textoRangoDia(diaJornada),
      bloques: bloquesHorarioDia(diaJornada),
    };
  }

  return {
    offset,
    fecha,
    fechaIso,
    nombreDia,
    tipo: 'libre',
    detalle: null,
    bloques: [],
  };
};

/** Semana calendario (lunes–domingo) con offset de semanas respecto a la actual */
export const obtenerAgendaSemana = (
  diasLaborables,
  contextoCalendario = null,
  semanaOffset = 0,
) => {
  if (!Array.isArray(diasLaborables) || diasLaborables.length === 0) return [];

  const mapaJornada = new Map(diasLaborables.map((dia) => [dia.dia, dia]));
  const inicioSemana = dayjs().startOf('week').add(semanaOffset, 'week');
  const dias = [];

  for (let i = 0; i < 7; i += 1) {
    dias.push(agendaItemParaFecha(inicioSemana.add(i, 'day'), mapaJornada, contextoCalendario));
  }

  return dias;
};

export const resumenPatronSemanal = (diasLaborables) => {
  if (!diasLaborables?.length) return null;
  const porRango = new Map();
  diasLaborables.forEach((dia) => {
    const rango = textoRangoDia(dia);
    if (!rango) return;
    const lista = porRango.get(rango) || [];
    lista.push(dia.dia);
    porRango.set(rango, lista);
  });
  if (porRango.size !== 1) return null;
  const [[rango, nombres]] = [...porRango.entries()];
  const orden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const sorted = [...nombres].sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
  const idx = sorted.map((n) => orden.indexOf(n));
  const consecutivo = sorted.length > 1
    && idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  let etiquetaDias;
  if (sorted.length === 1) {
    etiquetaDias = sorted[0];
  } else if (consecutivo) {
    etiquetaDias = `${sorted[0]} – ${sorted[sorted.length - 1]}`;
  } else {
    etiquetaDias = sorted.join(', ');
  }
  return { etiquetaDias, rango };
};

/** Frase legible del patrón semanal, p. ej. «De lunes a viernes, de 9:30 a 13:30». */
export const fraseHorarioHabitual = (diasLaborables) => {
  const patron = resumenPatronSemanal(diasLaborables);
  if (!patron) return null;
  const horas = patron.rango
    .replace(/\s*–\s*/g, ' a ')
    .replace(/(\d)h(?=\s|,|$)/g, '$1')
    .replace(/(\d:\d{2})h/g, '$1');
  return `De ${patron.etiquetaDias.toLowerCase()}, de ${horas}`;
};

export const mensajeDiaHorario = (item, { relativo = 'hoy' } = {}) => {
  if (!item) return null;
  const prefijo = relativo === 'hoy' ? 'Hoy' : relativo === 'manana' ? 'Mañana' : item.nombreDia;
  if (item.tipo === 'festivo') {
    return `${prefijo} es festivo (${item.detalle}). No hay jornada.`;
  }
  if (item.tipo === 'ausencia') {
    return `${prefijo} tienes ${item.detalle}.`;
  }
  if (item.tipo === 'libre') {
    return `${prefijo} no tienes jornada asignada.`;
  }
  if (item.tipo === 'laborable') {
    const texto = textoHorarioDia(item.dia);
    if (relativo === 'hoy') return `Hoy ${texto}.`;
    if (relativo === 'manana') return `Mañana ${texto}.`;
    return `${prefijo}: ${texto}.`;
  }
  return null;
};

export const DIAS_TARJETA_HORARIO = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

/** Tarjetas fijas lun–dom según la jornada (sin fechas del calendario). */
export const tarjetasDiasHorario = (diasConfig) => {
  const mapa = new Map(
    (Array.isArray(diasConfig) ? diasConfig : []).map((dia) => [dia.dia, dia]),
  );
  return DIAS_TARJETA_HORARIO.map((nombre) => {
    const dia = mapa.get(nombre);
    const minutos = dia ? minutosTramosDia(dia) : 0;
    const rango = dia && minutos > 0 ? textoRangoDia(dia) : null;
    return {
      nombre,
      laborable: Boolean(rango),
      rango,
    };
  });
};

/** Aviso contextual solo para el día de mañana (festivo, ausencia o horario). */
export const avisoMananaHorario = (diasLaborables, contextoCalendario = null) => {
  const agenda = obtenerAgendaProximosDias(diasLaborables, contextoCalendario, 4);
  const manana = agenda.find((item) => item.offset === 1);
  if (!manana || manana.tipo === 'libre') return null;
  return mensajeDiaHorario(manana, { relativo: 'manana' });
};

export const etiquetaCeldaSemana = (item) => {
  if (!item) return { titulo: '—', subtitulo: null, variante: 'vacio' };
  if (item.tipo === 'festivo') {
    return { titulo: 'Festivo', subtitulo: item.detalle, variante: 'festivo' };
  }
  if (item.tipo === 'ausencia') {
    return {
      titulo: item.detalle.charAt(0).toUpperCase() + item.detalle.slice(1),
      subtitulo: 'Ausencia',
      variante: 'ausencia',
    };
  }
  if (item.tipo === 'libre') {
    return { titulo: 'Descanso', subtitulo: 'Sin jornada', variante: 'libre' };
  }
  if (item.tipo === 'laborable') {
    const horas = item.detalle
      ? item.detalle.replace(/\s*–\s*/g, ' – ')
      : '—';
    return { titulo: horas, subtitulo: 'Horario', variante: 'laborable' };
  }
  return { titulo: '—', subtitulo: null, variante: 'vacio' };
};
