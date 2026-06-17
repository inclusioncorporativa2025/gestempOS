const { Op } = require('sequelize');

const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');
const Ausencias = require('../models/Ausencias');

const Fichajes = require('../models/Fichajes');
const Peticiones = require('../models/Peticiones');
const Descansos = require('../models/Descansos');
const MesesCierre = require('../models/MesesCierre');
const { createConId } = require('../utils/empresaScope');
const { formatUbicacionStorage } = require('../utils/ubicacion');
const { getDireccionDesdeLatLng } = require('../utils/reverseGeocode');
const { TIPO_REGISTRO_A_EVENTO } = require('../utils/registroHash');
const { registrarEventoFichaje, verificarEventosMes } = require('../repositorios/fichajeRegistroEventosRepository');
const {getTipoRegistro} = require('./companyController');
const moment = require('moment-timezone');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const Usuario = require('../models/Usuario');
const UsuariosEmpresas = require('../models/UsuarioEmpresa');
const { ROLE_GROUPS, ROLES } = require('../middleware/authMiddleware');
const { enviarNotificacionGestion } = require('../utils/mailService');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const parseFechaRegistro = (valor) =>
  dayjs(valor, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);

const resolveIdEmpresa = (req) => {
  const fromBody = Number(req.body?.idEmpresa ?? req.body?.id_empresa);
  if (fromBody) return fromBody;
  const fromToken = Number(req.user?.id_empresa);
  return fromToken || null;
};

const esRootPlataforma = (req) => Number(req.user?.tipo_usuario) === ROLES.ROOT;

const isEmailValido = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

/** Gestores de la empresa + super-admins globales (tipo 1) con email válido. */
const obtenerEmailsGestoresEmpresa = async (idEmpresa) => {
  const usuariosEmpresa = await sequelize.query(
    'SELECT id_usuario FROM m_usuarios_empresas WHERE id_empresa = :idEmpresa AND fecha_baja IS NULL',
    {
      type: QueryTypes.SELECT,
      replacements: { idEmpresa },
    },
  );

  const usuariosIds = usuariosEmpresa.map((u) => Number(u.id_usuario));

  const [vinculados, rootsGlobales] = await Promise.all([
    usuariosIds.length
      ? Usuario.findAll({
          where: {
            id_usuario: { [Op.in]: usuariosIds },
            tipo_usuario: { [Op.in]: ROLE_GROUPS.COMPANY_STAFF },
            fecha_baja: null,
          },
          attributes: ['email'],
          raw: true,
        })
      : [],
    Usuario.findAll({
      where: {
        tipo_usuario: ROLES.ROOT,
        fecha_baja: null,
      },
      attributes: ['email'],
      raw: true,
    }),
  ]);

  const emails = [...vinculados, ...rootsGlobales]
    .map((u) => u.email)
    .filter(isEmailValido);

  return [...new Set(emails)];
};

