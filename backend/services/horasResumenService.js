const { Op } = require('sequelize');
const dayjs = require('dayjs');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const UsuarioJornada = require('../models/UsuarioJornada');
const Jornada = require('../models/Jornada');
const FestivoEmpresa = require('../models/FestivoEmpresa');
const Fichajes = require('../models/Fichajes');
const Ausencias = require('../models/Ausencias');
const {
  etiquetaTipoHora,
  formatearMinutos,
  formatearMinutosConSigno,
  TIPOS_HORA,
} = require('../utils/tipoHora');
const { enriquecerResumenBolsa, obtenerSaldoBolsa } = require('./bolsaHorasService');
const { empresaTieneFeature } = require('./planService');
const { ausenciasSoportaAprobacion, whereSoloAprobadas } = require('../utils/ausenciasCompat');
const {
  expandirRangoDias,
  normalizarFraccion,
} = require('./vacacionesConteoService');
const {
  esJornadaFija,
  minutosOrdinariosMesJornadaFija,
  contarDiasLaborablesMes,
  obtenerDiasSemanaLaborablesJornada,
  minutosJornadaFijaEnFecha,
  DIAS_LABORABLES_DEFECTO,
} = require('../utils/jornadaHoras');

const NOTA_COMPARATIVA_HORAS =
  'Comparativa orientativa según jornada pactada. El registro válido para inspección son los fichajes diarios.';

const factorFraccionAusencia = (ausencia, diasRango) => {
  if (diasRango.length === 1) {
    const fraccion = normalizarFraccion(ausencia);
    if (fraccion === 'manana' || fraccion === 'tarde' || fraccion === 'parcial') return 0.5;
  }
  return 1;
};

const clipDiasAusenciaAlMes = (ausencia, mesNormalizado) => {
  const inicioMes = dayjs(`${mesNormalizado}-01`).startOf('month');
  const finMes = inicioMes.endOf('month');
  const dias = expandirRangoDias(ausencia.fecha_desde, ausencia.fecha_hasta);
  return dias.filter(
    (fecha) => !fecha.isBefore(inicioMes, 'day') && !fecha.isAfter(finMes, 'day'),
  );
};

const calcularMinutosAusenciasMes = async (
  idEmpresa,
  idUsuario,
  mesNormalizado,
  jornada,
  minutosPactadosBase,
  festivosSet,
) => {
  const incluirAusencias = await empresaTieneFeature(idEmpresa, 'ausencias_basicas');
  if (!incluirAusencias || minutosPactadosBase <= 0) {
    return { minutos: 0, cantidad: 0 };
  }

  const soportaAprobacion = await ausenciasSoportaAprobacion();
  const inicioMes = dayjs(`${mesNormalizado}-01`).startOf('month').toDate();
  const finMes = dayjs(`${mesNormalizado}-01`).endOf('month').toDate();

  const ausencias = await Ausencias.findAll({
    where: {
      empresa_id: idEmpresa,
      id_usuario: idUsuario,
      fecha_baja: null,
      ...whereSoloAprobadas(soportaAprobacion),
      fecha_desde: { [Op.lte]: finMes },
      fecha_hasta: { [Op.gte]: inicioMes },
    },
  });

  if (!ausencias.length) {
    return { minutos: 0, cantidad: 0 };
  }

  const esFija = esJornadaFija(jornada);
  const diasJornada = jornada.column1?.dias || [];
  const diasSemanaLaborables = esFija
    ? obtenerDiasSemanaLaborablesJornada(jornada)
    : DIAS_LABORABLES_DEFECTO;

  let minutosDescontados = 0;

  if (esFija) {
    ausencias.forEach((ausencia) => {
      const diasMes = clipDiasAusenciaAlMes(ausencia, mesNormalizado);
      const factor = factorFraccionAusencia(ausencia, diasMes);
      diasMes.forEach((fecha) => {
        const minutosDia = minutosJornadaFijaEnFecha(fecha, diasJornada, festivosSet);
        if (minutosDia > 0) {
          minutosDescontados += Math.round(minutosDia * factor);
        }
      });
    });
  } else {
    const diasLaborablesMes = contarDiasLaborablesMes(
      mesNormalizado,
      diasSemanaLaborables,
      festivosSet,
    );
    if (diasLaborablesMes <= 0) {
      return { minutos: 0, cantidad: ausencias.length };
    }

    const minutosPorDiaLaborable = minutosPactadosBase / diasLaborablesMes;

    ausencias.forEach((ausencia) => {
      const diasMes = clipDiasAusenciaAlMes(ausencia, mesNormalizado);
      const factorUnitario = factorFraccionAusencia(ausencia, diasMes);

      if (diasMes.length === 1) {
        const fecha = diasMes[0];
        if (
          diasSemanaLaborables.has(fecha.day())
          && !festivosSet.has(fecha.format('YYYY-MM-DD'))
        ) {
          minutosDescontados += Math.round(minutosPorDiaLaborable * factorUnitario);
        }
        return;
      }

      diasMes.forEach((fecha) => {
        if (
          diasSemanaLaborables.has(fecha.day())
          && !festivosSet.has(fecha.format('YYYY-MM-DD'))
        ) {
          minutosDescontados += Math.round(minutosPorDiaLaborable);
        }
      });
    });
  }

  return {
    minutos: Math.min(minutosDescontados, minutosPactadosBase),
    cantidad: ausencias.length,
  };
};

