const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const EmpresaPrenomina = require('../models/EmpresaPrenomina');
const UsuarioPrenomina = require('../models/UsuarioPrenomina');
const UsuarioPrenominaLinea = require('../models/UsuarioPrenominaLinea');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const Usuario = require('../models/Usuario');
const Ausencias = require('../models/Ausencias');
const { createConId } = require('../utils/empresaScope');
const { nominasSoportaPrenomina } = require('../utils/nominasCompat');
const { obtenerRetribucionEnFecha } = require('./retribucionService');
const { calcularResumenHorasMes } = require('./horasResumenService');
const { TIPOS_HORA } = require('../utils/tipoHora');
const { ROLES } = require('../middleware/authMiddleware');
const { esVacaciones } = require('../utils/tiposAusencia');
const { ausenciasSoportaAprobacion, whereSoloAprobadas } = require('../utils/ausenciasCompat');
const { empresaTieneFeature } = require('./planService');
const { calcularDiasConsumoAusencia } = require('./vacacionesConteoService');
const { resolverConvenioUsuario } = require('./convenioService');

const FACTOR_HORA_EXTRA = 1.75;
const ESTADOS_CABECERA = ['borrador', 'revisada', 'cerrada'];

const redondearEuros = (valor) => Math.round((Number(valor) || 0) * 100) / 100;

const redondearDias = (valor) => Math.round(Number(valor) * 10) / 10;

const parseFechaAusencia = (valor) =>
  dayjs(valor, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);

const diasAusenciaEnMes = async (ausencia, inicioMes, finMes, idEmpresa, convenio) => {
  const desde = parseFechaAusencia(ausencia.fecha_desde).startOf('day');
  const hasta = parseFechaAusencia(ausencia.fecha_hasta).startOf('day');
  if (!desde.isValid() || !hasta.isValid()) return 0;
  if (desde.isAfter(finMes, 'day') || hasta.isBefore(inicioMes, 'day')) return 0;

  const clipDesde = desde.isBefore(inicioMes, 'day') ? inicioMes : desde;
  const clipHasta = hasta.isAfter(finMes, 'day') ? finMes : hasta;

  const ausenciaClip = {
    ...ausencia,
    fecha_desde: clipDesde.format('DD-MM-YYYY'),
    fecha_hasta: clipHasta.format('DD-MM-YYYY'),
  };

  if (!desde.isSame(hasta, 'day') || !clipDesde.isSame(clipHasta, 'day')) {
    ausenciaClip.fraccion_dia = 'completo';
    ausenciaClip.hora_ausencia_desde = null;
    ausenciaClip.hora_ausencia_hasta = null;
  }

  return calcularDiasConsumoAusencia(ausenciaClip, idEmpresa, convenio?.reglas || null);
};

const ausenciaSolapaMes = (ausencia, inicioMes, finMes) => {
  const desde = parseFechaAusencia(ausencia.fecha_desde).startOf('day');
  const hasta = parseFechaAusencia(ausencia.fecha_hasta).startOf('day');
  if (!desde.isValid() || !hasta.isValid()) return false;
  return !desde.isAfter(finMes, 'day') && !hasta.isBefore(inicioMes, 'day');
};

const resumirAusenciasMes = async (
  ausenciasUsuario,
  periodoAnio,
  periodoMes,
  idEmpresa,
  idUsuario,
) => {
  const inicioMes = dayjs(`${periodoAnio}-${String(periodoMes).padStart(2, '0')}-01`).startOf('month');
  const finMes = inicioMes.endOf('month');
  let diasVacaciones = 0;
  let diasAusencia = 0;

  const convenio = idEmpresa && idUsuario
    ? await resolverConvenioUsuario(idEmpresa, idUsuario)
    : null;

  for (const ausencia of (ausenciasUsuario || [])) {
    const dias = await diasAusenciaEnMes(ausencia, inicioMes, finMes, idEmpresa, convenio);
    if (dias <= 0) continue;
    if (esVacaciones(ausencia.tipo)) {
      diasVacaciones += dias;
    } else {
      diasAusencia += dias;
    }
  }

  return {
    dias_vacaciones: diasVacaciones > 0 ? redondearDias(diasVacaciones) : null,
    dias_ausencia: diasAusencia > 0 ? redondearDias(diasAusencia) : null,
  };
};

