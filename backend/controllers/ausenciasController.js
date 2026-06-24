const { Op } = require('sequelize');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const parseFechaAusencia = (valor) =>
  dayjs(valor, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);

const rangosSolapan = (desde, hasta, otroDesde, otroHasta) =>
  !desde.isAfter(otroHasta, 'day') && !hasta.isBefore(otroDesde, 'day');

const Ausencias = require('../models/Ausencias');
const { assertEmpresaTieneFeature, empresaTieneFeature } = require('../services/planService');
const Usuario = require('../models/Usuario');
const { createConId } = require('../utils/empresaScope');
const { ROLE_GROUPS } = require('../middleware/authMiddleware');
const { ausenciasSoportaAprobacion, whereSoloAprobadas } = require('../utils/ausenciasCompat');
const { enviarNotificacionGestion } = require('../utils/mailService');
const { obtenerEmailsGestoresEmpresa } = require('../utils/gestoresEmpresa');
const {
  esAusenciaVacaciones,
  registrarConsumoPorAusencia,
} = require('../services/vacacionesService');
const { vacacionesSoportaSaldo } = require('../utils/vacacionesCompat');

const expandirRangoDias = (fechaDesde, fechaHasta) => {
  const dias = [];
  let actual = parseFechaAusencia(fechaDesde).startOf('day');
  const fin = parseFechaAusencia(fechaHasta).startOf('day');
  if (!actual.isValid() || !fin.isValid()) return [];
  while (actual.isSame(fin, 'day') || actual.isBefore(fin, 'day')) {
    dias.push(actual.format('YYYY-MM-DD'));
    actual = actual.add(1, 'day');
  }
  return dias;
};

const esAusenciaRechazada = (a) => Boolean(a?.fecha_cancelacion);

const esAusenciaAprobada = (a, soportaAprobacion) =>
  !soportaAprobacion || Boolean(a?.fecha_aceptacion);

const esAusenciaPendiente = (a, soportaAprobacion) =>
  soportaAprobacion && !a?.fecha_aceptacion && !a?.fecha_cancelacion;

const enriquecerAusenciasConUsuarios = async (ausencias) => {
  const filas = ausencias.map((a) => (a.toJSON ? a.toJSON() : a));
  const idsUsuarios = [...new Set(filas.flatMap((a) => [a.id_usuario, a.id_usuario_gestor].filter(Boolean)))];
  const usuarios = idsUsuarios.length
    ? await Usuario.findAll({
        where: { id_usuario: idsUsuarios },
        attributes: ['id_usuario', 'nombre'],
        raw: true,
      })
    : [];
  const nombrePorId = Object.fromEntries(usuarios.map((u) => [u.id_usuario, u.nombre]));

  return filas.map((a) => ({
    ...a,
    nombre_usuario: nombrePorId[a.id_usuario] || '',
    nombre_gestor: a.id_usuario_gestor ? (nombrePorId[a.id_usuario_gestor] || '') : '',
    dias: expandirRangoDias(a.fecha_desde, a.fecha_hasta).length,
  }));
};

const mapAusenciaListado = (a, idUsuarioToken) => ({
  id_ausencia: a.id_ausencia,
  empresa_id: a.empresa_id,
  id_usuario: a.id_usuario,
  nombre_usuario: a.nombre_usuario,
  nombre_gestor: a.nombre_gestor,
  tipo: a.tipo,
  fecha_desde: a.fecha_desde,
  fecha_hasta: a.fecha_hasta,
  hora_ausencia_desde: a.hora_ausencia_desde,
  hora_ausencia_hasta: a.hora_ausencia_hasta,
  comentarios: a.comentarios,
  fecha_alta: a.fecha_alta,
  fecha_aceptacion: a.fecha_aceptacion,
  fecha_cancelacion: a.fecha_cancelacion,
  motivo_rechazo: a.motivo_rechazo,
  notificacion_vista: a.notificacion_vista,
  dias: a.dias,
  es_propio: a.id_usuario === idUsuarioToken,
});

