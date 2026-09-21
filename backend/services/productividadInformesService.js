const { Op } = require('sequelize');
const dayjs = require('dayjs');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const UsuarioJornada = require('../models/UsuarioJornada');
const Jornada = require('../models/Jornada');
const FestivoEmpresa = require('../models/FestivoEmpresa');
const Fichajes = require('../models/Fichajes');
const Ausencias = require('../models/Ausencias');
const {
  calcularResumenHorasMes,
} = require('./horasResumenService');
const { ausenciasSoportaAprobacion, whereSoloAprobadas } = require('../utils/ausenciasCompat');
const {
  esJornadaFija,
  diaSemanaDesdeNombre,
  contarDiasLaborablesMes,
  obtenerDiasSemanaLaborablesJornada,
  DIAS_LABORABLES_DEFECTO,
} = require('../utils/jornadaHoras');
const { expandirRangoDias } = require('./vacacionesConteoService');

const TIPOS_PERSONAL_INFORME = [3, 4, 5];

const normalizarMes = (mes) => (
  String(mes).length === 7 ? mes : dayjs(mes).format('YYYY-MM')
);

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

const obtenerFestivosMes = async (idEmpresa, mesNormalizado) => {
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
  return new Set(festivos.map((f) => dayjs(f.fecha).format('YYYY-MM-DD')));
};

const contarDiasAusenciaMes = async (idEmpresa, idUsuario, mesNormalizado) => {
  const soportaAprobacion = await ausenciasSoportaAprobacion();
  const inicioMes = dayjs(`${mesNormalizado}-01`).startOf('month');
  const finMes = inicioMes.endOf('month');

  const ausencias = await Ausencias.findAll({
    where: {
      empresa_id: idEmpresa,
      id_usuario: idUsuario,
      fecha_baja: null,
      ...whereSoloAprobadas(soportaAprobacion),
      fecha_desde: { [Op.lte]: finMes.toDate() },
      fecha_hasta: { [Op.gte]: inicioMes.toDate() },
    },
  });

  const diasUnicos = new Set();
  ausencias.forEach((ausencia) => {
    expandirRangoDias(ausencia.fecha_desde, ausencia.fecha_hasta).forEach((fecha) => {
      if (!fecha.isBefore(inicioMes, 'day') && !fecha.isAfter(finMes, 'day')) {
        diasUnicos.add(fecha.format('YYYY-MM-DD'));
      }
    });
  });

  return diasUnicos.size;
};

const calcularPuntualidadMes = async (idEmpresa, idUsuario, mesNormalizado, jornada) => {
  if (!jornada || !esJornadaFija(jornada)) {
    return { media_retraso_min: null, fichajes_analizados: 0 };
  }

  const diasJornada = jornada.column1?.dias || [];
  const horaPactadaPorDia = new Map();
  diasJornada.forEach((dia) => {
    const dow = diaSemanaDesdeNombre(dia?.dia);
    if (dow == null) return;
    const tramos = Array.isArray(dia?.horario) ? dia.horario : [];
    const horaEntrada = tramos[0]?.horaEntrada ?? tramos[0]?.hora_entrada;
    const normalizada = normalizarHora(horaEntrada);
    if (normalizada) horaPactadaPorDia.set(dow, normalizada);
  });

  if (!horaPactadaPorDia.size) {
    return { media_retraso_min: null, fichajes_analizados: 0 };
  }

  const inicioMes = dayjs(`${mesNormalizado}-01`).startOf('month').toDate();
  const finMes = dayjs(`${mesNormalizado}-01`).endOf('month').toDate();

  const fichajes = await Fichajes.findAll({
    where: {
      empresa_id: idEmpresa,
      id_usuario: idUsuario,
      fecha_baja: null,
      fecha_entrada: { [Op.between]: [inicioMes, finMes] },
    },
    order: [['fecha_entrada', 'ASC']],
  });

  const primeraEntradaPorDia = new Map();
  fichajes.forEach((fichaje) => {
    const entrada = dayjs(fichaje.fecha_entrada);
    if (!entrada.isValid()) return;
    const clave = entrada.format('YYYY-MM-DD');
    if (!primeraEntradaPorDia.has(clave)) {
      primeraEntradaPorDia.set(clave, entrada);
    }
  });

  const retrasos = [];
  primeraEntradaPorDia.forEach((entrada, clave) => {
    const horaPactada = horaPactadaPorDia.get(entrada.day());
    if (!horaPactada) return;
    const pactada = dayjs(`${clave}T${horaPactada}`);
    if (!pactada.isValid()) return;
    const retraso = entrada.diff(pactada, 'minute');
    if (retraso > 0 && retraso <= 240) {
      retrasos.push(retraso);
    }
  });

  if (!retrasos.length) {
    return { media_retraso_min: 0, fichajes_analizados: 0 };
  }

  const media = Math.round(retrasos.reduce((a, b) => a + b, 0) / retrasos.length);
  return { media_retraso_min: media, fichajes_analizados: retrasos.length };
};

