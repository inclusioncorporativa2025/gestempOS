const { Op } = require('sequelize');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const UsuarioVacacionesCupo = require('../models/UsuarioVacacionesCupo');
const UsuarioVacacionesMovimiento = require('../models/UsuarioVacacionesMovimiento');
const { createConId } = require('../utils/empresaScope');
const { vacacionesSoportaSaldo } = require('../utils/vacacionesCompat');
const {
  calcularDiasConsumoAusencia: calcularDiasConteo,
  normalizarFraccion,
  parseFechaAusencia,
  redondearDias,
} = require('./vacacionesConteoService');
const { resolverConvenioUsuario } = require('./convenioService');

dayjs.extend(customParseFormat);

const TIPO_CONSUMO = 'consumo';
const TIPO_ANULACION = 'anulacion_consumo';
const TIPO_AJUSTE = 'ajuste_manual';

/** Días que consume una ausencia de vacaciones según convenio del usuario. */
const calcularDiasConsumoAusencia = async (ausencia, idEmpresa) => {
  const empresaId = idEmpresa ?? ausencia?.empresa_id;
  if (!empresaId || !ausencia?.id_usuario) {
    return calcularDiasConteo(ausencia, empresaId, null);
  }
  const convenio = await resolverConvenioUsuario(empresaId, ausencia.id_usuario);
  return calcularDiasConteo(ausencia, empresaId, convenio?.reglas || null);
};

const cupoActivoWhere = (idEmpresa, idUsuario, extras = {}) => ({
  empresa_id: idEmpresa,
  id_usuario: idUsuario,
  fecha_baja: null,
  ...extras,
});

const movimientoActivoWhere = (idEmpresa, idUsuario, extras = {}) => ({
  empresa_id: idEmpresa,
  id_usuario: idUsuario,
  fecha_baja: null,
  ...extras,
});

const obtenerCupoAnio = async (idEmpresa, idUsuario, anio) => {
  return UsuarioVacacionesCupo.findOne({
    where: cupoActivoWhere(idEmpresa, idUsuario, { anio: Number(anio) }),
    raw: true,
  });
};

const listarCuposUsuario = async (idEmpresa, idUsuario) => {
  const cupos = await UsuarioVacacionesCupo.findAll({
    where: cupoActivoWhere(idEmpresa, idUsuario),
    order: [['anio', 'DESC']],
    raw: true,
  });
  return cupos;
};

const sumarMovimientosAnio = async (idEmpresa, idUsuario, anio) => {
  const total = await UsuarioVacacionesMovimiento.sum('dias', {
    where: movimientoActivoWhere(idEmpresa, idUsuario, { anio: Number(anio) }),
  });
  return Number(total) || 0;
};

const obtenerSaldoAnio = async (idEmpresa, idUsuario, anio) => {
  const anioNum = Number(anio) || dayjs().year();
  const cupo = await obtenerCupoAnio(idEmpresa, idUsuario, anioNum);
  const asignados = Number(cupo?.dias_asignados || 0);
  const arrastre = Number(cupo?.dias_arrastre_entrada || 0);
  const movimientos = await sumarMovimientosAnio(idEmpresa, idUsuario, anioNum);
  const total = redondearDias(asignados + arrastre + movimientos);
  const consumidos = redondearDias(Math.abs(Math.min(0, movimientos)));
  const disponible = total;

  return {
    anio: anioNum,
    dias_asignados: asignados,
    dias_arrastre_entrada: arrastre,
    dias_arrastre_salida: Number(cupo?.dias_arrastre_salida || 0),
    dias_consumidos: consumidos,
    dias_disponibles: disponible,
    fecha_limite_disfrute: cupo?.fecha_limite_disfrute || null,
    observaciones: cupo?.observaciones || null,
    id_cupo: cupo?.id_cupo || null,
  };
};

const obtenerResumenVacaciones = async (idEmpresa, idUsuario, anio) => {
  const soporta = await vacacionesSoportaSaldo();
  if (!soporta) {
    return {
      soportado: false,
      anio_actual: null,
      cupos: [],
      movimientos: [],
      convenio: null,
    };
  }

  const anioConsulta = Number(anio) || dayjs().year();
  const [saldo, cupos, movimientos, convenio] = await Promise.all([
    obtenerSaldoAnio(idEmpresa, idUsuario, anioConsulta),
    listarCuposUsuario(idEmpresa, idUsuario),
    listarMovimientosVacaciones(idEmpresa, idUsuario, anioConsulta),
    resolverConvenioUsuario(idEmpresa, idUsuario),
  ]);

  return {
    soportado: true,
    anio_actual: saldo,
    cupos,
    movimientos,
    convenio,
  };
};