const getAusenciasByIdUsuario = async (req, res) => {
  const { idUsuario, mes, idEmpresa } = req.body;

  try {
    const permiteAusencias = await empresaTieneFeature(idEmpresa, 'ausencias_basicas');
    if (!permiteAusencias) {
      return res.status(200).json({ message: 'Datos recuperados correctamente', ausencias: [] });
    }

    const soportaAprobacion = await ausenciasSoportaAprobacion();
    const whereCondition = {
      empresa_id: idEmpresa,
      fecha_baja: null,
      id_usuario: idUsuario,
      ...whereSoloAprobadas(soportaAprobacion),
    };

    if (mes && mes.includes('-')) {
      const [startMonthStr, endMonthStr] = mes.split('-');
      const startDate = dayjs(startMonthStr, 'MM/YYYY').startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(endMonthStr, 'MM/YYYY').endOf('month').format('YYYY-MM-DD');

      whereCondition[Op.and] = [
        { fecha_desde: { [Op.lte]: endDate } },
        { fecha_hasta: { [Op.gte]: startDate } },
      ];
    }

    const ausencias = await Ausencias.findAll({
      where: whereCondition,
      order: [['fecha_alta', 'DESC']],
    });

    res.status(200).json({ message: 'Datos recuperados correctamente', ausencias });
  } catch (error) {
    console.error('Error al obtener las ausencias:', error);
    res.status(500).json({ error: 'Error al obtener ausencias' });
  }
};

const crearAusencia = async (req, res) => {
  const {
    idUsuario,
    idEmpresa,
    fecha_desde,
    fecha_hasta,
    hora_ausencia_desde,
    hora_ausencia_hasta,
    comentario,
    tipo,
    fraccion_dia,
  } = req.body;

  if (!idUsuario || !idEmpresa || !fecha_desde || !fecha_hasta || !tipo) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const desde = parseFechaAusencia(fecha_desde);
  const hasta = parseFechaAusencia(fecha_hasta);

  if (!desde.isValid() || !hasta.isValid()) {
    return res.status(400).json({ error: 'Formato de fecha inválido. Use DD-MM-YYYY' });
  }

  if (hasta.isBefore(desde, 'day')) {
    return res.status(400).json({ error: 'fecha_hasta no puede ser anterior a fecha_desde' });
  }

  const fechaDesdeGuardar = desde.format('DD-MM-YYYY');
  const fechaHastaGuardar = hasta.format('DD-MM-YYYY');

  try {
    await assertEmpresaTieneFeature(idEmpresa, 'ausencias_basicas');
  } catch (error) {
    if (error.code === 'PLAN_FEATURE_REQUIRED') {
      return res.status(403).json({
        code: error.code,
        feature: error.feature,
        plan: error.plan,
        message: 'Las ausencias requieren el plan RRHH o Completo',
      });
    }
    throw error;
  }

  if (String(tipo).trim().toLowerCase() === 'vacaciones') {
    try {
      await assertEmpresaTieneFeature(idEmpresa, 'vacaciones');
    } catch (error) {
      if (error.code === 'PLAN_FEATURE_REQUIRED') {
        return res.status(403).json({
          code: error.code,
          feature: error.feature,
          plan: error.plan,
          message: 'Las vacaciones requieren el plan RRHH o Completo',
        });
      }
      throw error;
    }
  }

  try {
    const soportaAprobacion = await ausenciasSoportaAprobacion();
    const ausenciasActivas = await Ausencias.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario: idUsuario,
        fecha_baja: null,
      },
      raw: true,
    });

    const conflicto = ausenciasActivas.find((a) => {
      if (soportaAprobacion && esAusenciaRechazada(a)) return false;
      const otroDesde = parseFechaAusencia(a.fecha_desde);
      const otroHasta = parseFechaAusencia(a.fecha_hasta);
      if (!otroDesde.isValid() || !otroHasta.isValid()) return false;
      return rangosSolapan(desde, hasta, otroDesde, otroHasta);
    });

    if (conflicto) {
      const detalle = `${conflicto.tipo || 'Ausencia'} (${conflicto.fecha_desde} – ${conflicto.fecha_hasta})`;
      return res.status(400).json({
        error: 'La ausencia se superpone con otra existente',
        detalle,
      });
    }

    const ahora = dayjs().toDate();
    const nuevaAusencia = await createConId(Ausencias, idEmpresa, 'id_ausencia', {
      id_usuario: idUsuario,
      fecha_desde: fechaDesdeGuardar,
      fecha_hasta: fechaHastaGuardar,
      hora_ausencia_desde: hora_ausencia_desde || null,
      hora_ausencia_hasta: hora_ausencia_hasta || null,
      tipo,
      fraccion_dia: fraccion_dia ? String(fraccion_dia).trim().toLowerCase() : null,
      comentarios: comentario || null,
      usuario_alta: idUsuario,
      fecha_alta: ahora,
      ...(soportaAprobacion
        ? { notificacion_vista: false }
        : { fecha_aceptacion: ahora, notificacion_vista: true }),
    });

    if (soportaAprobacion) {
      const solicitante = await Usuario.findOne({
        where: { id_usuario: idUsuario },
        attributes: ['nombre'],
        raw: true,
      });
      const destinatarios = await obtenerEmailsGestoresEmpresa(idEmpresa);
      const detalleAusencia = `${tipo}: ${fechaDesdeGuardar} – ${fechaHastaGuardar}`;

      try {
        await enviarNotificacionGestion({
          destinatarios,
          tipo: 'solicitud_ausencia',
          nombreSolicitante: solicitante?.nombre,
          detalleAusencia,
        });
      } catch (mailError) {
        console.error('[crearAusencia] Error enviando correo:', mailError.message);
      }
    }

    res.status(201).json({
      message: soportaAprobacion
        ? 'Solicitud de ausencia enviada correctamente'
        : 'Ausencia creada correctamente',
      ausencia: nuevaAusencia,
      pendiente_aprobacion: soportaAprobacion,
    });
  } catch (error) {
    console.error('Error al crear la ausencia:', error);
    res.status(500).json({ error: 'Error al crear la ausencia' });
  }
};

