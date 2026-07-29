const { Op } = require('sequelize');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const FestivoEmpresa = require('../models/FestivoEmpresa');
const UsuarioJornada = require('../models/UsuarioJornada');
const Jornada = require('../models/Jornada');
const { diaSemanaDesdeNombre, esJornadaFija } = require('../utils/jornadaHoras');

dayjs.extend(customParseFormat);

const parseFechaAusencia = (valor) =>
  dayjs(valor, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);

const expandirRangoDias = (fechaDesde, fechaHasta) => {
  const dias = [];
  let actual = parseFechaAusencia(fechaDesde).startOf('day');
  const fin = parseFechaAusencia(fechaHasta).startOf('day');
  if (!actual.isValid() || !fin.isValid()) return [];
  while (actual.isSame(fin, 'day') || actual.isBefore(fin, 'day')) {
    dias.push(actual);
    actual = actual.add(1, 'day');
  }
  return dias;
};

const normalizarFraccion = (ausencia) => {
  const fraccion = String(ausencia?.fraccion_dia || '').trim().toLowerCase();
  if (['manana', 'tarde'].includes(fraccion)) return fraccion;
  if (fraccion === 'completo') return 'completo';
  if (ausencia?.hora_ausencia_desde || ausencia?.hora_ausencia_hasta) return 'parcial';
  return 'completo';
};

const diasPorFraccion = (fraccion) => {
  if (fraccion === 'manana' || fraccion === 'tarde' || fraccion === 'parcial') return 0.5;
  return 1;
};

const DIAS_LABORABLES_DEFECTO = [1, 2, 3, 4, 5];

const obtenerDiasSemanaLaborablesJornada = (jornada) => {
  if (!jornada || !esJornadaFija(jornada)) {
    return null;
  }
  const diasConfig = jornada.column1?.dias || [];
  const diasSemana = new Set();
  diasConfig.forEach((dia) => {
    const numero = diaSemanaDesdeNombre(dia?.dia);
    if (numero != null) diasSemana.add(numero);
  });
  return diasSemana.size ? diasSemana : new Set(DIAS_LABORABLES_DEFECTO);
};

const cargarFestivosRango = async (idEmpresa, desde, hasta) => {
  const inicio = parseFechaAusencia(desde).startOf('day');
  const fin = parseFechaAusencia(hasta).startOf('day');
  if (!inicio.isValid() || !fin.isValid()) return new Set();

  const festivos = await FestivoEmpresa.findAll({
    where: {
      empresa_id: idEmpresa,
      fecha_baja: null,
      fecha: {
        [Op.gte]: inicio.toDate(),
        [Op.lte]: fin.toDate(),
      },
    },
    attributes: ['fecha'],
    raw: true,
  });

  return new Set(festivos.map((f) => dayjs(f.fecha).format('YYYY-MM-DD')));
};

const cargarJornadaUsuario = async (idEmpresa, idUsuario) => {
  const usuarioJornada = await UsuarioJornada.findOne({
    where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
    order: [['fecha_alta', 'DESC']],
    raw: true,
  });
  if (!usuarioJornada) return null;

  const jornada = await Jornada.findOne({
    where: {
      empresa_id: idEmpresa,
      id_jornada: usuarioJornada.id_jornada,
      fecha_baja: null,
    },
  });
  return jornada || null;
};

const esDiaLaborable = (fecha, diasSemanaLaborables, festivosSet, excluirFestivos) => {
  const diaSemana = fecha.day();
  if (!diasSemanaLaborables.has(diaSemana)) return false;
  if (excluirFestivos && festivosSet.has(fecha.format('YYYY-MM-DD'))) return false;
  return true;
};

const resolverDiasSemanaLaborables = (jornada, convenio) => {
  const desdeJornada = obtenerDiasSemanaLaborablesJornada(jornada);
  if (desdeJornada) return desdeJornada;

  const n = Number(convenio?.dias_semana_laborables);
  if (Number.isInteger(n) && n >= 1 && n <= 7) {
    return new Set(DIAS_LABORABLES_DEFECTO.slice(0, n));
  }
  return new Set(DIAS_LABORABLES_DEFECTO);
};

const calcularDiasNaturales = (ausencia) => {
  const diasRango = expandirRangoDias(ausencia.fecha_desde, ausencia.fecha_hasta);
  if (!diasRango.length) return 0;
  if (diasRango.length === 1) {
    return diasPorFraccion(normalizarFraccion(ausencia));
  }
  return diasRango.length;
};

const calcularDiasLaborables = async (ausencia, idEmpresa, convenio) => {
  const diasRango = expandirRangoDias(ausencia.fecha_desde, ausencia.fecha_hasta);
  if (!diasRango.length) return 0;

  const excluirFestivos = Boolean(convenio?.excluir_festivos);
  const [jornada, festivosSet] = await Promise.all([
    cargarJornadaUsuario(idEmpresa, ausencia.id_usuario),
    excluirFestivos
      ? cargarFestivosRango(idEmpresa, ausencia.fecha_desde, ausencia.fecha_hasta)
      : Promise.resolve(new Set()),
  ]);

  const diasSemanaLaborables = resolverDiasSemanaLaborables(jornada, convenio);

  if (diasRango.length === 1) {
    const fraccion = normalizarFraccion(ausencia);
    if (!esDiaLaborable(diasRango[0], diasSemanaLaborables, festivosSet, excluirFestivos)) {
      return 0;
    }
    return diasPorFraccion(fraccion);
  }

  let total = 0;
  diasRango.forEach((fecha) => {
    if (esDiaLaborable(fecha, diasSemanaLaborables, festivosSet, excluirFestivos)) {
      total += 1;
    }
  });
  return total;
};

/**
 * @param {object} ausencia
 * @param {number} idEmpresa
 * @param {{ modo_conteo_vacaciones?: string }} [convenio]
 */
const calcularDiasConsumoAusencia = async (ausencia, idEmpresa, convenio = null) => {
  const modo = String(convenio?.modo_conteo_vacaciones || 'natural').toLowerCase();
  if (modo === 'laboral' && idEmpresa && ausencia?.id_usuario) {
    return calcularDiasLaborables(ausencia, idEmpresa, convenio);
  }
  return calcularDiasNaturales(ausencia);
};

const redondearDias = (valor) => Math.round(Number(valor) * 10) / 10;

module.exports = {
  parseFechaAusencia,
  expandirRangoDias,
  normalizarFraccion,
  calcularDiasConsumoAusencia,
  calcularDiasNaturales,
  calcularDiasLaborables,
  redondearDias,
};
