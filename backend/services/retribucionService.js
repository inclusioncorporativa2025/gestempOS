const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const UsuarioRetribucion = require('../models/UsuarioRetribucion');
const { createConId } = require('../utils/empresaScope');
const { nominasSoportaRetribucion, nominasSoportaRetribucionAnual } = require('../utils/nominasCompat');

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
    salario_bruto_anual: data.salario_bruto_anual != null ? Number(data.salario_bruto_anual) : null,
    numero_pagas: data.numero_pagas != null ? Number(data.numero_pagas) : null,
  };
};

const PAGAS_VALIDAS = [12, 14];

const normalizarPagas = (valor) => {
  const n = Number(valor);
  if (!PAGAS_VALIDAS.includes(n)) {
    const error = new Error('El número de pagas debe ser 12 o 14');
    error.code = 'PAGAS_INVALIDAS';
    throw error;
  }
  return n;
};

const resolverSalarioDesdePayload = async (payload) => {
  const modo = String(payload.modo_retribucion || 'mensual').toLowerCase();
  const soportaAnual = await nominasSoportaRetribucionAnual();

  if (modo === 'anual') {
    if (!soportaAnual) {
      const error = new Error(
        'La retribución anual no está disponible. Ejecute usuarios_retribucion_anual.sql',
      );
      error.code = 'MODULO_ANUAL_NO_DISPONIBLE';
      throw error;
    }
    const anual = normalizarSalario(payload.salario_bruto_anual, 'anual');
    const pagas = normalizarPagas(payload.numero_pagas);
    const mensual = Math.round((anual / pagas) * 100) / 100;
    return {
      salario_bruto_mensual: mensual,
      salario_bruto_anual: anual,
      numero_pagas: pagas,
    };
  }

  return {
    salario_bruto_mensual: normalizarSalario(payload.salario_bruto_mensual),
    salario_bruto_anual: null,
    numero_pagas: null,
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

const normalizarSalario = (valor, tipo = 'mensual') => {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) {
    const etiqueta = tipo === 'anual' ? 'anual' : 'mensual';
    const error = new Error(`El salario bruto ${etiqueta} no es válido`);
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
  const {
    salario_bruto_mensual: salario,
    salario_bruto_anual: salarioAnual,
    numero_pagas: numeroPagas,
  } = await resolverSalarioDesdePayload(payload);
  const fechaDesde = parseFechaDesde(payload.fecha_desde);
  const observaciones = payload.observaciones?.trim() || null;
  const moneda = String(payload.moneda || 'EUR').trim().toUpperCase().slice(0, 3) || 'EUR';
  const ahora = new Date();
  const soportaAnual = await nominasSoportaRetribucionAnual();

  const datosRetribucion = {
    salario_bruto_mensual: salario,
    moneda,
    observaciones,
  };
  if (soportaAnual) {
    datosRetribucion.salario_bruto_anual = salarioAnual;
    datosRetribucion.numero_pagas = numeroPagas;
  }

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
        && Number(vigente.salario_bruto_anual || 0) === Number(salarioAnual || 0)
        && Number(vigente.numero_pagas || 0) === Number(numeroPagas || 0)
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
          ...datosRetribucion,
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
        ...datosRetribucion,
        fecha_desde: fechaDesde,
        fecha_hasta: null,
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
