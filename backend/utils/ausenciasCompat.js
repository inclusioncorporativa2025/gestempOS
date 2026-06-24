const { sequelize } = require('../config/db');

let cacheAprobacion = null;

const columnaExiste = async (nombreColumna) => {
  const rows = await sequelize.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'ausencias'
       AND COLUMN_NAME = :nombreColumna
     LIMIT 1`,
    {
      replacements: { nombreColumna },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return Array.isArray(rows) && rows.length > 0;
};

const ausenciasSoportaAprobacion = async () => {
  if (cacheAprobacion !== null) return cacheAprobacion;
  try {
    cacheAprobacion = await columnaExiste('fecha_aceptacion');
  } catch {
    cacheAprobacion = false;
  }
  return cacheAprobacion;
};

const { Op } = require('sequelize');

const whereSoloAprobadas = (soportaAprobacion) =>
  (soportaAprobacion ? { fecha_aceptacion: { [Op.ne]: null } } : {});

module.exports = {
  ausenciasSoportaAprobacion,
  whereSoloAprobadas,
};