const cargarAusenciasMesPorUsuario = async (idEmpresa, userIds, periodoAnio, periodoMes) => {
  const mapa = new Map(userIds.map((id) => [id, []]));
  if (!userIds.length) return mapa;

  const incluirAusencias = await empresaTieneFeature(idEmpresa, 'ausencias_basicas');
  if (!incluirAusencias) return mapa;

  const soportaAprobacion = await ausenciasSoportaAprobacion();
  const inicioMes = dayjs(`${periodoAnio}-${String(periodoMes).padStart(2, '0')}-01`).startOf('month');
  const finMes = inicioMes.endOf('month');

  const ausencias = await Ausencias.findAll({
    where: {
      empresa_id: idEmpresa,
      id_usuario: { [Op.in]: userIds },
      fecha_baja: null,
      fecha_cancelacion: null,
      ...whereSoloAprobadas(soportaAprobacion),
    },
    attributes: [
      'id_usuario', 'tipo', 'fecha_desde', 'fecha_hasta',
      'fraccion_dia', 'hora_ausencia_desde', 'hora_ausencia_hasta',
    ],
  });

  ausencias.forEach((row) => {
    const data = row.toJSON ? row.toJSON() : row;
    if (!ausenciaSolapaMes(data, inicioMes, finMes)) return;
    const lista = mapa.get(data.id_usuario) || [];
    lista.push(data);
    mapa.set(data.id_usuario, lista);
  });

  return mapa;
};

const activoWhere = (idEmpresa, extras = {}) => ({
  empresa_id: idEmpresa,
  fecha_baja: null,
  ...extras,
});

const mapCabecera = (row) => {
  if (!row) return null;
  const data = row.toJSON ? row.toJSON() : row;
  return {
    ...data,
    periodo_mes: Number(data.periodo_mes),
    periodo_anio: Number(data.periodo_anio),
  };
};

const mapEmpleado = (row) => {
  if (!row) return null;
  const data = row.toJSON ? row.toJSON() : row;
  return {
    ...data,
    salario_base: Number(data.salario_base),
    importe_extras: Number(data.importe_extras),
    importe_complementarias: Number(data.importe_complementarias),
    otros_devengos: Number(data.otros_devengos),
    total_bruto_estimado: Number(data.total_bruto_estimado),
    dias_trabajados: data.dias_trabajados != null ? Number(data.dias_trabajados) : null,
    dias_ausencia: data.dias_ausencia != null ? Number(data.dias_ausencia) : null,
    dias_vacaciones: data.dias_vacaciones != null ? Number(data.dias_vacaciones) : null,
  };
};

const mapLinea = (row) => {
  if (!row) return null;
  const data = row.toJSON ? row.toJSON() : row;
  return {
    ...data,
    cantidad: data.cantidad != null ? Number(data.cantidad) : null,
    importe: Number(data.importe),
    orden: Number(data.orden),
  };
};

const normalizarPeriodo = (mes, anio) => {
  const periodoMes = Number(mes);
  const periodoAnio = Number(anio);
  if (!Number.isInteger(periodoMes) || periodoMes < 1 || periodoMes > 12) {
    const error = new Error('El mes del periodo no es válido');
    error.code = 'PERIODO_INVALIDO';
    throw error;
  }
  if (!Number.isInteger(periodoAnio) || periodoAnio < 2000 || periodoAnio > 2100) {
    const error = new Error('El año del periodo no es válido');
    error.code = 'PERIODO_INVALIDO';
    throw error;
  }
  return { periodoMes, periodoAnio };
};

