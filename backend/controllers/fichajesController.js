const { Op } = require('sequelize');

const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');
const Ausencias = require('../models/Ausencias');

const Fichajes = require('../models/Fichajes');
const TipoAcceso = require('../models/TipoAcceso');
const Peticiones = require('../models/Peticiones');
const Descansos = require('../models/Descansos');
const MesesCierre = require('../models/MesesCierre');
const nodemailer = require('nodemailer');
const path = require('path');
const {getTipoRegistro} = require('./companyController');
const moment = require('moment-timezone');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
const Usuario = require('../models/Usuario');
dayjs.extend(utc);
dayjs.extend(timezone);

const getDatosUsuario = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;

  if (!idUsuario || !idEmpresa) {
    return res.status(400).json({ error: 'Error datos proporcionados' });
  }

  try {

    const esquema = 'empresa'+idEmpresa;
    const info = await Fichajes.schema(esquema).findAll({
        where :{id_usuario: idUsuario,fecha_baja: null},
        order: [
            ['fecha_alta', 'DESC']
          ]
    })

    const tipoAccesos = await TipoAcceso.schema(esquema).findAll({
      where :{fecha_baja: null},
      order: [
          ['fecha_alta', 'DESC']
        ]
  })

    res.status(200).json({
      info: info,
      tipoAccesos: tipoAccesos
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
    const esquema = 'empresa' + idEmpresa;

    const [fichajes, ausencias, descansos] = await Promise.all([
      Fichajes.schema(esquema).findAll({
        where: { id_usuario: idUsuario, fecha_baja: null },
        order: [['fecha_alta', 'DESC']]
      }),
      Ausencias.schema(esquema).findAll({
        where: { id_usuario: idUsuario, fecha_baja: null },
        order: [['fecha_alta', 'DESC']]
      }),
      Descansos.schema(esquema).findAll({
        where: { id_usuario: idUsuario, fecha_baja: null },
        order: [['fecha_alta', 'DESC']]
      })
    ]);

    const combinarFechaHora = (fecha, hora) => {
      if (!fecha) return null;

      const fechaBase = dayjs(fecha).format('YYYY-MM-DD');

      if (!hora) {
        return `${fechaBase}T00:00:00`;
      }

      return `${fechaBase}T${hora}`;
    };

    const expandirRangoDias = (fechaDesde, fechaHasta) => {
      const dias = [];
      let actual = dayjs(fechaDesde).startOf('day');
      const fin = dayjs(fechaHasta).startOf('day');

      while (actual.isSame(fin) || actual.isBefore(fin)) {
        dias.push(actual.format('YYYY-MM-DD'));
        actual = actual.add(1, 'day');
      }

      return dias;
    };

    const fichajesNormalizados = fichajes.map(f => ({
      ...f.toJSON(),
      tipo: 'fichaje'
    }));

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
    const esquema = 'empresa' + idEmpresa;

    const inicioMes = dayjs(mes + '-01').startOf('month').toDate();
    const finMes = dayjs(mes + '-01').endOf('month').toDate();

    const info = await Fichajes.schema(esquema).findAll({
      where: {
        id_usuario: idUsuario,
        fecha_baja: null,
        fecha_entrada: {
          [Op.between]: [inicioMes, finMes],
        },
      },
      order: [['fecha_alta', 'DESC']],
    });

    res.status(200).json({
      info,
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
    const esquema = 'empresa' + idEmpresa;

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

    const [updated] = await MesesCierre.schema(esquema).update(updateData, {
      where: {
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

    const esquema = 'empresa'+idEmpresa;
    const info = await Fichajes.schema(esquema).find({
      where: { id_usuario: idUsuario },
      order: [['fecha_alta', 'DESC']],
      limit: 1
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

    const ubicacionSt = `${ubicacion.latitude}-${ubicacion.longitude}`;
    const esquema = 'empresa' + idEmpresa;

    const ultimoRegistro = await getUltimoRegistro(idUsuario, esquema);
    const ultimoDescanso = await getUltimoDescanso(idUsuario, esquema);

    if ((!ultimoRegistro || ultimoRegistro.dataValues.fecha_salida != null) && tipoRegistro===1) {
      await Fichajes.schema(esquema).create({
        id_usuario: idUsuario,
        fecha_alta: fecha,
        ubicacion_entrada: ubicacionSt,
        fecha_entrada: fecha,
        usuario_alta: usuarioAccion,
        tipo_entrada: tipoRegistro,
      });
    } else if (tipoRegistro === 2){
      await Fichajes.schema(esquema).update({
        fecha_salida: fecha,
        ubicacion_salida: ubicacionSt,
        tipo_salida: tipoRegistro,
      }, {
        where: { id_fichaje: ultimoRegistro.dataValues.id_fichaje },
      });
    } else if (tipoRegistro === 3){
      await Descansos.schema(esquema).create({
        id_usuario: idUsuario,
        fecha_entrada: fecha,
        ubicacion_entrada: ubicacionSt,
        fecha_alta: fecha,
        usuario_alta: usuarioAccion,

      });
    } else if (tipoRegistro === 4){
      await Descansos.schema(esquema).update({
        fecha_salida: fecha,
        ubicacion_salida: ubicacionSt,
      }, {
        where: { id_descanso : ultimoDescanso.id_descanso  },
      });
    }else{
      res.status(500).json({ error: 'Error creando registro' });
      return;
    }

    res.status(200).json({ message: 'Registro exitoso' });

  } catch (error) {
    console.error('Error creando registro:', error);
    res.status(500).json({ error: 'Error creando registro' });
  }
};

const getUltimoRegistro= async (idUsuario,esquema) => {

  try{
    const info = await Fichajes.schema(esquema).findOne({
      where: { id_usuario: idUsuario, fecha_baja: null },
      order: [['fecha_alta', 'DESC']],
    });

    return info;

  }catch(error){
   console.error(error);
  }

}

const getUltimoDescanso= async (idUsuario,esquema) => {

  try{
    const descanso = await Descansos.schema(esquema).findOne({
      where: { id_usuario: idUsuario, fecha_salida: null },
      order: [['fecha_entrada', 'DESC']],
    });
    return descanso;

  }catch(error){
   console.error(error);
  }

}

const getTipoRegistroByIdUsuario = async (req, res)=> {

  try {
      const {esquema,idUsuario}  = req.body;

      const ultimoRegistro =await getUltimoRegistro(idUsuario,esquema);

      const descanso = await getUltimoDescanso (idUsuario,esquema);
      const tipoRegistros = await getTipoRegistro(req);
      var tipo = 0;
      if (ultimoRegistro!= null && ultimoRegistro.dataValues.fecha_salida == null){
        tipo= 1
      }

      var tiposAcceso = await TipoAcceso.schema(esquema).findAll({
          where: {
            fecha_baja: null,tipo, activo : true
          },
          order: [
              ['id_tipo_acceso', 'ASC']
            ]
        });

      res.status(200).json({ message: 'Datos recuperados correctamente',tiposAcceso });
  } catch (error) {
      console.error('Error al obtener tipos de acceso:', error);
      res.status(500).json({ error: 'Error al obtener tipos de acceso' });
  }

};

const deleteRegistro = async (req, res)=> {

  try {
      const {idRegistro, idEmpresa, fecha, usuarioAccion}  = req.body;

      const esquema = 'empresa'+idEmpresa;
       const result = await Fichajes.schema(esquema).update(
        {
            fecha_baja: fecha,
            usuario_baja: usuarioAccion
        },
        {
            where: { id_fichaje:idRegistro }
        }
    );
      res.status(200).json({ message: 'Datos recuperados correctamente',result });
  } catch (error) {
      console.error('Error al obtener tipos de acceso:', error);
      res.status(500).json({ error: 'Error al obtener tipos de acceso' });
  }
};

const crearPeticionEdicion = async (req, res) => {
  try {
    const { idUsuario, idEmpresa, values } = req.body;
    const fechaConOffset = new Date();

    const esquema = 'empresa' + idEmpresa;
    const tz = 'Europe/Madrid';

    const nueva_entrada = dayjs.tz(values.fecha, tz)
      .hour(Number(values.hora_entrada.split(':')[0]))
      .minute(Number(values.hora_entrada.split(':')[1]))
      .second(0)
      .millisecond(0)
      .utc();

    const nueva_salida = dayjs.tz(values.fechaSalida, tz)
      .hour(Number(values.hora_salida.split(':')[0]))
      .minute(Number(values.hora_salida.split(':')[1]))
      .second(0)
      .millisecond(0)
      .utc();

    const usuariosEmpresa = await sequelize.query(
      'SELECT id_usuario FROM usuarios_empresas WHERE id_empresa = $1 AND fecha_baja IS NULL',
      {
        type: QueryTypes.SELECT,
        bind: [idEmpresa],
      }
    );

    const usuariosIds = usuariosEmpresa.map(u => Number(u.id_usuario));

    if (usuariosIds.length === 0) {
      return res.status(400).json({ error: 'No hay usuarios activos en la empresa' });
    }

    const query = `
      SELECT email FROM usuarios
      WHERE id_usuario = ANY($1::int[]) AND tipo_usuario IN ('3', '4')
    `;

    const usuariosConEmail = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      bind: [usuariosIds],
    });

    const destinatarios = usuariosConEmail.map(u => u.email);

    if (destinatarios.length === 0) {
      return res.status(400).json({ error: 'No hay destinatarios válidos (tipo_usuario 3 o 4)' });
    }

    const info = await Peticiones.schema(esquema).create({
      id_usuario_peticion: idUsuario,
      fecha_alta: fechaConOffset,
      id_fichaje: values.id_fichaje,
      nueva_entrada,
      nueva_salida,
      justificacion: values.justificacion,
    });

    const usuarios = await Usuario.findOne({
      where: { id_usuario: idUsuario },
      attributes: ['id_usuario', 'nombre', 'dni'],
      raw: true,
    });

    await enviarCorreoNotificacion(destinatarios, 'modificacion_horario', null, null);

    res.status(200).json({ message: 'Petición creada y notificación enviada', info });
  } catch (error) {
    console.error('Error al crear petición:', error);
    res.status(500).json({ error: 'Error al crear petición' });
  }
};

const crearPeticionCierreMes = async (req, res) => {
  try {
    const { idUsuario, idEmpresa, mes } = req.body;
    const esquema = 'empresa' + idEmpresa;

    const mesFormateado = moment(mes, ['MM/YYYY', 'YYYY-MM', moment.ISO_8601], true).isValid()
      ? moment(mes, ['MM/YYYY', 'YYYY-MM', moment.ISO_8601]).format('YYYY-MM')
      : null;

    if (!mesFormateado) {
      return res.status(400).json({ error: 'Formato de mes inválido' });
    }

    const info = await MesesCierre.schema(esquema).create({
      usuario_alta: idUsuario,
      mes: mesFormateado,
    });

    const usuariosEmpresa = await sequelize.query(
      'SELECT id_usuario FROM usuarios_empresas WHERE id_empresa = $1 AND fecha_baja IS NULL',
      {
        type: QueryTypes.SELECT,
        bind: [idEmpresa],
      }
    );

    const usuariosIds = usuariosEmpresa.map(u => Number(u.id_usuario));

    if (usuariosIds.length === 0) {
      return res.status(400).json({ error: 'No hay usuarios activos en la empresa' });
    }

    const query = `
      SELECT email FROM usuarios
      WHERE id_usuario = ANY($1::int[]) AND tipo_usuario IN ('3', '4')
    `;

    const usuariosConEmail = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      bind: [usuariosIds],
    });

    const destinatarios = usuariosConEmail.map(u => u.email);

    if (destinatarios.length === 0) {
      return res.status(400).json({ error: 'No hay destinatarios válidos (tipo_usuario 3 o 4)' });
    }

    const usuarios = await Usuario.findOne({
      where: { id_usuario: idUsuario },
      attributes: ['id_usuario', 'nombre', 'dni'],
      raw: true,
    });

    await enviarCorreoNotificacion(destinatarios, 'cierre_jornada', usuarios,mesFormateado);

    res.status(200).json({ message: 'Petición creada', info });
  } catch (error) {
    console.error('Error al crear petición:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getPeticionesByIdEmpresa = async (req, res) => {
  const { idEmpresa } = req.body;
  const esquema = 'empresa' + idEmpresa;

  try {

    const peticiones = await Peticiones.schema(esquema).findAll({
      where: {
        fecha_aceptacion: null,
        fecha_cancelacion: null
      },
      order: [['fecha_alta', 'ASC']]
    });

    const listaIdFichaje = peticiones.map(p => p.id_fichaje);
    const fichajes = await Fichajes.schema(esquema).findAll({
      where: {
        id_fichaje: {
          [Op.in]: listaIdFichaje
        }
      }
    });

    const usuariosIds = fichajes.map(f => f.id_usuario);
    const usuarios = await Usuario.findAll({
      where: {
        id_usuario: {
          [Op.in]: usuariosIds
        },
        fecha_baja: null
      }
    });

    const fichajesMap = Object.fromEntries(fichajes.map(f => [f.id_fichaje, f.toJSON()]));
    const usuariosMap = Object.fromEntries(usuarios.map(u => [u.id_usuario, u.toJSON()]));

    const resultado = peticiones.map(peticion => {
      const peticionJson = peticion.toJSON();
      const fichaje = fichajesMap[peticion.id_fichaje];
      const usuario = fichaje ? usuariosMap[fichaje.id_usuario] : null;
      return {
        ...peticionJson,
        fichaje: fichaje
          ? {
              ...fichaje,
              usuario: usuario || null
            }
          : null
      };
    });

    res.status(200).json({ message: 'Peticiones recuperadas', data: resultado });
  } catch (error) {
    console.error('Error al recuperar peticion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const responderPeticion = async (req, res) => {
  const { idEmpresa, idUsuario, idPeticion, estado } = req.body;
  const esquema = 'empresa' + idEmpresa;

  try {
    const fechaActual = dayjs().tz('Europe/Madrid').toDate();

    const updateData = {
      id_usuario_gestor: idUsuario,
      ...(estado === 3
        ? { fecha_cancelacion: fechaActual }
        : { fecha_aceptacion: fechaActual })
    };

    const info = await Peticiones.schema(esquema).update(updateData, {
      where: { id_peticion: idPeticion }
    });

    res.status(200).json({ message: 'Petición actualizada', info });

  } catch (error) {
    console.error('Error al recuperar petición:', error);
    res.status(500).json({ error: 'Error' });
  }
};

const getPeticionesByIdUsuario = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;
  const esquema = 'empresa' + idEmpresa;

  try {

    const peticiones = await Peticiones.schema(esquema).findAll({
      where: {
        id_usuario_peticion: idUsuario,
        fecha_aceptacion: null,
        fecha_cancelacion: null,
      },
      order: [['fecha_alta', 'ASC']],
      raw: true,
    });

    const mesesCierre = await MesesCierre.schema(esquema).findAll({
      where: {
        usuario_alta: idUsuario,
        fecha_baja: null,
        usuario_cancelacion:null
      },
      order: [['fecha_alta', 'ASC']],
      raw: true,
    });

    res.status(200).json({
      message: 'Peticiones y meses cierre recuperados',
      peticiones,
      mesesCierre,
    });

  } catch (error) {
    console.error('Error al recuperar peticiones o meses cierre:', error);
    res.status(500).json({ error: 'Error al recuperar datos' });
  }
};

const getUltimoRegistroById= async (req, res) => {
  const {esquema, idUsuario}  = req.body;

  try{
    const info = await Fichajes.schema(esquema).findOne({
      where: { id_usuario: idUsuario, fecha_baja: null },
      order: [['fecha_entrada', 'DESC']],
    });

    const descanso = await Descansos.schema(esquema).findOne({
      where: { id_usuario: idUsuario, fecha_salida: null },
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
      const esquema = 'empresa'+ idEmpresa;

      const registros = await Fichajes.schema(esquema).findAll({
          where: {
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
    const esquema = 'empresa' + idEmpresa;

    const peticiones = await Peticiones.schema(esquema).findAll({
      where: { id_peticion }
    });

    if (!peticiones || peticiones.length === 0) {
      throw new Error('Petición no encontrada');
    }

    const peticion = peticiones[0];

    const horaEntrada = peticion.nueva_entrada;
    const horaSalida = peticion.nueva_salida;

    const result = await Fichajes.schema(esquema).update(
      {
        fecha_entrada: horaEntrada,
        fecha_salida: horaSalida,
        fecha_modificacion:fecha,
        usuario_modificacion: id_usuario_gestor,
      },
      {
        where: { id_fichaje }
      }
    );

    res.status(200).json({ message: 'Datos actualizados correctamente', result });
  } catch (error) {
    console.error('Error al actualizar tipos de acceso:', error);
    res.status(500).json({ error: 'Error al actualizar tipos de acceso' });
  }
};
const getCierresMensualesByIdEmpresa = async (req, res) => {
  const { idEmpresa } = req.body;
  const esquema = 'empresa' + idEmpresa;

  try {

    const meses = await MesesCierre.schema(esquema).findAll({
      where: {
        fecha_baja: null,
        fecha_aceptacion: null,
        fecha_cancelacion: null,
      },
      order: [['fecha_alta', 'ASC']],
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

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function enviarCorreoNotificacion(destinatarios, tipoNotificacion,usuarios,mesCierre) {
  let asunto = '';
  let htmlBody = '';

  switch (tipoNotificacion) {
    case 'modificacion_horario':
      asunto = 'Solicitud de modificación de horario';
      htmlBody = `
          <div style="text-align: center; margin-top: 20px;;">

            <p>Se ha recibido una solicitud de cambio de horario.</p>
            <p>Por favor, revísela desde la aplicación, en la pestaña <strong>"Notificaciones"</strong>, y gestione su aprobación o denegación.</p>
    </div>

      <div style="text-align: center; font-size: 12px;  margin-top: 20px;  color: black;">
        <p><em>No respondas a este correo electrónico. Este buzón no se supervisa. Si necesitas ayuda, envíanos un correo electrónico</em></p>
        <p><em>a info@fichaeneltrabajo.es o puedes llamarnos al 886 137 361. Recuerda que nuestro horario comercial es de L-V de 09:00 a 13:00.</em></p>
        <p><em>Este mensaje y sus archivos adjuntos se dirige exclusivamente a su destinatario y puede contener información confidencial. Si no eres el</em></p>
        <p><em>destinatario indicado, te notificamos que la utilización, divulgación y/o copia sin autorización está prohibida en virtud de la legislación</em></p>
        <p><em>vigente. Si has recibido este mensaje por error, te rogamos que nos lo comuniques inmediatamente y procedas a su destrucción. Gracias.</em></p>
        <p><em>De conformidad con lo dispuesto en las normativas vigentes en protección de datos GDPR y LOPD, te informamos que los datos personales</em></p>
        <p><em>serán tratados bajo la responsabilidad de Inclusión Corporativa, S.L. para resolver tu consulta. Los datos serán conservados el tiempo</em></p>
        <p><em>necesario para resolver tu consulta. Tras esto, tus datos serán conservados y no serán cedidos a terceros, salvo obligación legal. Puedes</em></p>
        <p><em>ejercer los derechos de acceso, rectificación, portabilidad, supresión, limitación y oposición enviando un mensaje</em></p>
        <p><em>a info@fichaeneltrabajo.es y si consideras que el tratamiento no se ajusta a la normativa vigente, podrás presentar una reclamación ante</em></p>
        <p><em>la autoridad de control en www.agpd.es.</em></p>
    </div>
          `;
      break;
    case 'cierre_jornada':
      asunto = 'Solicitud cierre jornada mensual';
     const mesFormateado = moment(mesCierre, 'YYYY-MM').format('MM/YYYY');
      htmlBody = `
        <div style="text-align: center; margin-top: 20px;">
          <p>La persona trabajadora <strong>${usuarios.nombre}</strong> ha creado una petición de cierre de jornada mensual correspondiente al periodo <strong>${mesFormateado}</strong>.</p>
          <p>Por favor, revísela desde la aplicación, en la pestaña <strong>"Notificaciones"</strong>, y gestione su aprobación o denegación.</p>
        </div>

      <div style="text-align: center; font-size: 12px;  margin-top: 20px;  color: black;">
        <p><em>No respondas a este correo electrónico. Este buzón no se supervisa. Si necesitas ayuda, envíanos un correo electrónico</em></p>
        <p><em>a info@fichaeneltrabajo.es o puedes llamarnos al 886 137 361. Recuerda que nuestro horario comercial es de L-V de 09:00 a 13:00.</em></p>
        <p><em>Este mensaje y sus archivos adjuntos se dirige exclusivamente a su destinatario y puede contener información confidencial. Si no eres el</em></p>
        <p><em>destinatario indicado, te notificamos que la utilización, divulgación y/o copia sin autorización está prohibida en virtud de la legislación</em></p>
        <p><em>vigente. Si has recibido este mensaje por error, te rogamos que nos lo comuniques inmediatamente y procedas a su destrucción. Gracias.</em></p>
        <p><em>De conformidad con lo dispuesto en las normativas vigentes en protección de datos GDPR y LOPD, te informamos que los datos personales</em></p>
        <p><em>serán tratados bajo la responsabilidad de Inclusión Corporativa, S.L. para resolver tu consulta. Los datos serán conservados el tiempo</em></p>
        <p><em>necesario para resolver tu consulta. Tras esto, tus datos serán conservados y no serán cedidos a terceros, salvo obligación legal. Puedes</em></p>
        <p><em>ejercer los derechos de acceso, rectificación, portabilidad, supresión, limitación y oposición enviando un mensaje</em></p>
        <p><em>a info@fichaeneltrabajo.es y si consideras que el tratamiento no se ajusta a la normativa vigente, podrás presentar una reclamación ante</em></p>
        <p><em>la autoridad de control en www.agpd.es.</em></p>
    </div>
          `;       break;
    default:
      break;
  }

  const mailOptions = {
    from: 'Noreply@fichaeneltrabajo.es',
    to: destinatarios.join(', '),
    subject: asunto,
    html: htmlBody,
    attachments: [
      {
        filename: 'Logo-Horizontal INCOR-RGB.png',
        path: path.resolve(__dirname, './Logo-Horizontal INCOR-RGB.png'),
        cid: 'logo',
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Correo enviado con éxito');
  } catch (error) {
    console.error('Error enviando correo:', error);
  }
}

module.exports = {
    getDatosUsuario,
    crearRegistro,
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
    responderPeticionCierre

  };