const resolverTipoHora = async (idEmpresa, idUsuario) => {
  const membresia = await UsuarioEmpresa.findOne({
    where: { id_usuario: idUsuario, id_empresa: idEmpresa, fecha_baja: null },
  });

  if (membresia?.tipo_hora != null) {
    return {
      tipo_hora: Number(membresia.tipo_hora),
      origen: 'membresia',
      tipo_hora_membresia: Number(membresia.tipo_hora),
    };
  }

  const usuarioJornada = await UsuarioJornada.findOne({
    where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
    order: [['fecha_alta', 'DESC']],
  });

  if (!usuarioJornada) {
    return { tipo_hora: null, origen: 'ninguno', tipo_hora_membresia: null };
  }

  const jornada = await Jornada.findOne({
    where: {
      empresa_id: idEmpresa,
      id_jornada: usuarioJornada.id_jornada,
      fecha_baja: null,
    },
  });

  if (jornada?.tipo_hora != null) {
    return {
      tipo_hora: Number(jornada.tipo_hora),
      origen: 'jornada',
      tipo_hora_membresia: null,
      id_jornada: jornada.id_jornada,
      jornada_tipo_hora: Number(jornada.tipo_hora),
    };
  }

  return { tipo_hora: null, origen: 'ninguno', tipo_hora_membresia: null };
};

const calcularHorasOrdinariasMes = async (idEmpresa, idUsuario, mes) => {
  const mesNormalizado = String(mes).length === 7 ? mes : dayjs(mes).format('YYYY-MM');

  const usuarioJornada = await UsuarioJornada.findOne({
    where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
    order: [['fecha_alta', 'DESC']],
  });

  if (!usuarioJornada) {
    return { minutos: null, configurada: false, mes: mesNormalizado };
  }

  const jornada = await Jornada.findOne({
    where: {
      empresa_id: idEmpresa,
      fecha_baja: null,
      id_jornada: usuarioJornada.id_jornada,
    },
  });

  if (!jornada) {
    return { minutos: null, configurada: false, mes: mesNormalizado };
  }

  const festivos = await FestivoEmpresa.findAll({
    where: {
      empresa_id: idEmpresa,
      fecha_baja: null,
      fecha: {
        [Op.gte]: dayjs(`${mesNormalizado}-01`).startOf('month').toDate(),
        [Op.lte]: dayjs(`${mesNormalizado}-01`).endOf('month').toDate(),
      },
    },
  });

  const festivosSet = new Set(
    festivos.map((f) => dayjs(f.fecha).format('YYYY-MM-DD')),
  );

  const esFija = esJornadaFija(jornada);
  let minutosBase = 0;

  if (esFija) {
    const diasJornada = jornada.column1?.dias || [];
    minutosBase = minutosOrdinariosMesJornadaFija(
      diasJornada,
      mesNormalizado,
      festivosSet,
    );
  } else {
    const horasMensuales = Number(jornada.column1?.horasMensuales) || 0;
    minutosBase = horasMensuales * 60;
  }

  const { minutos: minutosAusencias } = await calcularMinutosAusenciasMes(
    idEmpresa,
    idUsuario,
    mesNormalizado,
    jornada,
    minutosBase,
    festivosSet,
  );

  const minutosAjustados = Math.max(0, minutosBase - minutosAusencias);

  return {
    minutos: minutosAjustados,
    minutos_base: minutosBase,
    minutos_ausencias_descontados: minutosAusencias,
    configurada: true,
    mes: mesNormalizado,
    id_jornada: jornada.id_jornada,
    jornada_tipo: esFija ? 'fija' : 'flexible',
  };
};

