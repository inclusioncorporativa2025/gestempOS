const Fichajes = require('../models/Fichajes');
const Descansos = require('../models/Descansos');
const { sequelize } = require('../config/db');
const { createConId } = require('../utils/empresaScope');
const { formatUbicacionStorage } = require('../utils/ubicacion');
const { TIPO_REGISTRO_A_EVENTO } = require('../utils/registroHash');
const { registrarEventoFichaje } = require('../repositorios/fichajeRegistroEventosRepository');

const getUltimoRegistro = async (idUsuario, idEmpresa) =>
  Fichajes.findOne({
    where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
    order: [['fecha_alta', 'DESC']],
  });

const getUltimoDescanso = async (idUsuario, idEmpresa) =>
  Descansos.findOne({
    where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_salida: null },
    order: [['fecha_entrada', 'DESC']],
  });

const resolverEstadoJornada = async (idUsuario, idEmpresa) => {
  const ultimoRegistro = await getUltimoRegistro(idUsuario, idEmpresa);
  const ultimoDescanso = await getUltimoDescanso(idUsuario, idEmpresa);

  if (ultimoRegistro && ultimoRegistro.fecha_salida == null) {
    if (ultimoDescanso) {
      return { estado: 'break', acciones: [4] };
    }
    return { estado: 'in', acciones: [2, 3] };
  }

  return { estado: 'out', acciones: [1] };
};

const crearRegistroFichaje = async ({
  idUsuario,
  idEmpresa,
  tipoRegistro,
  ubicacion = null,
  fecha = new Date(),
  usuarioAccion = idUsuario,
}) => {
  const tipoEvento = TIPO_REGISTRO_A_EVENTO[tipoRegistro];
  if (!tipoEvento) {
    const error = new Error('Tipo de registro no válido');
    error.status = 400;
    throw error;
  }

  const ubicacionSt = formatUbicacionStorage(ubicacion) || '';
  const ultimoRegistro = await getUltimoRegistro(idUsuario, idEmpresa);
  const ultimoDescanso = await getUltimoDescanso(idUsuario, idEmpresa);

  await sequelize.transaction(async (transaction) => {
    let idFichajeRef = null;
    let idDescansoRef = null;

    if ((!ultimoRegistro || ultimoRegistro.fecha_salida != null) && tipoRegistro === 1) {
      const fichaje = await createConId(Fichajes, idEmpresa, 'id_fichaje', {
        id_usuario: idUsuario,
        fecha_alta: fecha,
        ubicacion_entrada: ubicacionSt,
        fecha_entrada: fecha,
        usuario_alta: usuarioAccion,
      }, transaction);
      idFichajeRef = fichaje.id_fichaje;
    } else if (tipoRegistro === 2) {
      if (!ultimoRegistro || ultimoRegistro.fecha_salida != null) {
        throw new Error('No hay fichaje abierto para registrar salida');
      }
      idFichajeRef = ultimoRegistro.id_fichaje;
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
      observaciones: 'whatsapp',
      transaction,
    });
  });

  return { tipoRegistro, tipoEvento };
};

module.exports = {
  getUltimoRegistro,
  getUltimoDescanso,
  resolverEstadoJornada,
  crearRegistroFichaje,
};
