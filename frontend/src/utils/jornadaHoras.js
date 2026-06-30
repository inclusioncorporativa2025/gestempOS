import dayjs from 'dayjs';
import 'dayjs/locale/es';

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

const etiquetaAusencia = (tipo) => {
  const normalizado = String(tipo || '').trim().toLowerCase();
  if (normalizado === 'vacaciones') return 'vacaciones';
  if (normalizado === 'baja') return 'baja';
  if (normalizado === 'asuntos propios') return 'asuntos propios';
  if (normalizado === 'días retribuidos' || normalizado === 'dias retribuidos') {
    return 'días retribuidos';
  }
  if (normalizado === 'otros') return 'ausencia';
  return tipo || 'ausencia';
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
        detalle: etiquetaAusencia(ausencia.tipo),
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