const calcularFactorMes = (fechaAlta, fechaBaja, periodoAnio, periodoMes) => {
  const inicioMes = dayjs(`${periodoAnio}-${String(periodoMes).padStart(2, '0')}-01`).startOf('month');
  const finMes = inicioMes.endOf('month');
  const diasMes = finMes.date();

  let desde = inicioMes;
  let hasta = finMes;

  if (fechaAlta && dayjs(fechaAlta).isValid() && dayjs(fechaAlta).isAfter(inicioMes, 'day')) {
    desde = dayjs(fechaAlta).startOf('day');
  }
  if (fechaBaja && dayjs(fechaBaja).isValid() && dayjs(fechaBaja).isBefore(finMes, 'day')) {
    hasta = dayjs(fechaBaja).startOf('day');
  }

  if (desde.isAfter(hasta, 'day')) {
    return { factor: 0, diasEfectivos: 0, diasMes };
  }

  const diasEfectivos = hasta.diff(desde, 'day') + 1;
  return {
    factor: diasEfectivos / diasMes,
    diasEfectivos,
    diasMes,
  };
};

const listarEmpleadosParaPrenomina = async (idEmpresa) => {
  const vinculos = await UsuarioEmpresa.findAll({
    where: { id_empresa: idEmpresa, fecha_baja: null, activo: true },
  });

  if (!vinculos.length) return [];

  const ids = vinculos.map((v) => v.id_usuario);
  const usuarios = await Usuario.findAll({
    where: {
      id_usuario: { [Op.in]: ids },
      fecha_baja: null,
    },
    attributes: ['id_usuario', 'nombre', 'dni', 'email'],
  });

  const mapVinculo = new Map(vinculos.map((v) => [v.id_usuario, v]));

  return usuarios
    .filter((u) => Number(mapVinculo.get(u.id_usuario)?.tipo_usuario) !== ROLES.INSPECTOR)
    .map((u) => ({
      usuario: u,
      membresia: mapVinculo.get(u.id_usuario),
    }));
};