const combinarFechaConHoraMadrid = (fechaBase, horaHHmm) => {
  const tz = 'Europe/Madrid';
  const base = dayjs(fechaBase).tz(tz);
  const [horas, minutos] = String(horaHHmm).split(':').map(Number);
  return dayjs
    .tz(
      `${base.format('YYYY-MM-DD')} ${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
      'YYYY-MM-DD HH:mm',
      tz,
    )
    .utc()
    .toDate();
};

const enriquecerPeticionesConDetalle = async (peticiones) => {
  if (!peticiones.length) return [];

  const peticionRows = peticiones.map((p) => (p.toJSON ? p.toJSON() : p));

  const fichajes = await Fichajes.findAll({
    where: {
      [Op.or]: peticionRows.map((p) => ({
        empresa_id: p.empresa_id,
        id_fichaje: p.id_fichaje,
      })),
    },
  });

  const usuarioIds = new Set();
  fichajes.forEach((f) => usuarioIds.add(f.id_usuario));
  peticionRows.forEach((p) => {
    if (p.id_usuario_peticion) usuarioIds.add(p.id_usuario_peticion);
    if (p.id_usuario_gestor) usuarioIds.add(p.id_usuario_gestor);
  });

  const usuarios = await Usuario.findAll({
    where: {
      id_usuario: { [Op.in]: [...usuarioIds] },
      fecha_baja: null,
    },
  });

  const fichajesMap = Object.fromEntries(
    fichajes.map((f) => [`${f.empresa_id}-${f.id_fichaje}`, f.toJSON()]),
  );
  const usuariosMap = Object.fromEntries(usuarios.map((u) => [u.id_usuario, u.toJSON()]));

  return peticionRows.map((peticion) => {
    const fichaje = fichajesMap[`${peticion.empresa_id}-${peticion.id_fichaje}`] || null;
    const solicitante = usuariosMap[peticion.id_usuario_peticion] || null;
    const gestor = peticion.id_usuario_gestor
      ? usuariosMap[peticion.id_usuario_gestor] || null
      : null;
    const empleado = fichaje ? usuariosMap[fichaje.id_usuario] || solicitante : solicitante;

    return {
      ...peticion,
      fichaje: fichaje
        ? { ...fichaje, usuario: empleado || null }
        : null,
      solicitante,
      gestor,
    };
  });
};

const getDatosUsuario = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;

  if (!idUsuario || !idEmpresa) {
    return res.status(400).json({ error: 'Error datos proporcionados' });
  }

  try {

    const info = await Fichajes.findAll({
        where :{ empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
        order: [
            ['fecha_alta', 'DESC']
          ]
    })

    res.status(200).json({
      info: info,
      tipoAccesos: []
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: 'Error obteniendo info fichajes' });
  }
};

const getDatosUsuarioById = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;

  if (!idUsuario || !idEmpresa) {
    return res.status(400).json({ error: 'Error: datos proporcionados incompletos' });
  }

  try {
    const [fichajes, ausencias, descansos] = await Promise.all([
      Fichajes.findAll({
        where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
        order: [['fecha_alta', 'DESC']]
      }),
      Ausencias.findAll({
        where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
        order: [['fecha_alta', 'DESC']]
      }),
      Descansos.findAll({
        where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
        order: [['fecha_alta', 'DESC']]
      })
    ]);

    const combinarFechaHora = (fecha, hora) => {
      if (!fecha) return null;

      const parsed = parseFechaRegistro(fecha);
      const fechaBase = parsed.isValid()
        ? parsed.format('YYYY-MM-DD')
        : dayjs(fecha).format('YYYY-MM-DD');

      if (!hora) {
        return `${fechaBase}T00:00:00`;
      }

      return `${fechaBase}T${hora}`;
    };

    const expandirRangoDias = (fechaDesde, fechaHasta) => {
      const dias = [];
      let actual = parseFechaRegistro(fechaDesde).startOf('day');
      const fin = parseFechaRegistro(fechaHasta).startOf('day');

      if (!actual.isValid() || !fin.isValid()) return [];

      while (actual.isSame(fin, 'day') || actual.isBefore(fin, 'day')) {
        dias.push(actual.format('YYYY-MM-DD'));
        actual = actual.add(1, 'day');
      }

      return dias;
    };

    const fichajesNormalizados = fichajes.map((f) => {
      const raw = f.toJSON();
      const entrada = raw.fecha_entrada
        ? dayjs(raw.fecha_entrada).tz('Europe/Madrid')
        : null;
      return {
        ...raw,
        tipo: 'fichaje',
        fecha_original: entrada ? entrada.format('YYYY-MM-DD') : null,
      };
    });

    const ausenciasNormalizadas = ausencias.flatMap(a => {
      const raw = a.toJSON();
      const dias = expandirRangoDias(raw.fecha_desde, raw.fecha_hasta);

      return dias.map(dia => ({
        ...raw,
        tipo: 'ausencia',
        fecha_entrada: combinarFechaHora(dia, raw.hora_ausencia_desde),
        fecha_salida: raw.hora_ausencia_hasta
          ? combinarFechaHora(dia, raw.hora_ausencia_hasta)
          : null,
        fecha_original: dia,
        sin_hora: !raw.hora_ausencia_desde && !raw.hora_ausencia_hasta
      }));
    });

    const descansosNormalizados = descansos.map(d => {
      const raw = d.toJSON();

      return {
        ...raw,
        tipo: 'descanso',
        fecha_entrada: raw.fecha_entrada || combinarFechaHora(raw.fecha_desde, raw.hora_descanso_desde),
        fecha_salida: raw.fecha_salida || (
          raw.hora_descanso_hasta
            ? combinarFechaHora(raw.fecha_hasta || raw.fecha_desde, raw.hora_descanso_hasta)
            : null
        )
      };
    });

    const registros = [
      ...fichajesNormalizados,
      ...ausenciasNormalizadas,
      ...descansosNormalizados,
    ].sort((a, b) => new Date(b.fecha_entrada) - new Date(a.fecha_entrada));

    res.status(200).json({ info: registros });

  } catch (error) {
    console.error('Error obteniendo info fichajes/ausencias/descansos:', error);
    return res.status(500).json({ error: 'Error obteniendo info fichajes/ausencias/descansos' });
  }
};

const getDatosUsuarioMes = async (req, res) => {
  const {idEmpresa, idUsuario , mes } = req.body;

  if (!idUsuario || !idEmpresa || !mes) {
    return res.status(400).json({ error: 'Error datos proporcionados' });
  }

  try {
    const inicioMes = dayjs(mes + '-01').startOf('month').toDate();
    const finMes = dayjs(mes + '-01').endOf('month').toDate();

    const info = await Fichajes.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario: idUsuario,
        fecha_baja: null,
        fecha_entrada: {
          [Op.between]: [inicioMes, finMes],
        },
      },
      order: [['fecha_alta', 'DESC']],
    });

    const auditoria = await verificarEventosMes(idEmpresa, idUsuario, mes);

    res.status(200).json({
      info,
      eventos: auditoria.eventos,
      integridad: auditoria.integridad,
      hashRaiz: auditoria.hashRaiz,
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: 'Error obteniendo info fichajes' });
  }
};

const responderPeticionCierre = async (req, res) => {
  const { idEmpresa, peticion, estado ,idUsuario} = req.body;

  if (!idEmpresa || !peticion || !estado) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
    const updateData = {};
    if (estado === 2) {
      updateData.fecha_aceptacion = dayjs().toDate();
      updateData.fecha_cancelacion = null;
      updateData.usuario_aceptacion =idUsuario;
      updateData.usuario_cancelacion =null;

    } else if (estado === 3) {
      updateData.fecha_cancelacion = dayjs().toDate();
      updateData.fecha_aceptacion = null;
      updateData.usuario_cancelacion =idUsuario;
      updateData.usuario_aceptacion = null;

    } else {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const [updated] = await MesesCierre.update(updateData, {
      where: {
        empresa_id: idEmpresa,
        id_mes_cierre: peticion.id_mes_cierre
      }
    });

    if (updated === 0) {
      return res.status(404).json({ error: 'No se encontró la petición para actualizar' });
    }

    return res.status(200).json({ message: 'Cierre mensual actualizado correctamente' });
  } catch (error) {
    console.error('Error respondiendo petición cierre:', error);
    return res.status(500).json({ error: 'Error procesando petición cierre' });
  }
};

const getUltimoRegistroVivo = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;

  if (!idUsuario || !idEmpresa) {
    return res.status(400).json({ error: 'Error datos proporcionados' });
  }

  try {

    const info = await Fichajes.findOne({
      where: { empresa_id: idEmpresa, id_usuario: idUsuario },
      order: [['fecha_alta', 'DESC']],
  });

    res.status(200).json({
      message: 'Login exitoso',
      info: info,
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: 'Error obteniendo info fichajes' });
  }
};

const crearRegistro = async (req, res) => {
  const { idUsuario, idEmpresa, tipoRegistro, ubicacion, fecha, usuarioAccion } = req.body;

  try {
    if (!idUsuario || !idEmpresa || !tipoRegistro || !fecha) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const tipoEvento = TIPO_REGISTRO_A_EVENTO[tipoRegistro];
    if (!tipoEvento) {
      return res.status(400).json({ error: 'Tipo de registro no válido' });
    }

    const ubicacionSt = formatUbicacionStorage(ubicacion) || '';

    const ultimoRegistro = await getUltimoRegistro(idUsuario, idEmpresa);
    const ultimoDescanso = await getUltimoDescanso(idUsuario, idEmpresa);

    await sequelize.transaction(async (transaction) => {
      let idFichajeRef = null;
      let idDescansoRef = null;

      if ((!ultimoRegistro || ultimoRegistro.dataValues.fecha_salida != null) && tipoRegistro === 1) {
        const fichaje = await createConId(Fichajes, idEmpresa, 'id_fichaje', {
          id_usuario: idUsuario,
          fecha_alta: fecha,
          ubicacion_entrada: ubicacionSt,
          fecha_entrada: fecha,
          usuario_alta: usuarioAccion,
        }, transaction);
        idFichajeRef = fichaje.id_fichaje;
      } else if (tipoRegistro === 2) {
        if (!ultimoRegistro || ultimoRegistro.dataValues.fecha_salida != null) {
          throw new Error('No hay fichaje abierto para registrar salida');
        }
        idFichajeRef = ultimoRegistro.dataValues.id_fichaje;
        await Fichajes.update({
          fecha_salida: fecha,
          ubicacion_salida: ubicacionSt,
        }, {
          where: { empresa_id: idEmpresa, id_fichaje: idFichajeRef },
          transaction,
        });
      } else if (tipoRegistro === 3) {
        const descanso = await createConId(Descansos, idEmpresa, 'id_descanso', {
          id_usuario: idUsuario,
          fecha_entrada: fecha,
          ubicacion_entrada: ubicacionSt,
          fecha_alta: fecha,
          usuario_alta: usuarioAccion,
        }, transaction);
        idDescansoRef = descanso.id_descanso;
      } else if (tipoRegistro === 4) {
        if (!ultimoDescanso) {
          throw new Error('No hay descanso abierto para registrar fin de pausa');
        }
        idDescansoRef = ultimoDescanso.id_descanso;
        await Descansos.update({
          fecha_salida: fecha,
          ubicacion_salida: ubicacionSt,
        }, {
          where: { empresa_id: idEmpresa, id_descanso: idDescansoRef },
          transaction,
        });
      } else {
        throw new Error('Error creando registro');
      }

      await registrarEventoFichaje({
        empresaId: idEmpresa,
        idUsuario,
        tipo: tipoEvento,
        fechaInput: fecha,
        ubicacion: ubicacionSt,
        idFichaje: idFichajeRef,
        idDescanso: idDescansoRef,
        usuarioAlta: usuarioAccion,
        transaction,
      });
    });

    res.status(200).json({ message: 'Registro exitoso' });
  } catch (error) {
    console.error('Error creando registro:', error);
    res.status(500).json({ error: error.message || 'Error creando registro' });
  }
};

const getUltimoRegistro= async (idUsuario, idEmpresa) => {

  try{
    const info = await Fichajes.findOne({
      where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
      order: [['fecha_alta', 'DESC']],
    });

    return info;

  }catch(error){
   console.error(error);
  }

}

const getUltimoDescanso= async (idUsuario, idEmpresa) => {

  try{
    const descanso = await Descansos.findOne({
      where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_salida: null },
      order: [['fecha_entrada', 'DESC']],
    });
    return descanso;

  }catch(error){
   console.error(error);
  }

}

const getTipoRegistroByIdUsuario = async (req, res)=> {

  try {
      const { esquema, idUsuario } = req.body;
      const idEmpresa = req.body.idEmpresa || parseInt(String(esquema || '').replace('empresa', ''), 10);

      const ultimoRegistro = await getUltimoRegistro(idUsuario, idEmpresa);

      const descanso = await getUltimoDescanso(idUsuario, idEmpresa);

      var tipo = 0;
      if (ultimoRegistro!= null && ultimoRegistro.dataValues.fecha_salida == null){
        tipo= 1
      }

      // La tabla `tipo_acceso` no existe en el modelo MySQL: lista vacía.
      const tiposAcceso = [];

      res.status(200).json({ message: 'Datos recuperados correctamente',tiposAcceso });
  } catch (error) {
      console.error('Error al obtener tipos de acceso:', error);
      res.status(500).json({ error: 'Error al obtener tipos de acceso' });
  }

};

const deleteRegistro = async (req, res)=> {

  try {
      const { idRegistro, idEmpresa, fecha, usuarioAccion } = req.body;
      const idFichaje = String(idRegistro).replace(/^fichaje-/, '');

      if (!idFichaje || !idEmpresa) {
        return res.status(400).json({ error: 'Faltan datos para eliminar el fichaje' });
      }

      const [filasActualizadas] = await Fichajes.update(
        {
            fecha_baja: fecha,
            usuario_baja: usuarioAccion
        },
        {
            where: { empresa_id: idEmpresa, id_fichaje: idFichaje, fecha_baja: null }
        }
    );

      if (filasActualizadas === 0) {
        return res.status(404).json({ error: 'Fichaje no encontrado o ya eliminado' });
      }

      res.status(200).json({ message: 'Fichaje eliminado correctamente', filasActualizadas });
  } catch (error) {
      console.error('Error al eliminar fichaje:', error);
      res.status(500).json({ error: 'Error al eliminar el fichaje' });
  }
};

const crearPeticionEdicion = async (req, res) => {
  try {
    const { idUsuario, idEmpresa, values } = req.body;
    const fechaConOffset = new Date();

    const fichaje = await Fichajes.findOne({
      where: {
        empresa_id: idEmpresa,
        id_fichaje: values.id_fichaje,
        fecha_baja: null,
      },
    });

    if (!fichaje) {
      return res.status(404).json({ error: 'Fichaje no encontrado' });
    }

    const entrada_original = fichaje.fecha_entrada;
    const salida_original = fichaje.fecha_salida || fichaje.fecha_entrada;

    const nueva_entrada = combinarFechaConHoraMadrid(entrada_original, values.hora_entrada);
    const nueva_salida = combinarFechaConHoraMadrid(salida_original, values.hora_salida);

    const info = await createConId(Peticiones, idEmpresa, 'id_peticion', {
      id_usuario_peticion: idUsuario,
      fecha_alta: fechaConOffset,
      id_fichaje: values.id_fichaje,
      nueva_entrada,
      nueva_salida,
      entrada_original,
      salida_original,
      justificacion: values.justificacion,
    });

    const usuarios = await Usuario.findOne({
      where: { id_usuario: idUsuario },
      attributes: ['id_usuario', 'nombre', 'dni'],
      raw: true,
    });

    const destinatarios = await obtenerEmailsGestoresEmpresa(idEmpresa);
    console.log(
      `[crearPeticionEdicion] empresa=${idEmpresa} destinatarios=${destinatarios.length}`,
      destinatarios,
    );

    try {
      await enviarNotificacionGestion({
        destinatarios,
        tipo: 'modificacion_horario',
        nombreSolicitante: usuarios?.nombre,
      });
    } catch (mailError) {
      console.error('[crearPeticionEdicion] Error enviando correo:', mailError.message);
    }

    res.status(200).json({
      message: 'Petición creada',
      info,
      notificacionEnviada: destinatarios.length > 0,
    });
  } catch (error) {
    console.error('Error al crear petición:', error);
    res.status(500).json({ error: 'Error al crear petición' });
  }
};

const crearPeticionCierreMes = async (req, res) => {
  try {
    const { idUsuario, idEmpresa, mes } = req.body;

    const mesFormateado = moment(mes, ['MM/YYYY', 'YYYY-MM', moment.ISO_8601], true).isValid()
      ? moment(mes, ['MM/YYYY', 'YYYY-MM', moment.ISO_8601]).format('YYYY-MM')
      : null;

    if (!mesFormateado) {
      return res.status(400).json({ error: 'Formato de mes inválido' });
    }

    const info = await createConId(MesesCierre, idEmpresa, 'id_mes_cierre', {
      usuario_alta: idUsuario,
      mes: mesFormateado,
      fecha_alta: new Date(),
    });

    const usuarios = await Usuario.findOne({
      where: { id_usuario: idUsuario },
      attributes: ['id_usuario', 'nombre', 'dni'],
      raw: true,
    });

    const destinatarios = await obtenerEmailsGestoresEmpresa(idEmpresa);
    console.log(
      `[crearPeticionCierreMes] empresa=${idEmpresa} destinatarios=${destinatarios.length}`,
      destinatarios,
    );

    try {
      await enviarNotificacionGestion({
        destinatarios,
        tipo: 'cierre_jornada',
        nombreSolicitante: usuarios?.nombre,
        mesCierre: mesFormateado,
      });
    } catch (mailError) {
      console.error('[crearPeticionCierreMes] Error enviando correo:', mailError.message);
    }

    res.status(200).json({
      message: 'Petición creada',
      info,
      notificacionEnviada: destinatarios.length > 0,
    });
  } catch (error) {
    console.error('Error al crear petición:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getPeticionesByIdEmpresa = async (req, res) => {
  const esRoot = esRootPlataforma(req);
  const idEmpresa = resolveIdEmpresa(req);

  if (!esRoot && !idEmpresa) {
    return res.status(400).json({ error: 'Empresa no indicada' });
  }

  try {

    const peticiones = await Peticiones.findAll({
      where: {
        fecha_aceptacion: null,
        fecha_cancelacion: null,
        ...(esRoot ? {} : { empresa_id: idEmpresa }),
      },
      order: [['fecha_alta', 'DESC']]
    });

    if (peticiones.length === 0) {
      return res.status(200).json({ message: 'Peticiones recuperadas', data: [] });
    }

    const resultado = await enriquecerPeticionesConDetalle(peticiones);

    res.status(200).json({ message: 'Peticiones recuperadas', data: resultado });
  } catch (error) {
    console.error('Error al recuperar peticion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getHistorialEdicionesHorario = async (req, res) => {
  const esRoot = esRootPlataforma(req);
  const idEmpresa = resolveIdEmpresa(req);
  const idUsuario = req.body?.idUsuario;

  if (!esRoot && !idEmpresa) {
    return res.status(400).json({ error: 'Empresa no indicada' });
  }

  try {
    const where = {
      [Op.or]: [
        { fecha_aceptacion: { [Op.ne]: null } },
        { fecha_cancelacion: { [Op.ne]: null } },
      ],
      ...(esRoot ? {} : { empresa_id: idEmpresa }),
      ...(idUsuario ? { id_usuario_peticion: idUsuario } : {}),
    };

    const peticiones = await Peticiones.findAll({
      where,
      order: [['fecha_alta', 'DESC']],
    });

    const data = await enriquecerPeticionesConDetalle(peticiones);

    res.status(200).json({ message: 'Historial recuperado', data });
  } catch (error) {
    console.error('Error al recuperar historial de ediciones:', error);
    res.status(500).json({ error: 'Error al recuperar historial' });
  }
};

const responderPeticion = async (req, res) => {
  const { idEmpresa, idUsuario, idPeticion, estado, motivoRechazo } = req.body;

  try {
    const fechaActual = dayjs().tz('Europe/Madrid').toDate();

    if (estado === 3 && !String(motivoRechazo || '').trim()) {
      return res.status(400).json({ error: 'El motivo del rechazo es obligatorio' });
    }

    const updateData = {
      id_usuario_gestor: idUsuario,
      notificacion_vista: false,
      ...(estado === 3
        ? {
          fecha_cancelacion: fechaActual,
          motivo_rechazo: String(motivoRechazo).trim(),
        }
        : {
          fecha_aceptacion: fechaActual,
          motivo_rechazo: null,
        }),
    };

    const info = await Peticiones.update(updateData, {
      where: { empresa_id: idEmpresa, id_peticion: idPeticion }
    });

    res.status(200).json({ message: 'Petición actualizada', info });

  } catch (error) {
    console.error('Error al recuperar petición:', error);
    res.status(500).json({ error: 'Error' });
  }
};

const countNotificacionesEmpleado = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;

  if (!idUsuario || !idEmpresa) {
    return res.status(400).json({ error: 'Datos de usuario incompletos' });
  }

  try {
    const total = await Peticiones.count({
      where: {
        empresa_id: idEmpresa,
        id_usuario_peticion: idUsuario,
        notificacion_vista: false,
        [Op.or]: [
          { fecha_aceptacion: { [Op.ne]: null } },
          { fecha_cancelacion: { [Op.ne]: null } },
        ],
      },
    });

    res.status(200).json({ total });
  } catch (error) {
    console.error('Error al contar notificaciones del empleado:', error);
    res.status(500).json({ error: 'Error al contar notificaciones' });
  }
};

const marcarPeticionesVistas = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;

  if (!idUsuario || !idEmpresa) {
    return res.status(400).json({ error: 'Datos de usuario incompletos' });
  }

  try {
    const [actualizadas] = await Peticiones.update(
      { notificacion_vista: true },
      {
        where: {
          empresa_id: idEmpresa,
          id_usuario_peticion: idUsuario,
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
    console.error('Error al marcar peticiones vistas:', error);
    res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
};

const getPeticionesByIdUsuario = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;

  try {

    const peticiones = await Peticiones.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario_peticion: idUsuario,
        fecha_aceptacion: null,
        fecha_cancelacion: null,
      },
      order: [['fecha_alta', 'DESC']],
      raw: true,
    });

    const historialEdiciones = await Peticiones.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario_peticion: idUsuario,
        [Op.or]: [
          { fecha_aceptacion: { [Op.ne]: null } },
          { fecha_cancelacion: { [Op.ne]: null } },
        ],
      },
      order: [['fecha_alta', 'DESC']],
      raw: true,
    });

    const mesesCierre = await MesesCierre.findAll({
      where: {
        empresa_id: idEmpresa,
        usuario_alta: idUsuario,
        fecha_baja: null,
        usuario_cancelacion:null
      },
      order: [['fecha_alta', 'DESC']],
      raw: true,
    });

    res.status(200).json({
      message: 'Peticiones y meses cierre recuperados',
      peticiones,
      historialEdiciones,
      mesesCierre,
    });

  } catch (error) {
    console.error('Error al recuperar peticiones o meses cierre:', error);
    res.status(500).json({ error: 'Error al recuperar datos' });
  }
};

const getUltimoRegistroById= async (req, res) => {
  const {esquema, idUsuario}  = req.body;
  const idEmpresa = req.body.idEmpresa || parseInt(String(esquema || '').replace('empresa', ''), 10);

  try{
    const info = await Fichajes.findOne({
      where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
      order: [['fecha_entrada', 'DESC']],
    });

    const descanso = await Descansos.findOne({
      where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_salida: null },
      order: [['fecha_entrada', 'DESC']],
    });

    res.status(200).json({ message: 'Datos recuperados correctamente',info,descanso });

  }catch(error){
    console.error('Error al obtener tipos de acceso:', error);
    res.status(500).json({ error: 'Error getUltimoRegistroById' });  }

}

const getHorasTrabajadasHoy = async (req, res)=> {
  const {idEmpresa, usuarioAccion}  = req.body;

  const { Op } = require('sequelize');
  const moment = require('moment');

  try {

      const hoy = moment().startOf('day').toDate();

      const registros = await Fichajes.findAll({
          where: {
              empresa_id: idEmpresa,
              id_usuario: usuarioAccion,
              fecha_baja: null,
              fecha_entrada: {
                  [Op.gte]: hoy
              },
          }
      });

      const totalHoras = registros.reduce((acumulador, registro) => {
          const fechaAlta = moment(registro.fecha_entrada);
          const fechaBaja = moment(registro.fecha_salida);

          if (fechaBaja && fechaAlta && fechaBaja.isValid() && fechaAlta.isValid()) {
              const duracion = moment.duration(fechaBaja.diff(fechaAlta));
              return acumulador.add(duracion);
          }else if(fechaBaja && fechaAlta && !fechaBaja.isValid() && fechaAlta.isValid()){
            const duracion = moment.duration(moment().subtract(1, 'hours').diff(fechaAlta));
            return acumulador.add(duracion);
          }

          return acumulador;
      }, moment.duration(0));

      const horasTotales = [
          String(Math.floor(totalHoras.asHours())).padStart(2, '0'),
          String(totalHoras.minutes()).padStart(2, '0'),
          String(totalHoras.seconds()).padStart(2, '0'),
      ].join(':');

      res.status(200).json({ message: 'Datos recuperados correctamente',horasTotales });

  } catch (error) {
  console.error('Error al calcular las horas trabajadas:', error);
  res.status(500).json({ error: 'Error al calcular las horas trabajadas' });
}
};

const editarHoras = async (req, res) => {
  try {
    const { id_fichaje,
      id_usuario_gestor, id_peticion } = req.body.values;
    const idEmpresa = req.body.idEmpresa
    const fecha = new Date().getTime() ;

    const peticiones = await Peticiones.findAll({
      where: { empresa_id: idEmpresa, id_peticion }
    });

    if (!peticiones || peticiones.length === 0) {
      throw new Error('Petición no encontrada');
    }

    const peticion = peticiones[0];

    const horaEntrada = peticion.nueva_entrada;
    const horaSalida = peticion.nueva_salida;
    const origEntrada = peticion.entrada_original;
    const origSalida = peticion.salida_original;

    const result = await sequelize.transaction(async (transaction) => {
      const [filas] = await Fichajes.update(
        {
          fecha_entrada: horaEntrada,
          fecha_salida: horaSalida,
          fecha_modificacion: fecha,
          usuario_modificacion: id_usuario_gestor,
        },
        {
          where: { empresa_id: idEmpresa, id_fichaje },
          transaction,
        }
      );

      await registrarEventoFichaje({
        empresaId: idEmpresa,
        idUsuario: peticion.id_usuario_peticion,
        tipo: 'edicion_autorizada',
        fechaInput: horaEntrada,
        observaciones: [
          `id_peticion=${id_peticion}`,
          `orig_entrada=${origEntrada ? dayjs(origEntrada).toISOString() : 'null'}`,
          `orig_salida=${origSalida ? dayjs(origSalida).toISOString() : 'null'}`,
          `nueva_entrada=${dayjs(horaEntrada).toISOString()}`,
          `nueva_salida=${dayjs(horaSalida).toISOString()}`,
        ].join(';'),
        idFichaje: id_fichaje,
        usuarioAlta: id_usuario_gestor,
        transaction,
      });

      return filas;
    });

    res.status(200).json({ message: 'Datos actualizados correctamente', result });
  } catch (error) {
    console.error('Error al actualizar tipos de acceso:', error);
    res.status(500).json({ error: 'Error al actualizar tipos de acceso' });
  }
};
const countNotificacionesPendientes = async (req, res) => {
  const esRoot = esRootPlataforma(req);
  const idEmpresa = resolveIdEmpresa(req);

  if (!esRoot && !idEmpresa) {
    return res.status(400).json({ error: 'Empresa no indicada' });
  }

  try {
    const filtroEmpresa = esRoot ? {} : { empresa_id: idEmpresa };

    const [correcciones, cierres] = await Promise.all([
      Peticiones.count({
        where: {
          ...filtroEmpresa,
          fecha_aceptacion: null,
          fecha_cancelacion: null,
        },
      }),
      MesesCierre.count({
        where: {
          ...filtroEmpresa,
          fecha_baja: null,
          fecha_aceptacion: null,
          fecha_cancelacion: null,
        },
      }),
    ]);

    res.status(200).json({ correcciones, cierres, total: correcciones + cierres });
  } catch (error) {
    console.error('Error al contar notificaciones pendientes:', error);
    res.status(500).json({ error: 'Error al contar notificaciones pendientes' });
  }
};

const getCierresMensualesByIdEmpresa = async (req, res) => {
  const esRoot = esRootPlataforma(req);
  const idEmpresa = resolveIdEmpresa(req);

  if (!esRoot && !idEmpresa) {
    return res.status(400).json({ error: 'Empresa no indicada' });
  }

  try {

    const meses = await MesesCierre.findAll({
      where: {
        fecha_baja: null,
        fecha_aceptacion: null,
        fecha_cancelacion: null,
        ...(esRoot ? {} : { empresa_id: idEmpresa }),
      },
      order: [['fecha_alta', 'DESC']],
      raw: true,
    });

    const userIds = [...new Set(meses.map(m => m.usuario_alta))];

    const usuarios = await Usuario.findAll({
      where: { id_usuario: userIds },
      attributes: ['id_usuario', 'nombre','dni'],
      raw: true,
    });

const mapUsuarios = {};
usuarios.forEach(usuario => {
  mapUsuarios[usuario.id_usuario] = {
    nombre: usuario.nombre,
    dni: usuario.dni
  };
});

const infoConNombre = meses.map(m => {
  const usuario = mapUsuarios[m.usuario_alta] || {};
  return {
    ...m,
    nombre_usuario_alta: usuario.nombre || 'Desconocido',
    dni_usuario_alta: usuario.dni || 'Desconocido'
  };
});

    res.status(200).json({ message: 'Peticiones recuperadas', info: infoConNombre });

  } catch (error) {
    console.error('Error al recuperar peticiones:', error);
    res.status(500).json({ error: 'Error al recuperar datos' });
  }
};

const reverseGeocode = async (req, res) => {
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Coordenadas inválidas' });
  }

  try {
    const direccion = await getDireccionDesdeLatLng(lat, lng);
    return res.status(200).json({ direccion });
  } catch (error) {
    console.error('Error en reverseGeocode:', error.message);
    return res.status(500).json({ error: 'No se pudo obtener la dirección' });
  }
};

const resolverEstadoJornada = (fichajeAbierto, descansoAbierto) => {
  if (fichajeAbierto && descansoAbierto) return 'break';
  if (fichajeAbierto) return 'in';
  return 'out';
};

const getEstadoPersonalEmpresa = async (req, res) => {
  const { idEmpresa } = req.body;

  if (!idEmpresa) {
    return res.status(400).json({ error: 'idEmpresa requerido' });
  }

  try {
    const vinculos = await UsuariosEmpresas.findAll({
      where: { id_empresa: idEmpresa, fecha_baja: null },
      attributes: ['id_usuario'],
    });

    const idsVinculados = vinculos.map((v) => v.id_usuario);

    if (!idsVinculados.length) {
      return res.status(200).json({
        personal: [],
        resumen: { trabajando: 0, descanso: 0, fuera: 0, total: 0 },
      });
    }

    const usuarios = await Usuario.findAll({
      where: {
        id_usuario: { [Op.in]: idsVinculados },
        fecha_baja: null,
        activo: true,
        tipo_usuario: { [Op.in]: [3, 4, 5] },
      },
      attributes: ['id_usuario', 'nombre', 'email', 'tipo_usuario'],
    });

    const userIds = usuarios.map((u) => u.id_usuario);

    if (!userIds.length) {
      return res.status(200).json({
        personal: [],
        resumen: { trabajando: 0, descanso: 0, fuera: 0, total: 0 },
      });
    }

    const fichajesAbiertos = await Fichajes.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario: { [Op.in]: userIds },
        fecha_baja: null,
        fecha_salida: null,
      },
      order: [['fecha_entrada', 'DESC']],
    });

    const descansosAbiertos = await Descansos.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario: { [Op.in]: userIds },
        fecha_salida: null,
      },
      order: [['fecha_entrada', 'DESC']],
    });

    const tz = 'Europe/Madrid';
    const inicioDia = dayjs().tz(tz).startOf('day').toDate();
    const finDia = dayjs().tz(tz).endOf('day').toDate();

    const fichajesHoy = await Fichajes.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario: { [Op.in]: userIds },
        fecha_baja: null,
        fecha_entrada: { [Op.between]: [inicioDia, finDia] },
      },
      order: [['fecha_entrada', 'ASC']],
    });

    const descansosHoy = await Descansos.findAll({
      where: {
        empresa_id: idEmpresa,
        id_usuario: { [Op.in]: userIds },
        fecha_baja: null,
        fecha_entrada: { [Op.between]: [inicioDia, finDia] },
      },
    });

    const fichajesHoyPorUsuario = {};
    fichajesHoy.forEach((f) => {
      if (!fichajesHoyPorUsuario[f.id_usuario]) {
        fichajesHoyPorUsuario[f.id_usuario] = [];
      }
      fichajesHoyPorUsuario[f.id_usuario].push(f);
    });

    const pausasPorUsuario = {};
    descansosHoy.forEach((d) => {
      pausasPorUsuario[d.id_usuario] = (pausasPorUsuario[d.id_usuario] || 0) + 1;
    });

    const fichajePorUsuario = {};
    fichajesAbiertos.forEach((f) => {
      if (!fichajePorUsuario[f.id_usuario]) {
        fichajePorUsuario[f.id_usuario] = f;
      }
    });

    const descansoPorUsuario = {};
    descansosAbiertos.forEach((d) => {
      if (!descansoPorUsuario[d.id_usuario]) {
        descansoPorUsuario[d.id_usuario] = d;
      }
    });

    const personal = usuarios.map((u) => {
      const fichaje = fichajePorUsuario[u.id_usuario] || null;
      const descanso = descansoPorUsuario[u.id_usuario] || null;
      const estado = resolverEstadoJornada(fichaje, descanso);

      let fechaEntradaJornada = fichaje?.fecha_entrada || null;
      let fechaSalidaJornada = fichaje?.fecha_salida || null;

      if (!fichaje) {
        const fichajesUsuarioHoy = fichajesHoyPorUsuario[u.id_usuario] || [];
        const ultimoFichajeHoy = fichajesUsuarioHoy[fichajesUsuarioHoy.length - 1] || null;
        fechaEntradaJornada = ultimoFichajeHoy?.fecha_entrada || null;
        fechaSalidaJornada = ultimoFichajeHoy?.fecha_salida || null;
      }

      return {
        id_usuario: u.id_usuario,
        nombre: u.nombre,
        email: u.email,
        tipo_usuario: u.tipo_usuario,
        estado,
        fecha_entrada: fechaEntradaJornada,
        fecha_salida: fechaSalidaJornada,
        fecha_descanso: descanso?.fecha_entrada || null,
        num_pausas: pausasPorUsuario[u.id_usuario] || 0,
      };
    });

    const ordenEstado = { in: 0, break: 1, out: 2 };
    personal.sort((a, b) => {
      const diff = ordenEstado[a.estado] - ordenEstado[b.estado];
      if (diff !== 0) return diff;
      return (a.nombre || '').localeCompare(b.nombre || '', 'es');
    });

    const resumen = {
      trabajando: personal.filter((p) => p.estado === 'in').length,
      descanso: personal.filter((p) => p.estado === 'break').length,
      fuera: personal.filter((p) => p.estado === 'out').length,
      total: personal.length,
    };

    res.status(200).json({ personal, resumen });
  } catch (error) {
    console.error('Error getEstadoPersonalEmpresa:', error);
    res.status(500).json({ error: 'Error al obtener el estado del personal' });
  }
};

module.exports = {
    getDatosUsuario,
    crearRegistro,
    reverseGeocode,
    getTipoRegistroByIdUsuario,
    deleteRegistro,
    getHorasTrabajadasHoy,
    editarHoras,
    getDatosUsuarioById,
    getUltimoRegistroById,
    crearPeticionEdicion,
    getPeticionesByIdEmpresa,
    getPeticionesByIdUsuario,
    responderPeticion,
    crearPeticionCierreMes,
    getCierresMensualesByIdEmpresa,
    getDatosUsuarioMes,
    responderPeticionCierre,
    getEstadoPersonalEmpresa,
  countNotificacionesPendientes,
  countNotificacionesEmpleado,
  marcarPeticionesVistas,
  getHistorialEdicionesHorario,

  };
