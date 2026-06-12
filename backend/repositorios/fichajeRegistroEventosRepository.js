const { Op } = require('sequelize');
const dayjs = require('dayjs');
const FichajeRegistroEventos = require('../models/FichajeRegistroEventos');
const { createConId } = require('../utils/empresaScope');
const {
  normalizarFechaHora,
  generarHash,
  verificarIntegridadRegistro,
  generarHashRaizMensual,
} = require('../utils/registroHash');

const registrarEventoFichaje = async ({
  empresaId,
  idUsuario,
  tipo,
  fechaInput,
  ubicacion = '',
  observaciones = '',
  idFichaje = null,
  idDescanso = null,
  usuarioAlta = null,
  transaction,
}) => {
  const { fecha, hora } = normalizarFechaHora(fechaInput);
  const ubicacionNorm = ubicacion || '';
  const observacionesNorm = observaciones || '';

  const hash = generarHash(
    idUsuario,
    fecha,
    hora,
    tipo,
    empresaId,
    ubicacionNorm,
    observacionesNorm
  );

  const payload = {
    id_usuario: idUsuario,
    tipo,
    fecha,
    hora,
    ubicacion: ubicacionNorm,
    observaciones: observacionesNorm,
    hash,
  };

  if (idFichaje != null) payload.id_fichaje = idFichaje;
  if (idDescanso != null) payload.id_descanso = idDescanso;

  return createConId(
    FichajeRegistroEventos,
    empresaId,
    'id_evento',
    payload,
    transaction
  );
};

const getEventosByMes = async (idEmpresa, idUsuario, mesYYYYMM) => {
  const inicioMes = `${mesYYYYMM}-01`;
  const finMes = dayjs(`${mesYYYYMM}-01`).endOf('month').format('YYYY-MM-DD');

  return FichajeRegistroEventos.findAll({
    where: {
      empresa_id: idEmpresa,
      id_usuario: idUsuario,
      fecha: {
        [Op.between]: [inicioMes, finMes],
      },
    },
    order: [
      ['fecha', 'ASC'],
      ['hora', 'ASC'],
      ['id_evento', 'ASC'],
    ],
  });
};

const verificarEventosMes = async (idEmpresa, idUsuario, mesYYYYMM) => {
  const eventos = await getEventosByMes(idEmpresa, idUsuario, mesYYYYMM);
  const detalle = eventos.map((evento) => {
    const row = evento.toJSON();
    return {
      ...row,
      integridad: verificarIntegridadRegistro(row),
    };
  });

  const invalidos = detalle.filter((e) => !e.integridad.valido);
  const hashes = detalle.map((e) => e.hash);

  return {
    eventos: detalle,
    integridad: {
      total: detalle.length,
      validos: detalle.length - invalidos.length,
      invalidos: invalidos.length,
    },
    hashRaiz: hashes.length > 0 ? generarHashRaizMensual(hashes) : null,
  };
};

module.exports = {
  registrarEventoFichaje,
  getEventosByMes,
  verificarEventosMes,
};
