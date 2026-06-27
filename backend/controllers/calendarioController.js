const FestivoEmpresa = require('../models/FestivoEmpresa');
const { createConId } = require('../utils/empresaScope');
const { COMUNIDADES_AUTONOMAS } = require('../config/spanishRegions');
const { sincronizarFestivosOficiales } = require('../services/festivosOficialesService');

const FESTIVO_LOCAL_FIELDS = [
  'fecha',
  'descripcion',
  'origen',
  'external_key',
  'usuario_alta',
  'fecha_alta',
];

const getFestivosByIdEmpresa = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;

  if (!idUsuario || !idEmpresa) {
    return res.status(400).json({ error: 'Error: datos proporcionados incorrectos.' });
  }

  try {
    const festivos = await FestivoEmpresa.findAll({
      where: {
        empresa_id: idEmpresa,
        fecha_baja: null
      },
      order: [['fecha', 'ASC']]
    });

    return res.status(200).json(festivos);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener festivos', detalle: error.message });
  }
};

const guardarFestivoEmpresa = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;
  const fechaPayload = req.body.fecha || req.body.values;

  const fechaF = fechaPayload?.fecha;
  const descripcion = fechaPayload?.descripcion;

  if (!idUsuario || !idEmpresa || !fechaF || !descripcion) {
    return res.status(400).json({ error: 'Faltan datos requeridos para guardar el festivo.' });
  }

  try {
    const existe = await FestivoEmpresa.findOne({
      where: { empresa_id: idEmpresa, fecha: fechaF, fecha_baja: null }
    });

    if (existe) {
      return res.status(409).json({ error: 'Ya existe un festivo en esa fecha.' });
    }

    const nuevoFestivo = await createConId(
      FestivoEmpresa,
      idEmpresa,
      'id_festivo',
      {
        fecha: fechaF,
        descripcion,
        origen: 'local',
        external_key: null,
        usuario_alta: idUsuario,
        fecha_alta: new Date(),
      },
      null,
      FESTIVO_LOCAL_FIELDS,
    );

    return res.status(201).json(nuevoFestivo);
  } catch (error) {
    return res.status(500).json({ error: 'Error al guardar el festivo', detalle: error.message });
  }
};

const eliminarFestivoEmpresa = async (req, res) => {
  const { idUsuario, idEmpresa, idFestivo } = req.body;

  if (!idUsuario || !idEmpresa || !idFestivo) {
    return res.status(400).json({ error: 'Faltan datos requeridos para eliminar el festivo.' });
  }

  try {
    const festivo = await FestivoEmpresa.findOne({
      where: { id_festivo: idFestivo, empresa_id: idEmpresa, fecha_baja: null }
    });

    if (!festivo) {
      return res.status(404).json({ error: 'Festivo no encontrado o ya eliminado.' });
    }

    await festivo.update({
      usuario_baja: idUsuario,
      fecha_baja: new Date()
    });

    return res.status(200).json({ message: 'Festivo eliminado correctamente' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar el festivo', detalle: error.message });
  }
};

const sincronizarFestivosOficialesHandler = async (req, res) => {
  const { idUsuario, idEmpresa, year } = req.body;

  if (!idUsuario || !idEmpresa) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  try {
    const resultado = await sincronizarFestivosOficiales(idEmpresa, idUsuario, year);
    const festivos = await FestivoEmpresa.findAll({
      where: { empresa_id: idEmpresa, fecha_baja: null },
      order: [['fecha', 'ASC']],
    });

    return res.status(200).json({
      message: 'Festivos oficiales sincronizados correctamente',
      resultado,
      festivos,
    });
  } catch (error) {
    const esConfig = error.message?.includes('Configure la comunidad');
    return res.status(esConfig ? 400 : 500).json({
      error: error.message || 'Error al sincronizar festivos oficiales',
    });
  }
};

const getRegionesFestivos = async (_req, res) => {
  return res.status(200).json({ regiones: COMUNIDADES_AUTONOMAS });
};

module.exports = {
  getFestivosByIdEmpresa,
  guardarFestivoEmpresa,
  eliminarFestivoEmpresa,
  sincronizarFestivosOficialesHandler,
  getRegionesFestivos,
};
