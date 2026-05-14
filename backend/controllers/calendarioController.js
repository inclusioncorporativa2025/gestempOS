const FestivoEmpresa = require('../models/FestivoEmpresa');

const getFestivosByIdEmpresa = async (req, res) => {
  const { idUsuario, idEmpresa } = req.body;

  if (!idUsuario || !idEmpresa) {
    return res.status(400).json({ error: 'Error: datos proporcionados incorrectos.' });
  }

  try {
    const esquema = 'empresa'+idEmpresa;

    const festivos = await FestivoEmpresa.schema(esquema).findAll({
      where: {
        id_empresa: idEmpresa,
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

  const { idUsuario, idEmpresa, fecha } = req.body;

  const fechaF =fecha.fecha;
  const descripcion = fecha.descripcion;
  if (!idUsuario || !idEmpresa || !fecha ) {
    return res.status(400).json({ error: 'Faltan datos requeridos para guardar el festivo.' });
  }

  try {
    const esquema = 'empresa'+idEmpresa;

    const existe = await FestivoEmpresa.schema(esquema).findOne({
      where: { id_empresa: idEmpresa,fecha: fechaF, fecha_baja: null }
    });

    if (existe) {
      return res.status(409).json({ error: 'Ya existe un festivo en esa fecha.' });
    }

    const nuevoFestivo = await FestivoEmpresa.schema(esquema).create({
      id_empresa: idEmpresa,
      fecha:fechaF,
      descripcion,
      usuario_alta: idUsuario,
      fecha_alta: new Date()
    });

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
    const esquema = 'empresa'+idEmpresa;

    const festivo = await FestivoEmpresa.schema(esquema).findOne({
      where: { id_festivo: idFestivo, id_empresa: idEmpresa, fecha_baja: null }
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

module.exports = {
  getFestivosByIdEmpresa,
  guardarFestivoEmpresa,
  eliminarFestivoEmpresa
};