const calcularEmpleado = async (
  idEmpresa,
  idUsuario,
  membresia,
  periodoAnio,
  periodoMes,
  ausenciasUsuario = [],
) => {
  const mes = `${periodoAnio}-${String(periodoMes).padStart(2, '0')}`;
  const ultimoDiaMes = dayjs(mes).endOf('month').format('YYYY-MM-DD');
  const alertas = [];

  const { factor, diasEfectivos, diasMes } = calcularFactorMes(
    membresia?.fecha_alta,
    membresia?.fecha_baja,
    periodoAnio,
    periodoMes,
  );

  if (factor <= 0) {
    return {
      omitir: true,
      motivo: 'Sin días efectivos en el periodo',
    };
  }

  const retribucion = await obtenerRetribucionEnFecha(idEmpresa, idUsuario, ultimoDiaMes);
  const horas = await calcularResumenHorasMes(idEmpresa, idUsuario, mes);

  let estado = 'ok';
  if (!retribucion?.salario_bruto_mensual) {
    estado = 'sin_salario';
    alertas.push('Sin salario base configurado');
  }
  if (!horas.configurada) {
    estado = estado === 'sin_salario' ? 'incidencias' : 'sin_jornada';
    alertas.push('Sin jornada configurada');
  }

  const salarioMensual = Number(retribucion?.salario_bruto_mensual) || 0;
  const salarioBase = redondearEuros(salarioMensual * factor);
  const moneda = retribucion?.moneda || 'EUR';

  let importeExtras = 0;
  let importeComplementarias = 0;
  let precioHora = null;

  if (horas.configurada && horas.horas_ordinarias_min > 0 && salarioMensual > 0) {
    precioHora = salarioMensual / (horas.horas_ordinarias_min / 60);
    const horasExtra = (horas.horas_extra_min || 0) / 60;
    const horasComp = (horas.horas_complementaria_min || 0) / 60;
    importeExtras = redondearEuros(horasExtra * precioHora * FACTOR_HORA_EXTRA);
    importeComplementarias = redondearEuros(horasComp * precioHora);
  } else if ((horas.horas_extra_min > 0 || horas.horas_complementaria_min > 0) && !precioHora) {
    alertas.push('No se pudo valorar horas extra/complementarias (falta salario o jornada)');
    if (estado === 'ok') estado = 'incidencias';
  }

  const otrosDevengos = 0;
  const totalBruto = redondearEuros(salarioBase + importeExtras + importeComplementarias + otrosDevengos);
  const { dias_vacaciones: diasVacaciones, dias_ausencia: diasAusencia } = await resumirAusenciasMes(
    ausenciasUsuario,
    periodoAnio,
    periodoMes,
    idEmpresa,
    idUsuario,
  );

  const lineas = [];

  if (salarioBase > 0) {
    lineas.push({
      codigo_concepto: 'BASE',
      descripcion: 'Salario base mensual (prorrateado)',
      tipo: 'devengo',
      cantidad: diasEfectivos,
      unidad: 'dias',
      importe: salarioBase,
      origen: 'automatico',
      orden: 10,
    });
  }

  if (importeExtras > 0) {
    lineas.push({
      codigo_concepto: 'HEX',
      descripcion: `Horas extra (${FACTOR_HORA_EXTRA}x)`,
      tipo: 'devengo',
      cantidad: redondearEuros((horas.horas_extra_min || 0) / 60),
      unidad: 'horas',
      importe: importeExtras,
      origen: 'automatico',
      orden: 20,
    });
  }

  if (importeComplementarias > 0) {
    lineas.push({
      codigo_concepto: 'HCOMP',
      descripcion: 'Horas complementarias',
      tipo: 'devengo',
      cantidad: redondearEuros((horas.horas_complementaria_min || 0) / 60),
      unidad: 'horas',
      importe: importeComplementarias,
      origen: 'automatico',
      orden: 30,
    });
  }

  if (horas.tipo_hora === TIPOS_HORA.BOLSA && horas.horas_bolsa_delta_min) {
    lineas.push({
      codigo_concepto: 'BOLSA',
      descripcion: 'Bolsa de horas (informativo)',
      tipo: 'informativo',
      cantidad: redondearEuros(Math.abs(horas.horas_bolsa_delta_min) / 60),
      unidad: 'horas',
      importe: 0,
      origen: 'automatico',
      orden: 40,
    });
  }

  if (diasVacaciones) {
    lineas.push({
      codigo_concepto: 'VAC',
      descripcion: 'Días de vacaciones (informativo)',
      tipo: 'informativo',
      cantidad: diasVacaciones,
      unidad: 'dias',
      importe: 0,
      origen: 'automatico',
      orden: 50,
    });
  }

  if (diasAusencia) {
    lineas.push({
      codigo_concepto: 'AUS',
      descripcion: 'Días de ausencia (informativo)',
      tipo: 'informativo',
      cantidad: diasAusencia,
      unidad: 'dias',
      importe: 0,
      origen: 'automatico',
      orden: 60,
    });
  }

  const snapshot = {
    periodo: mes,
    prorrateo: { factor, diasEfectivos, diasMes },
    retribucion: retribucion || null,
    horas,
    precio_hora: precioHora != null ? redondearEuros(precioHora) : null,
    factor_hora_extra: FACTOR_HORA_EXTRA,
    alertas,
    ausencias: { dias_vacaciones: diasVacaciones, dias_ausencia: diasAusencia },
  };

  return {
    omitir: false,
    estado,
    salario_base: salarioBase,
    importe_extras: importeExtras,
    importe_complementarias: importeComplementarias,
    otros_devengos: otrosDevengos,
    total_bruto_estimado: totalBruto,
    moneda,
    id_retribucion: retribucion?.id_retribucion ?? null,
    dias_trabajados: diasEfectivos,
    dias_ausencia: diasAusencia,
    dias_vacaciones: diasVacaciones,
    snapshot_json: snapshot,
    lineas,
  };
};

const darBajaDetallePrenomina = async (idEmpresa, idPrenomina, idUsuarioAccion, transaction) => {
  const ahora = new Date();
  await UsuarioPrenominaLinea.update(
    { fecha_baja: ahora, usuario_baja: idUsuarioAccion },
    {
      where: activoWhere(idEmpresa, { id_prenomina: idPrenomina }),
      transaction,
    },
  );
  await UsuarioPrenomina.update(
    { fecha_baja: ahora, usuario_baja: idUsuarioAccion },
    {
      where: activoWhere(idEmpresa, { id_prenomina: idPrenomina }),
      transaction,
    },
  );
};