const guardarCupoAnio = async (
  idEmpresa,
  idUsuario,
  datos,
  idUsuarioAccion,
) => {
  const anio = Number(datos.anio);
  if (!anio) {
    const error = new Error('El año es obligatorio');
    error.code = 'ANIO_REQUERIDO';
    throw error;
  }

  const existente = await UsuarioVacacionesCupo.findOne({
    where: cupoActivoWhere(idEmpresa, idUsuario, { anio }),
  });

  const payload = {
    dias_asignados: redondearDias(datos.dias_asignados ?? 0),
    dias_arrastre_entrada: redondearDias(datos.dias_arrastre_entrada ?? 0),
    dias_arrastre_salida: redondearDias(datos.dias_arrastre_salida ?? 0),
    fecha_limite_disfrute: datos.fecha_limite_disfrute || null,
    observaciones: datos.observaciones ? String(datos.observaciones).trim() : null,
  };

  if (existente) {
    await existente.update({
      ...payload,
      usuario_modificacion: idUsuarioAccion,
      fecha_modificacion: new Date(),
    });
    return existente;
  }

  return createConId(UsuarioVacacionesCupo, idEmpresa, 'id_cupo', {
    id_usuario: idUsuario,
    anio,
    ...payload,
    usuario_alta: idUsuarioAccion,
    fecha_alta: new Date(),
  });
};

const existeConsumoAusencia = async (idEmpresa, idAusencia) => {
  const count = await UsuarioVacacionesMovimiento.count({
    where: {
      empresa_id: idEmpresa,
      id_ausencia: idAusencia,
      tipo_movimiento: TIPO_CONSUMO,
      fecha_baja: null,
    },
  });
  return count > 0;
};

const registrarConsumoPorAusencia = async (
  idEmpresa,
  ausencia,
  idUsuarioGestor,
) => {
  const yaExiste = await existeConsumoAusencia(idEmpresa, ausencia.id_ausencia);
  if (yaExiste) return null;

  const diasConsumo = await calcularDiasConsumoAusencia(ausencia, idEmpresa);
  if (!diasConsumo) return null;

  const anio = parseFechaAusencia(ausencia.fecha_desde).year();
  const saldo = await obtenerSaldoAnio(idEmpresa, ausencia.id_usuario, anio);

  if (saldo.dias_disponibles < diasConsumo) {
    const error = new Error(
      `Saldo insuficiente: disponibles ${saldo.dias_disponibles}, solicitados ${diasConsumo}`,
    );
    error.code = 'SALDO_VACACIONES_INSUFICIENTE';
    error.disponibles = saldo.dias_disponibles;
    error.solicitados = diasConsumo;
    throw error;
  }

  const desde = parseFechaAusencia(ausencia.fecha_desde);
  const hasta = parseFechaAusencia(ausencia.fecha_hasta);

  return createConId(UsuarioVacacionesMovimiento, idEmpresa, 'id_movimiento', {
    id_usuario: ausencia.id_usuario,
    anio,
    dias: redondearDias(-diasConsumo),
    tipo_movimiento: TIPO_CONSUMO,
    fraccion_dia: normalizarFraccion(ausencia) === 'parcial'
      ? 'manana'
      : normalizarFraccion(ausencia),
    fecha_disfrute: desde.isValid() ? desde.format('YYYY-MM-DD') : null,
    fecha_disfrute_hasta: hasta.isValid() ? hasta.format('YYYY-MM-DD') : null,
    id_ausencia: ausencia.id_ausencia,
    id_usuario_gestor: idUsuarioGestor,
    motivo: `Consumo por ausencia aprobada (${ausencia.tipo || 'Vacaciones'})`,
    usuario_alta: idUsuarioGestor,
    fecha_alta: new Date(),
  });
};

const registrarAjusteManual = async (
  idEmpresa,
  idUsuario,
  anio,
  dias,
  motivo,
  idUsuarioAccion,
) => {
  const diasNum = redondearDias(dias);
  if (!diasNum) {
    const error = new Error('Los días del ajuste no pueden ser cero');
    error.code = 'AJUSTE_CERO';
    throw error;
  }
  if (!motivo || !String(motivo).trim()) {
    const error = new Error('El motivo del ajuste es obligatorio');
    error.code = 'MOTIVO_REQUERIDO';
    throw error;
  }

  return createConId(UsuarioVacacionesMovimiento, idEmpresa, 'id_movimiento', {
    id_usuario: idUsuario,
    anio: Number(anio) || dayjs().year(),
    dias: diasNum,
    tipo_movimiento: TIPO_AJUSTE,
    motivo: String(motivo).trim(),
    id_usuario_gestor: idUsuarioAccion,
    usuario_alta: idUsuarioAccion,
    fecha_alta: new Date(),
  });
};

const listarMovimientosVacaciones = async (idEmpresa, idUsuario, anio) => {
  const where = movimientoActivoWhere(idEmpresa, idUsuario);
  if (anio) where.anio = Number(anio);

  const movimientos = await UsuarioVacacionesMovimiento.findAll({
    where,
    order: [['fecha_alta', 'DESC'], ['id_movimiento', 'DESC']],
    raw: true,
  });

  return movimientos.map((mov) => ({
    ...mov,
    dias: Number(mov.dias),
  }));
};

const esAusenciaVacaciones = (ausencia) =>
  String(ausencia?.tipo || '').trim().toLowerCase() === 'vacaciones';

module.exports = {
  TIPO_CONSUMO,
  TIPO_ANULACION,
  TIPO_AJUSTE,
  calcularDiasConsumoAusencia,
  obtenerSaldoAnio,
  obtenerResumenVacaciones,
  guardarCupoAnio,
  registrarConsumoPorAusencia,
  registrarAjusteManual,
  listarMovimientosVacaciones,
  listarCuposUsuario,
  esAusenciaVacaciones,
};