const getAusenciasCalendario = async (req, res) => {
  const tipo = Number(req.user.tipo_usuario);
  const idEmpresa = Number(req.user.id_empresa);
  const idUsuarioToken = Number(req.user.id_usuario);

  if (!idEmpresa) {
    return res.status(403).json({ error: 'Usuario sin empresa asignada' });
  }

  const verTodaLaEmpresa = ROLE_GROUPS.CALENDARIO_AUSENCIAS_EMPRESA.includes(tipo);

  try {
    const permiteAusencias = await empresaTieneFeature(idEmpresa, 'ausencias_basicas');
    if (!permiteAusencias) {
      return res.status(200).json({ eventos: [], ver_toda_empresa: verTodaLaEmpresa });
    }

    const soportaAprobacion = await ausenciasSoportaAprobacion();
    const permiteVacaciones = await empresaTieneFeature(idEmpresa, 'vacaciones');

    const where = {
      empresa_id: idEmpresa,
      fecha_baja: null,
      ...whereSoloAprobadas(soportaAprobacion),
    };

    if (!verTodaLaEmpresa) {
      where.id_usuario = idUsuarioToken;
    }

    const ausencias = await Ausencias.findAll({
      where,
      order: [['fecha_desde', 'ASC']],
      raw: true,
    });

    const idsUsuarios = [...new Set(ausencias.map((a) => a.id_usuario))];
    const usuarios = idsUsuarios.length
      ? await Usuario.findAll({
          where: { id_usuario: idsUsuarios },
          attributes: ['id_usuario', 'nombre'],
          raw: true,
        })
      : [];
    const nombrePorId = Object.fromEntries(usuarios.map((u) => [u.id_usuario, u.nombre]));

    const eventos = [];
    for (const a of ausencias) {
      if (!permiteVacaciones && String(a.tipo || '').trim().toLowerCase() === 'vacaciones') {
        continue;
      }
      const dias = expandirRangoDias(a.fecha_desde, a.fecha_hasta);
      for (const fecha of dias) {
        eventos.push({
          fecha,
          id_ausencia: a.id_ausencia,
          id_usuario: a.id_usuario,
          nombre_usuario: nombrePorId[a.id_usuario] || '',
          tipo: a.tipo,
          es_propio: a.id_usuario === idUsuarioToken,
        });
      }
    }

    res.status(200).json({ eventos, ver_toda_empresa: verTodaLaEmpresa });
  } catch (error) {
    console.error('Error al obtener ausencias del calendario:', error);
    res.status(500).json({ error: 'Error al obtener ausencias del calendario' });
  }
};