const generarPrenomina = async (idEmpresa, periodoMes, periodoAnio, idUsuarioAccion) => {
  const soportado = await nominasSoportaPrenomina();
  if (!soportado) {
    const error = new Error('El módulo de prenómina no está disponible en el servidor');
    error.code = 'MODULO_NO_DISPONIBLE';
    throw error;
  }

  const { periodoMes: mes, periodoAnio: anio } = normalizarPeriodo(periodoMes, periodoAnio);
  const ahora = new Date();

  return sequelize.transaction(async (transaction) => {
    let cabecera = await EmpresaPrenomina.findOne({
      where: activoWhere(idEmpresa, { periodo_mes: mes, periodo_anio: anio }),
      transaction,
      lock: true,
    });

    if (cabecera && cabecera.estado === 'cerrada') {
      const error = new Error('La prenómina de este periodo está cerrada y no se puede recalcular');
      error.code = 'PRENOMINA_CERRADA';
      throw error;
    }

    if (!cabecera) {
      cabecera = await createConId(
        EmpresaPrenomina,
        idEmpresa,
        'id_prenomina',
        {
          periodo_mes: mes,
          periodo_anio: anio,
          estado: 'borrador',
          fecha_generacion: ahora,
          usuario_generacion: idUsuarioAccion,
          usuario_alta: idUsuarioAccion,
          fecha_alta: ahora,
        },
        transaction,
      );
    } else {
      await darBajaDetallePrenomina(idEmpresa, cabecera.id_prenomina, idUsuarioAccion, transaction);
      await cabecera.update({
        fecha_generacion: ahora,
        usuario_generacion: idUsuarioAccion,
        estado: 'borrador',
        fecha_cierre: null,
        usuario_cierre: null,
        usuario_modificacion: idUsuarioAccion,
        fecha_modificacion: ahora,
      }, { transaction });
    }

    const empleados = await listarEmpleadosParaPrenomina(idEmpresa);
    const userIds = empleados.map(({ usuario }) => usuario.id_usuario);
    const ausenciasPorUsuario = await cargarAusenciasMesPorUsuario(idEmpresa, userIds, anio, mes);
    const resultados = [];

    for (const { usuario, membresia } of empleados) {
      const calculo = await calcularEmpleado(
        idEmpresa,
        usuario.id_usuario,
        membresia,
        anio,
        mes,
        ausenciasPorUsuario.get(usuario.id_usuario) || [],
      );

      if (calculo.omitir) continue;

      const fila = await createConId(
        UsuarioPrenomina,
        idEmpresa,
        'id_prenomina_empleado',
        {
          id_prenomina: cabecera.id_prenomina,
          id_usuario: usuario.id_usuario,
          dias_trabajados: calculo.dias_trabajados,
          dias_ausencia: calculo.dias_ausencia,
          dias_vacaciones: calculo.dias_vacaciones,
          salario_base: calculo.salario_base,
          importe_extras: calculo.importe_extras,
          importe_complementarias: calculo.importe_complementarias,
          otros_devengos: calculo.otros_devengos,
          total_bruto_estimado: calculo.total_bruto_estimado,
          moneda: calculo.moneda,
          id_retribucion: calculo.id_retribucion,
          estado: calculo.estado,
          snapshot_json: calculo.snapshot_json,
          usuario_alta: idUsuarioAccion,
          fecha_alta: ahora,
        },
        transaction,
      );

      for (const linea of calculo.lineas) {
        await createConId(
          UsuarioPrenominaLinea,
          idEmpresa,
          'id_linea',
          {
            id_prenomina: cabecera.id_prenomina,
            id_usuario: usuario.id_usuario,
            ...linea,
            usuario_alta: idUsuarioAccion,
            fecha_alta: ahora,
          },
          transaction,
        );
      }

      resultados.push(mapEmpleado(fila));
    }

    return {
      soportado: true,
      prenomina: mapCabecera(cabecera),
      empleados: resultados,
      total_empleados: resultados.length,
      total_bruto: redondearEuros(resultados.reduce((acc, e) => acc + e.total_bruto_estimado, 0)),
    };
  });
};

