const { Op } = require('sequelize');
const dayjs = require('dayjs');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const UsuarioJornada = require('../models/UsuarioJornada');
const Jornada = require('../models/Jornada');
const FestivoEmpresa = require('../models/FestivoEmpresa');
const Fichajes = require('../models/Fichajes');
const {
  etiquetaTipoHora,
  formatearMinutos,
  formatearMinutosConSigno,
  TIPOS_HORA,
} = require('../utils/tipoHora');
const { enriquecerResumenBolsa, obtenerSaldoBolsa } = require('./bolsaHorasService');
const {
  esJornadaFija,
  minutosOrdinariosMesJornadaFija,
} = require('../utils/jornadaHoras');

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

  let totalMinutos = 0;

  if (esJornadaFija(jornada)) {
    const diasJornada = jornada.column1?.dias || [];
    totalMinutos = minutosOrdinariosMesJornadaFija(
      diasJornada,
      mesNormalizado,
      festivosSet,
    );
  } else {
    const horasMensuales = Number(jornada.column1?.horasMensuales) || 0;
    totalMinutos = horasMensuales * 60;
  }

  return {
    minutos: totalMinutos,
    configurada: true,
    mes: mesNormalizado,
    id_jornada: jornada.id_jornada,
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
      desglose: deltaMin > 0
        ? `${formatearMinutosConSigno(deltaMin)} en horas extra`
        : 'Sin horas extra',
    };
  }

  if (tipo === 2) {
    return {
      horas_extra_min: 0,
      horas_complementaria_min: Math.max(0, deltaMin),
      horas_bolsa_delta_min: 0,
      desglose: deltaMin > 0
        ? `${formatearMinutosConSigno(deltaMin)} en horas complementarias`
        : 'Sin horas complementarias',
    };
  }

  if (tipo === 3) {
    return {
      horas_extra_min: 0,
      horas_complementaria_min: 0,
      horas_bolsa_delta_min: deltaMin,
      desglose: deltaMin === 0
        ? 'Bolsa equilibrada este mes'
        : `${formatearMinutosConSigno(deltaMin)} en bolsa de horas`,
    };
  }

  return {
    horas_extra_min: 0,
    horas_complementaria_min: 0,
    horas_bolsa_delta_min: 0,
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

  return {
    mes: mesNormalizado,
    configurada: true,
    horasMensuales: ordinariasFmt.texto,
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
  resolverTipoHora,
  calcularHorasOrdinariasMes,
  calcularHorasTrabajadasMes,
  clasificarDelta,
  calcularResumenHorasMes,
};