const getAusenciasListado = async (req, res) => {
  const tipo = Number(req.user.tipo_usuario);
  const idEmpresa = Number(req.user.id_empresa);
  const idUsuarioToken = Number(req.user.id_usuario);
  const { mes } = req.body || {};

  if (!idEmpresa) {
    return res.status(403).json({ error: 'Usuario sin empresa asignada' });
  }

  const verTodaLaEmpresa = ROLE_GROUPS.CALENDARIO_AUSENCIAS_EMPRESA.includes(tipo);

  try {
    const permiteAusencias = await empresaTieneFeature(idEmpresa, 'ausencias_basicas');
    if (!permiteAusencias) {
      return res.status(200).json({ ausencias: [], ver_toda_empresa: verTodaLaEmpresa });
    }

    const permiteVacaciones = await empresaTieneFeature(idEmpresa, 'vacaciones');
    const where = { empresa_id: idEmpresa, fecha_baja: null };

    if (!verTodaLaEmpresa) {
      where.id_usuario = idUsuarioToken;
    }

    if (mes && String(mes).includes('-')) {
      const [startMonthStr, endMonthStr] = mes.split('-');
      const startDate = dayjs(startMonthStr, 'MM/YYYY').startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(endMonthStr, 'MM/YYYY').endOf('month').format('YYYY-MM-DD');
      where[Op.and] = [
        { fecha_desde: { [Op.lte]: endDate } },
        { fecha_hasta: { [Op.gte]: startDate } },
      ];
    }

    const ausencias = await Ausencias.findAll({
      where,
      order: [['fecha_desde', 'DESC'], ['fecha_alta', 'DESC']],
      raw: true,
    });

    const filtradas = ausencias.filter((a) => {
      if (!permiteVacaciones && String(a.tipo || '').trim().toLowerCase() === 'vacaciones') {
        return false;
      }
      return true;
    });

    const enriquecidas = await enriquecerAusenciasConUsuarios(filtradas);

    res.status(200).json({
      ausencias: enriquecidas.map((a) => mapAusenciaListado(a, idUsuarioToken)),
      ver_toda_empresa: verTodaLaEmpresa,
    });
  } catch (error) {
    console.error('Error al obtener listado de ausencias:', error);
    res.status(500).json({ error: 'Error al obtener listado de ausencias' });
  }
};

const getAusenciasPendientesEmpresa = async (req, res) => {
  const idEmpresa = Number(req.user.id_empresa);
  if (!idEmpresa) {
    return res.status(403).json({ error: 'Usuario sin empresa asignada' });
  }

  try {
    const permiteAusencias = await empresaTieneFeature(idEmpresa, 'ausencias_basicas');
    const soportaAprobacion = await ausenciasSoportaAprobacion();
    if (!permiteAusencias || !soportaAprobacion) {
      return res.status(200).json({ ausencias: [] });
    }

    const ausencias = await Ausencias.findAll({
      where: {
        empresa_id: idEmpresa,
        fecha_baja: null,
        fecha_aceptacion: null,
        fecha_cancelacion: null,
      },
      order: [['fecha_alta', 'DESC']],
      raw: true,
    });

    const enriquecidas = await enriquecerAusenciasConUsuarios(ausencias);
    res.status(200).json({ ausencias: enriquecidas });
  } catch (error) {
    console.error('Error al obtener ausencias pendientes:', error);
    res.status(500).json({ error: 'Error al obtener ausencias pendientes' });
  }
};

const getHistorialAusenciasEmpresa = async (req, res) => {
  const idEmpresa = Number(req.user.id_empresa);
  if (!idEmpresa) {
    return res.status(403).json({ error: 'Usuario sin empresa asignada' });
  }

  try {
    const permiteAusencias = await empresaTieneFeature(idEmpresa, 'ausencias_basicas');
    const soportaAprobacion = await ausenciasSoportaAprobacion();
    if (!permiteAusencias || !soportaAprobacion) {
      return res.status(200).json({ ausencias: [] });
    }

    const ausencias = await Ausencias.findAll({
      where: {
        empresa_id: idEmpresa,
        fecha_baja: null,
        [Op.or]: [
          { fecha_aceptacion: { [Op.ne]: null } },
          { fecha_cancelacion: { [Op.ne]: null } },
        ],
      },
      order: [['fecha_alta', 'DESC']],
      raw: true,
    });

    const enriquecidas = await enriquecerAusenciasConUsuarios(ausencias);
    res.status(200).json({ ausencias: enriquecidas });
  } catch (error) {
    console.error('Error al obtener historial de ausencias:', error);
    res.status(500).json({ error: 'Error al obtener historial de ausencias' });
  }
};

const getAusenciasNotificacionesEmpleado = async (req, res) => {
  const idEmpresa = Number(req.user.id_empresa);
  const idUsuario = Number(req.user.id_usuario);

  if (!idEmpresa || !idUsuario) {
    return res.status(403).json({ error: 'Usuario sin empresa asignada' });
  }

  try {
    const permiteAusencias = await empresaTieneFeature(idEmpresa, 'ausencias_basicas');
    const soportaAprobacion = await ausenciasSoportaAprobacion();
    if (!permiteAusencias || !soportaAprobacion) {
      return res.status(200).json({ ausencias: [] });
    }

    const ausencias = await Ausencias.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario: idUsuario,
        fecha_baja: null,
        [Op.or]: [
          { fecha_aceptacion: { [Op.ne]: null } },
          { fecha_cancelacion: { [Op.ne]: null } },
        ],
      },
      order: [['fecha_alta', 'DESC']],
      raw: true,
    });

    const enriquecidas = await enriquecerAusenciasConUsuarios(ausencias);
    res.status(200).json({ ausencias: enriquecidas });
  } catch (error) {
    console.error('Error al obtener notificaciones de ausencias:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones de ausencias' });
  }
};