const listarPrenominas = async (idEmpresa) => {
  const soportado = await nominasSoportaPrenomina();
  if (!soportado) return { soportado: false, prenominas: [] };

  const rows = await EmpresaPrenomina.findAll({
    where: activoWhere(idEmpresa),
    order: [
      ['periodo_anio', 'DESC'],
      ['periodo_mes', 'DESC'],
      ['id_prenomina', 'DESC'],
    ],
  });

  return {
    soportado: true,
    prenominas: rows.map(mapCabecera),
  };
};

const obtenerDetallePrenomina = async (idEmpresa, idPrenomina) => {
  const soportado = await nominasSoportaPrenomina();
  if (!soportado) {
    const error = new Error('El módulo de prenómina no está disponible en el servidor');
    error.code = 'MODULO_NO_DISPONIBLE';
    throw error;
  }

  const cabecera = await EmpresaPrenomina.findOne({
    where: activoWhere(idEmpresa, { id_prenomina: idPrenomina }),
  });

  if (!cabecera) {
    const error = new Error('Prenómina no encontrada');
    error.code = 'PRENOMINA_NO_ENCONTRADA';
    throw error;
  }

  const empleadosRows = await UsuarioPrenomina.findAll({
    where: activoWhere(idEmpresa, { id_prenomina: idPrenomina }),
    order: [['id_prenomina_empleado', 'ASC']],
  });

  const lineasRows = await UsuarioPrenominaLinea.findAll({
    where: activoWhere(idEmpresa, { id_prenomina: idPrenomina }),
    order: [['id_usuario', 'ASC'], ['orden', 'ASC'], ['id_linea', 'ASC']],
  });

  const idsUsuarios = [...new Set(empleadosRows.map((e) => e.id_usuario))];
  const usuarios = idsUsuarios.length
    ? await Usuario.findAll({
      where: { id_usuario: { [Op.in]: idsUsuarios } },
      attributes: ['id_usuario', 'nombre', 'dni', 'email'],
    })
    : [];
  const mapUsuario = new Map(usuarios.map((u) => [u.id_usuario, u.toJSON()]));

  const empleados = empleadosRows.map((row) => {
    const base = mapEmpleado(row);
    const usuario = mapUsuario.get(row.id_usuario);
    return {
      ...base,
      nombre: usuario?.nombre ?? null,
      dni: usuario?.dni ?? null,
      email: usuario?.email ?? null,
      lineas: lineasRows
        .filter((l) => l.id_usuario === row.id_usuario)
        .map(mapLinea),
    };
  });

  const totalBruto = redondearEuros(
    empleados.reduce((acc, e) => acc + e.total_bruto_estimado, 0),
  );

  return {
    soportado: true,
    prenomina: mapCabecera(cabecera),
    empleados,
    total_empleados: empleados.length,
    total_bruto: totalBruto,
  };
};

const cerrarPrenomina = async (idEmpresa, idPrenomina, idUsuarioAccion) => {
  const soportado = await nominasSoportaPrenomina();
  if (!soportado) {
    const error = new Error('El módulo de prenómina no está disponible en el servidor');
    error.code = 'MODULO_NO_DISPONIBLE';
    throw error;
  }

  const cabecera = await EmpresaPrenomina.findOne({
    where: activoWhere(idEmpresa, { id_prenomina: idPrenomina }),
  });

  if (!cabecera) {
    const error = new Error('Prenómina no encontrada');
    error.code = 'PRENOMINA_NO_ENCONTRADA';
    throw error;
  }

  if (cabecera.estado === 'cerrada') {
    const error = new Error('La prenómina ya está cerrada');
    error.code = 'PRENOMINA_CERRADA';
    throw error;
  }

  const ahora = new Date();
  await cabecera.update({
    estado: 'cerrada',
    fecha_cierre: ahora,
    usuario_cierre: idUsuarioAccion,
    usuario_modificacion: idUsuarioAccion,
    fecha_modificacion: ahora,
  });

  return obtenerDetallePrenomina(idEmpresa, idPrenomina);
};

module.exports = {
  generarPrenomina,
  listarPrenominas,
  obtenerDetallePrenomina,
  cerrarPrenomina,
  ESTADOS_CABECERA,
  FACTOR_HORA_EXTRA,
};
