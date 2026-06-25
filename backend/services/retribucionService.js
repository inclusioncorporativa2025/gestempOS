const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const UsuarioRetribucion = require('../models/UsuarioRetribucion');
const { createConId } = require('../utils/empresaScope');
const { nominasSoportaRetribucion } = require('../utils/nominasCompat');

dayjs.extend(customParseFormat);

const activoWhere = (idEmpresa, idUsuario, extras = {}) => ({
  empresa_id: idEmpresa,
  id_usuario: idUsuario,
  fecha_baja: null,
  ...extras,
});

const mapRetribucion = (row) => {
  if (!row) return null;
  const data = row.toJSON ? row.toJSON() : row;
  return {
    ...data,
    salario_bruto_mensual: Number(data.salario_bruto_mensual),
  };
};

const obtenerVigente = async (idEmpresa, idUsuario) => {
  const row = await UsuarioRetribucion.findOne({
    where: activoWhere(idEmpresa, idUsuario, { fecha_hasta: null }),
    order: [['fecha_desde', 'DESC']],
  });
  return mapRetribucion(row);
};

const obtenerHistorial = async (idEmpresa, idUsuario) => {
  const rows = await UsuarioRetribucion.findAll({
    where: activoWhere(idEmpresa, idUsuario),
    order: [['fecha_desde', 'DESC'], ['id_retribucion', 'DESC']],
  });
  return rows.map(mapRetribucion);
};

const obtenerResumenRetribucion = async (idEmpresa, idUsuario) => {
  const soportado = await nominasSoportaRetribucion();
  if (!soportado) {
    return { soportado: false, vigente: null, historial: [] };
  }

  const [vigente, historial] = await Promise.all([
    obtenerVigente(idEmpresa, idUsuario),
    obtenerHistorial(idEmpresa, idUsuario),
  ]);

  return { soportado: true, vigente, historial };
};

const normalizarSalario = (valor) => {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) {
    const error = new Error('El salario bruto mensual no es válido');
    error.code = 'SALARIO_INVALIDO';
    throw error;
  }
  return Math.round(n * 100) / 100;
};

const parseFechaDesde = (valor) => {
  const fecha = dayjs(valor, ['YYYY-MM-DD', 'DD/MM/YYYY'], true);
  if (!fecha.isValid()) {
    const error = new Error('La fecha de efecto no es válida');
    error.code = 'FECHA_INVALIDA';
    throw error;
  }
  return fecha.format('YYYY-MM-DD');
};

const guardarRetribucion = async (
  idEmpresa,
  idUsuario,
  payload,
  idUsuarioAccion,
) => {
  const salario = normalizarSalario(payload.salario_bruto_mensual);
  const fechaDesde = parseFechaDesde(payload.fecha_desde);
  const observaciones = payload.observaciones?.trim() || null;
  const moneda = String(payload.moneda || 'EUR').trim().toUpperCase().slice(0, 3) || 'EUR';
  const ahora = new Date();

  return sequelize.transaction(async (transaction) => {
    const vigente = await UsuarioRetribucion.findOne({
      where: activoWhere(idEmpresa, idUsuario, { fecha_hasta: null }),
      order: [['fecha_desde', 'DESC']],
      transaction,
      lock: true,
    });

    if (vigente) {
      const inicioVigente = dayjs(vigente.fecha_desde);
      const inicioNuevo = dayjs(fechaDesde);

      if (inicioNuevo.isBefore(inicioVigente, 'day')) {
        const error = new Error('La fecha de efecto no puede ser anterior al salario vigente');
        error.code = 'FECHA_ANTERIOR_VIGENTE';
        throw error;
      }

      const mismoSalario = Number(vigente.salario_bruto_mensual) === salario
        && vigente.moneda === moneda
        && inicioNuevo.isSame(inicioVigente, 'day');

      if (mismoSalario) {
        if (observaciones !== (vigente.observaciones || null)) {
          await vigente.update({
            observaciones,
            usuario_modificacion: idUsuarioAccion,
            fecha_modificacion: ahora,
          }, { transaction });
        }
        return mapRetribucion(vigente);
      }

      if (inicioNuevo.isSame(inicioVigente, 'day')) {
        await vigente.update({
          salario_bruto_mensual: salario,
          moneda,
          observaciones,
          usuario_modificacion: idUsuarioAccion,
          fecha_modificacion: ahora,
        }, { transaction });
        return mapRetribucion(vigente);
      }

      const fechaHastaAnterior = inicioNuevo.subtract(1, 'day').format('YYYY-MM-DD');
      await vigente.update({
        fecha_hasta: fechaHastaAnterior,
        usuario_modificacion: idUsuarioAccion,
        fecha_modificacion: ahora,
      }, { transaction });
    }

    const creada = await createConId(
      UsuarioRetribucion,
      idEmpresa,
      'id_retribucion',
      {
        id_usuario: idUsuario,
        salario_bruto_mensual: salario,
        moneda,
        fecha_desde: fechaDesde,
        fecha_hasta: null,
        observaciones,
        usuario_alta: idUsuarioAccion,
        fecha_alta: ahora,
      },
      transaction,
    );

    return mapRetribucion(creada);
  });
};

const obtenerRetribucionEnFecha = async (idEmpresa, idUsuario, fecha) => {
  const dia = dayjs(fecha).format('YYYY-MM-DD');
  const row = await UsuarioRetribucion.findOne({
    where: {
      ...activoWhere(idEmpresa, idUsuario),
      fecha_desde: { [Op.lte]: dia },
      [Op.or]: [
        { fecha_hasta: null },
        { fecha_hasta: { [Op.gte]: dia } },
      ],
    },
    order: [['fecha_desde', 'DESC']],
  });
  return mapRetribucion(row);
};

module.exports = {
  obtenerResumenRetribucion,
  guardarRetribucion,
  obtenerVigente,
  obtenerHistorial,
  obtenerRetribucionEnFecha,
};