const calcularFilaEmpleado = async (idEmpresa, usuario, membresia, jornada, mesNormalizado, festivosSet) => {
  const resumen = await calcularResumenHorasMes(idEmpresa, usuario.id_usuario, mesNormalizado);

  const diasLaborables = jornada
    ? contarDiasLaborablesMes(
      mesNormalizado,
      esJornadaFija(jornada)
        ? obtenerDiasSemanaLaborablesJornada(jornada)
        : DIAS_LABORABLES_DEFECTO,
      festivosSet,
    )
    : contarDiasLaborablesMes(mesNormalizado, DIAS_LABORABLES_DEFECTO, festivosSet);

  const diasAusencia = await contarDiasAusenciaMes(idEmpresa, usuario.id_usuario, mesNormalizado);
  const puntualidad = await calcularPuntualidadMes(
    idEmpresa,
    usuario.id_usuario,
    mesNormalizado,
    jornada,
  );

  const trabajadasMin = resumen.horas_trabajadas_min ?? 0;
  const pactadasMin = resumen.horas_ordinarias_min ?? 0;
  const cumplimientoPct = pactadasMin > 0
    ? Math.min(100, Math.round((trabajadasMin / pactadasMin) * 100))
    : null;

  const absentismoPct = diasLaborables > 0
    ? Math.round((diasAusencia / diasLaborables) * 1000) / 10
    : null;

  return {
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    email: usuario.email,
    tipo_usuario: membresia.tipo_usuario ?? usuario.tipo_usuario,
    activo: membresia.activo !== false && membresia.activo !== 0,
    jornada_configurada: Boolean(resumen.configurada),
    horas_trabajadas: resumen.horas_trabajadas ?? '0h 0m',
    horas_trabajadas_min: trabajadasMin,
    horas_pactadas: resumen.horas_pactadas_ajustadas ?? resumen.horasMensuales ?? '—',
    horas_pactadas_min: pactadasMin,
    cumplimiento_pct: cumplimientoPct,
    delta_min: resumen.delta_min ?? 0,
    delta: resumen.delta ?? '0h 0m',
    horas_extra_min: resumen.horas_extra_min ?? 0,
    deficit_min: resumen.deficit_min ?? 0,
    dias_ausencia: diasAusencia,
    dias_laborables: diasLaborables,
    absentismo_pct: absentismoPct,
    puntualidad_media_min: puntualidad.media_retraso_min,
    fichajes_puntualidad: puntualidad.fichajes_analizados,
  };
};

const calcularResumenEquipo = (filas) => {
  const conPactada = filas.filter((f) => f.jornada_configurada && f.horas_pactadas_min > 0);
  const mediaCumplimiento = conPactada.length
    ? Math.round(
      conPactada.reduce((acc, f) => acc + (f.cumplimiento_pct ?? 0), 0) / conPactada.length,
    )
    : null;

  const conAbsentismo = filas.filter((f) => f.absentismo_pct != null);
  const mediaAbsentismo = conAbsentismo.length
    ? Math.round(
      (conAbsentismo.reduce((acc, f) => acc + f.absentismo_pct, 0) / conAbsentismo.length) * 10,
    ) / 10
    : null;

  const conPuntualidad = filas.filter((f) => f.puntualidad_media_min != null);
  const mediaPuntualidad = conPuntualidad.length
    ? Math.round(
      conPuntualidad.reduce((acc, f) => acc + f.puntualidad_media_min, 0) / conPuntualidad.length,
    )
    : null;

  return {
    total_empleados: filas.length,
    empleados_con_jornada: conPactada.length,
    media_cumplimiento_pct: mediaCumplimiento,
    total_horas_extra_min: filas.reduce((acc, f) => acc + (f.horas_extra_min || 0), 0),
    total_deficit_min: filas.reduce((acc, f) => acc + (f.deficit_min || 0), 0),
    media_absentismo_pct: mediaAbsentismo,
    media_retraso_min: mediaPuntualidad,
  };
};

const calcularInformeProductividadEmpresa = async (idEmpresa, mes) => {
  const mesNormalizado = normalizarMes(mes);
  const festivosSet = await obtenerFestivosMes(idEmpresa, mesNormalizado);

  const membresias = await UsuarioEmpresa.findAll({
    where: {
      id_empresa: idEmpresa,
      fecha_baja: null,
      activo: true,
      tipo_usuario: { [Op.in]: TIPOS_PERSONAL_INFORME },
    },
  });

  if (!membresias.length) {
    return {
      mes: mesNormalizado,
      resumen: calcularResumenEquipo([]),
      empleados: [],
    };
  }

  const ids = membresias.map((m) => m.id_usuario);
  const membresiaPorUsuario = new Map(membresias.map((m) => [m.id_usuario, m]));

  const usuarios = await Usuario.findAll({
    where: { id_usuario: { [Op.in]: ids }, fecha_baja: null },
  });

  const usuarioJornadas = await UsuarioJornada.findAll({
    where: {
      empresa_id: idEmpresa,
      id_usuario: { [Op.in]: ids },
      fecha_baja: null,
    },
  });

  const jornadaIds = [...new Set(usuarioJornadas.map((uj) => uj.id_jornada))];
  const jornadas = jornadaIds.length
    ? await Jornada.findAll({
      where: {
        empresa_id: idEmpresa,
        id_jornada: { [Op.in]: jornadaIds },
        fecha_baja: null,
      },
    })
    : [];
  const jornadaPorId = new Map(jornadas.map((j) => [j.id_jornada, j]));

  const filas = await Promise.all(
    usuarios.map(async (usuario) => {
      const membresia = membresiaPorUsuario.get(usuario.id_usuario);
      const uj = usuarioJornadas.find((row) => row.id_usuario === usuario.id_usuario);
      const jornada = uj ? jornadaPorId.get(uj.id_jornada) : null;
      return calcularFilaEmpleado(
        idEmpresa,
        usuario,
        membresia,
        jornada,
        mesNormalizado,
        festivosSet,
      );
    }),
  );

  filas.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));

  return {
    mes: mesNormalizado,
    resumen: calcularResumenEquipo(filas),
    empleados: filas,
  };
};

module.exports = {
  calcularInformeProductividadEmpresa,
};
