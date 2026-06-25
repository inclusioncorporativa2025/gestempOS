const { sequelize } = require('../config/db');

let cacheRetribucion = null;
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

const nominasSoportaRetribucion = async () => {
  if (cacheRetribucion !== null) return cacheRetribucion;
  cacheRetribucion = await tablaExiste('usuarios_retribucion');
  return cacheRetribucion;
};

const nominasSoportaDocumentos = async () => {
  if (cacheDocumentos !== null) return cacheDocumentos;
  cacheDocumentos = await tablaExiste('documentos_nomina');
  return cacheDocumentos;
};

module.exports = {
  nominasSoportaRetribucion,
  nominasSoportaDocumentos,
};
