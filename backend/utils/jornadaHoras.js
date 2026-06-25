const dayjs = require('dayjs');

const DIAS_SEMANA_MAP = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 0,
};

const normalizarNombreDia = (nombre) => String(nombre || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const diaSemanaDesdeNombre = (nombre) => DIAS_SEMANA_MAP[normalizarNombreDia(nombre)];

const normalizarHora = (valor) => {
  if (valor == null || valor === '') return null;
  const str = String(valor).trim();

  const iso = str.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (iso) {
    return `${iso[1].padStart(2, '0')}:${iso[2]}:${(iso[3] || '00').padStart(2, '0')}`;
  }

  const hm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hm) {
    return `${hm[1].padStart(2, '0')}:${hm[2]}:${(hm[3] || '00').padStart(2, '0')}`;
  }

  return null;
};

const minutosEntreHoras = (horaEntrada, horaSalida) => {
  const entrada = normalizarHora(horaEntrada);
  const salida = normalizarHora(horaSalida);
  if (!entrada || !salida) return 0;

  const inicio = dayjs(`2020-01-01T${entrada}`);
  const fin = dayjs(`2020-01-01T${salida}`);
  if (!inicio.isValid() || !fin.isValid() || !fin.isAfter(inicio)) return 0;

  return fin.diff(inicio, 'minute');
};

const minutosTramosDia = (dia) => {
  const tramos = Array.isArray(dia?.horario) ? dia.horario : [];
  return tramos.reduce((total, tramo) => {
    const entrada = tramo?.horaEntrada ?? tramo?.hora_entrada;
    const salida = tramo?.horaSalida ?? tramo?.hora_salida;
    return total + minutosEntreHoras(entrada, salida);
  }, 0);
};

const minutosSemanalesJornadaFija = (dias) => {
  if (!Array.isArray(dias)) return 0;
  return dias.reduce((total, dia) => total + minutosTramosDia(dia), 0);
};

const esJornadaFija = (jornada) => {
  const tipo = Number(jornada?.tipo);
  if (tipo === 1) return true;
  if (tipo === 2) return false;
  const config = jornada?.column1 || {};
  return String(config.tipoJornada || '').toLowerCase() === 'fija';
};

const minutosOrdinariosMesJornadaFija = (dias, mes, festivosSet = new Set()) => {
  const fechaMes = dayjs(`${mes}-01`);
  if (!fechaMes.isValid()) return 0;

  let totalMinutos = 0;
  const daysInMonth = fechaMes.daysInMonth();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const fecha = fechaMes.date(day);
    if (festivosSet.has(fecha.format('YYYY-MM-DD'))) continue;

    const diaSemana = fecha.day();
    dias.forEach((dia) => {
      if (diaSemanaDesdeNombre(dia.dia) === diaSemana) {
        totalMinutos += minutosTramosDia(dia);
      }
    });
  }

  return totalMinutos;
};

module.exports = {
  diaSemanaDesdeNombre,
  minutosEntreHoras,
  minutosTramosDia,
  minutosSemanalesJornadaFija,
  minutosOrdinariosMesJornadaFija,
  esJornadaFija,
};