const responderAusencia = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idUsuarioGestor = Number(req.body?.idUsuario || req.user.id_usuario);
  const idAusencia = Number(req.body?.idAusencia);
  const estado = Number(req.body?.estado);
  const motivoRechazo = req.body?.motivoRechazo;

  if (!idEmpresa || !idAusencia || !estado) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  if (estado === 3 && !String(motivoRechazo || '').trim()) {
    return res.status(400).json({ error: 'El motivo del rechazo es obligatorio' });
  }

  try {
    const soportaAprobacion = await ausenciasSoportaAprobacion();
    if (!soportaAprobacion) {
      return res.status(503).json({ error: 'El flujo de aprobación no está disponible' });
    }

    const ausencia = await Ausencias.findOne({
      where: {
        empresa_id: idEmpresa,
        id_ausencia: idAusencia,
        fecha_baja: null,
      },
    });

    if (!ausencia) {
      return res.status(404).json({ error: 'Solicitud de ausencia no encontrada' });
    }

    if (ausencia.fecha_aceptacion || ausencia.fecha_cancelacion) {
      return res.status(409).json({ error: 'La solicitud ya fue resuelta' });
    }

    const ausenciaJson = ausencia.toJSON ? ausencia.toJSON() : ausencia;

    if (estado === 2 && esAusenciaVacaciones(ausenciaJson)) {
      const permiteVacaciones = await empresaTieneFeature(idEmpresa, 'vacaciones');
      const soportaSaldo = await vacacionesSoportaSaldo();
      if (permiteVacaciones && soportaSaldo) {
        try {
          await registrarConsumoPorAusencia(idEmpresa, ausenciaJson, idUsuarioGestor);
        } catch (error) {
          if (error.code === 'SALDO_VACACIONES_INSUFICIENTE') {
            return res.status(400).json({
              error: error.message,
              code: error.code,
              disponibles: error.disponibles,
              solicitados: error.solicitados,
            });
          }
          throw error;
        }
      }
    }

    const fechaActual = dayjs().tz('Europe/Madrid').toDate();
    const updateData = {
      id_usuario_gestor: idUsuarioGestor,
      notificacion_vista: false,
      ...(estado === 3
        ? {
          fecha_cancelacion: fechaActual,
          fecha_aceptacion: null,
          motivo_rechazo: String(motivoRechazo).trim(),
        }
        : {
          fecha_aceptacion: fechaActual,
          fecha_cancelacion: null,
          motivo_rechazo: null,
        }),
    };

    await Ausencias.update(updateData, {
      where: { empresa_id: idEmpresa, id_ausencia: idAusencia },
    });

    res.status(200).json({
      message: estado === 3 ? 'Solicitud rechazada' : 'Solicitud aprobada',
    });
  } catch (error) {
    console.error('Error al responder ausencia:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

const marcarAusenciasVistas = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idUsuario = Number(req.body?.idUsuario || req.user.id_usuario);

  if (!idEmpresa || !idUsuario) {
    return res.status(400).json({ error: 'Datos de usuario incompletos' });
  }

  try {
    const soportaAprobacion = await ausenciasSoportaAprobacion();
    if (!soportaAprobacion) {
      return res.status(200).json({ message: 'Sin cambios', actualizadas: 0 });
    }

    const [actualizadas] = await Ausencias.update(
      { notificacion_vista: true },
      {
        where: {
          empresa_id: idEmpresa,
          id_usuario: idUsuario,
          fecha_baja: null,
          notificacion_vista: false,
          [Op.or]: [
            { fecha_aceptacion: { [Op.ne]: null } },
            { fecha_cancelacion: { [Op.ne]: null } },
          ],
        },
      },
    );

    res.status(200).json({ message: 'Notificaciones marcadas como vistas', actualizadas });
  } catch (error) {
    console.error('Error al marcar ausencias vistas:', error);
    res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
};

module.exports = {
  getAusenciasByIdUsuario,
  crearAusencia,
  getAusenciasCalendario,
  getAusenciasListado,
  getAusenciasPendientesEmpresa,
  getHistorialAusenciasEmpresa,
  getAusenciasNotificacionesEmpleado,
  responderAusencia,
  marcarAusenciasVistas,
};