const calcularHorasTrabajadasMes = async (idEmpresa, idUsuario, mes) => {
  const mesNormalizado = String(mes).length === 7 ? mes : dayjs(mes).format('YYYY-MM');
  const inicioMes = dayjs(`${mesNormalizado}-01`).startOf('month').toDate();
  const finMes = dayjs(`${mesNormalizado}-01`).endOf('month').toDate();

  const fichajes = await Fichajes.findAll({
    where: {
      empresa_id: idEmpresa,
      id_usuario: idUsuario,
      fecha_baja: null,
      fecha_entrada: { [Op.between]: [inicioMes, finMes] },
    },
  });

  let totalMinutos = 0;

  fichajes.forEach((fichaje) => {
    const entrada = dayjs(fichaje.fecha_entrada);
    const salida = dayjs(fichaje.fecha_salida);
    if (entrada.isValid() && salida.isValid()) {
      totalMinutos += salida.diff(entrada, 'minute');
    }
  });

  return { minutos: totalMinutos, mes: mesNormalizado };
};

const clasificarDelta = (deltaMin, tipoHora) => {
  const tipo = Number(tipoHora);

  if (tipo === 1) {
    return {
      horas_extra_min: Math.max(0, deltaMin),
      horas_complementaria_min: 0,
      horas_bolsa_delta_min: 0,
      deficit_min: 0,
      desglose: deltaMin > 0
        ? `${formatearMinutosConSigno(deltaMin)} en horas extra`
        : 'Sin horas extra',
    };
  }

  if (tipo === 2) {
    const complementarias = Math.max(0, deltaMin);
    const deficit = deltaMin < 0 ? Math.abs(deltaMin) : 0;
    let desglose = 'Jornada pactada cumplida';
    if (deltaMin > 0) {
      desglose = `${formatearMinutosConSigno(deltaMin)} en horas complementarias`;
    } else if (deltaMin < 0) {
      desglose = `${formatearMinutos(deficit).texto} por debajo de la jornada pactada (informativo)`;
    }

    return {
      horas_extra_min: 0,
      horas_complementaria_min: complementarias,
      horas_bolsa_delta_min: 0,
      deficit_min: deficit,
      deficit: deficit > 0 ? formatearMinutos(deficit).texto : null,
      desglose,
    };
  }

  if (tipo === 3) {
    return {
      horas_extra_min: 0,
      horas_complementaria_min: 0,
      horas_bolsa_delta_min: deltaMin,
      deficit_min: 0,
      desglose: deltaMin === 0
        ? 'Bolsa equilibrada este mes'
        : `${formatearMinutosConSigno(deltaMin)} en bolsa de horas`,
    };
  }

  return {
    horas_extra_min: 0,
    horas_complementaria_min: 0,
    horas_bolsa_delta_min: 0,
    deficit_min: 0,
    desglose: null,
  };
};

