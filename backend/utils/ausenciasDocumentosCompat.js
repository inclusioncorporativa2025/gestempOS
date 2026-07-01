const { sequelize } = require('../config/db');

let cacheDocumentos = null;

const tablaExiste = async (nombreTabla) => {
  const filas = await sequelize.query(
    `SELECT 1 AS ok
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :nombre
     LIMIT 1`,
    {
      replacements: { nombre: nombreTabla },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return filas.length > 0;
};

const ausenciasSoportaDocumentos = async () => {
  if (cacheDocumentos !== null) return cacheDocumentos;
  cacheDocumentos = await tablaExiste('usuarios_ausencias_documentos');
  return cacheDocumentos;
};

module.exports = {
  ausenciasSoportaDocumentos,
};
