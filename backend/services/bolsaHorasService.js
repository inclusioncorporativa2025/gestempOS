const { Op } = require('sequelize');
const dayjs = require('dayjs');
const BolsaHorasMovimiento = require('../models/BolsaHorasMovimiento');
const { createConId } = require('../utils/empresaScope');
const { formatearMinutos, formatearMinutosConSigno } = require('../utils/tipoHora');

const TIPO_MES = 'mes';
const TIPO_AJUSTE = 'ajuste_manual';

const movimientoActivoWhere = (idEmpresa, idUsuario, extras = {}) => ({
  empresa_id: idEmpresa,
  id_usuario: idUsuario,
  fecha_baja: null,
  ...extras,
});

const sumarMinutos = async (idEmpresa, idUsuario, filtro = {}) => {
  const total = await BolsaHorasMovimiento.sum('minutos', {
    where: movimientoActivoWhere(idEmpresa, idUsuario, filtro),
  });
  return Number(total) || 0;
};

const obtenerSaldoBolsa = async (idEmpresa, idUsuario) => {
  const minutos = await sumarMinutos(idEmpresa, idUsuario);
  const fmt = formatearMinutos(Math.abs(minutos));
  return {
    saldo_bolsa_min: minutos,
    saldo_bolsa: formatearMinutosConSigno(minutos),
    saldo_positivo: minutos >= 0,
  };
};

const obtenerSaldoBolsaAntesDeMes = async (idEmpresa, idUsuario, mes) => {
  const mesNorm = dayjs(mes).format('YYYY-MM');
  const minutos = await sumarMinutos(idEmpresa, idUsuario, {
    [Op.or]: [
      { mes: null },
      { mes: { [Op.lt]: mesNorm } },
    ],
  });
  return minutos;
};

const sincronizarMovimientoMes = async (
  idEmpresa,
  idUsuario,
  mes,
  minutosDelta,
  idUsuarioAccion = null,
) => {
  const mesNorm = dayjs(mes).format('YYYY-MM');
  const existente = await BolsaHorasMovimiento.findOne({
    where: movimientoActivoWhere(idEmpresa, idUsuario, {
      mes: mesNorm,
      tipo_movimiento: TIPO_MES,
    }),
  });

  if (existente) {
    if (existente.minutos !== minutosDelta) {
      existente.minutos = minutosDelta;
      if (idUsuarioAccion) {
        existente.usuario_alta = idUsuarioAccion;
      }
      existente.fecha_alta = new Date();
      await existente.save();
    }
    return existente;
  }

  return createConId(BolsaHorasMovimiento, idEmpresa, 'id_movimiento', {
    id_usuario: idUsuario,
    mes: mesNorm,
    minutos: minutosDelta,
    tipo_movimiento: TIPO_MES,
    motivo: 'Cálculo mensual automático',
    usuario_alta: idUsuarioAccion,
    fecha_alta: new Date(),
  });
};

const registrarAjusteManual = async (
  idEmpresa,
  idUsuario,
  minutos,
  motivo,
  idUsuarioAccion,
) => {
  const minutosInt = Math.round(Number(minutos));
  if (!minutosInt) {
    const error = new Error('Los minutos del ajuste no pueden ser cero');
    error.code = 'AJUSTE_CERO';
    throw error;
  }
  if (!motivo || !String(motivo).trim()) {
    const error = new Error('El motivo del ajuste es obligatorio');
    error.code = 'MOTIVO_REQUERIDO';
    throw error;
  }

  return createConId(BolsaHorasMovimiento, idEmpresa, 'id_movimiento', {
    id_usuario: idUsuario,
    mes: null,
    minutos: minutosInt,
    tipo_movimiento: TIPO_AJUSTE,
    motivo: String(motivo).trim(),
    usuario_alta: idUsuarioAccion,
    fecha_alta: new Date(),
  });
};

const listarMovimientosBolsa = async (idEmpresa, idUsuario) => {
  const movimientos = await BolsaHorasMovimiento.findAll({
    where: movimientoActivoWhere(idEmpresa, idUsuario),
    order: [
      ['mes', 'ASC'],
      ['fecha_alta', 'ASC'],
    ],
  });

  let acumulado = 0;
  const cronologico = movimientos.map((mov) => {
    acumulado += mov.minutos;
    return {
      id_movimiento: mov.id_movimiento,
      mes: mov.mes,
      minutos: mov.minutos,
      minutos_texto: formatearMinutosConSigno(mov.minutos),
      tipo_movimiento: mov.tipo_movimiento,
      motivo: mov.motivo,
      saldo_tras_movimiento_min: acumulado,
      saldo_tras_movimiento: formatearMinutosConSigno(acumulado),
      fecha_alta: mov.fecha_alta,
    };
  });

  return cronologico.reverse();
};

const enriquecerResumenBolsa = async (idEmpresa, idUsuario, mes, deltaMin, idUsuarioAccion) => {
  await sincronizarMovimientoMes(idEmpresa, idUsuario, mes, deltaMin, idUsuarioAccion);
  const saldoAnteriorMin = await obtenerSaldoBolsaAntesDeMes(idEmpresa, idUsuario, mes);
  const saldo = await obtenerSaldoBolsa(idEmpresa, idUsuario);

  const desgloseMes = deltaMin === 0
    ? 'Bolsa equilibrada este mes'
    : `${formatearMinutosConSigno(deltaMin)} este mes`;

  return {
    horas_bolsa_delta_min: deltaMin,
    saldo_bolsa_anterior_min: saldoAnteriorMin,
    saldo_bolsa_anterior: formatearMinutosConSigno(saldoAnteriorMin),
    saldo_bolsa_min: saldo.saldo_bolsa_min,
    saldo_bolsa: saldo.saldo_bolsa,
    desglose: `${desgloseMes}. Saldo acumulado: ${saldo.saldo_bolsa}`,
  };
};

module.exports = {
  TIPO_MES,
  TIPO_AJUSTE,
  obtenerSaldoBolsa,
  obtenerSaldoBolsaAntesDeMes,
  sincronizarMovimientoMes,
  registrarAjusteManual,
  listarMovimientosBolsa,
  enriquecerResumenBolsa,
};