const calcularResumenHorasMes = async (idEmpresa, idUsuario, mes, idUsuarioAccion = null) => {
  const mesNormalizado = String(mes).length === 7 ? mes : dayjs(mes).format('YYYY-MM');
  const tipoHoraInfo = await resolverTipoHora(idEmpresa, idUsuario);
  const ordinarias = await calcularHorasOrdinariasMes(idEmpresa, idUsuario, mesNormalizado);
  const trabajadas = await calcularHorasTrabajadasMes(idEmpresa, idUsuario, mesNormalizado);

  if (!ordinarias.configurada) {
    const saldoBolsa = tipoHoraInfo.tipo_hora === TIPOS_HORA.BOLSA
      ? await obtenerSaldoBolsa(idEmpresa, idUsuario)
      : null;

    return {
      mes: mesNormalizado,
      configurada: false,
      horasMensuales: 'No configurada',
      tipo_hora: tipoHoraInfo.tipo_hora,
      tipo_hora_label: etiquetaTipoHora(tipoHoraInfo.tipo_hora),
      tipo_hora_origen: tipoHoraInfo.origen,
      tipo_hora_membresia: tipoHoraInfo.tipo_hora_membresia,
      ...(saldoBolsa || {}),
    };
  }

  const ordinariasFmt = formatearMinutos(ordinarias.minutos);
  const ordinariasBaseFmt = formatearMinutos(ordinarias.minutos_base);
  const ausenciasFmt = formatearMinutos(ordinarias.minutos_ausencias_descontados);
  const trabajadasFmt = formatearMinutos(trabajadas.minutos);
  const deltaMin = trabajadas.minutos - ordinarias.minutos;

  let clasificacion;
  if (Number(tipoHoraInfo.tipo_hora) === TIPOS_HORA.BOLSA) {
    clasificacion = await enriquecerResumenBolsa(
      idEmpresa,
      idUsuario,
      mesNormalizado,
      deltaMin,
      idUsuarioAccion,
    );
  } else {
    clasificacion = clasificarDelta(deltaMin, tipoHoraInfo.tipo_hora);
  }

  const jornadaFlexible = ordinarias.jornada_tipo === 'flexible';
  const hayDescuentoAusencias = ordinarias.minutos_ausencias_descontados > 0;

  return {
    mes: mesNormalizado,
    configurada: true,
    jornada_tipo: ordinarias.jornada_tipo,
    horasMensuales: ordinariasFmt.texto,
    horas_pactadas_ajustadas: ordinariasFmt.texto,
    horas_pactadas_base: ordinariasBaseFmt.texto,
    horas_ausencias_descontadas: hayDescuentoAusencias ? ausenciasFmt.texto : null,
    minutos_ausencias_descontados: ordinarias.minutos_ausencias_descontados,
    etiqueta_jornada_pactada: jornadaFlexible
      ? 'Jornada pactada del mes'
      : 'Horas ordinarias del mes',
    nota_comparativa: NOTA_COMPARATIVA_HORAS,
    tipo_hora: tipoHoraInfo.tipo_hora,
    tipo_hora_label: etiquetaTipoHora(tipoHoraInfo.tipo_hora),
    tipo_hora_origen: tipoHoraInfo.origen,
    tipo_hora_membresia: tipoHoraInfo.tipo_hora_membresia,
    horas_ordinarias_min: ordinariasFmt.minutos,
    horas_ordinarias: ordinariasFmt.texto,
    horas_trabajadas_min: trabajadasFmt.minutos,
    horas_trabajadas: trabajadasFmt.texto,
    delta_min: deltaMin,
    delta: formatearMinutosConSigno(deltaMin),
    horas_extra_min: clasificacion.horas_extra_min ?? 0,
    horas_complementaria_min: clasificacion.horas_complementaria_min ?? 0,
    ...clasificacion,
  };
};

module.exports = {
  NOTA_COMPARATIVA_HORAS,
  resolverTipoHora,
  calcularHorasOrdinariasMes,
  calcularHorasTrabajadasMes,
  clasificarDelta,
  calcularResumenHorasMes,
};
