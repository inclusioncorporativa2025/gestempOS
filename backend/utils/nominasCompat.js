const { sequelize } = require('../config/db');

let cacheRetribucion = null;
let cacheDocumentos = null;
let cachePrenomina = null;

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
  cacheDocumentos = await tablaExiste('usuarios_documentos_nomina');
  return cacheDocumentos;
};

const nominasSoportaPrenomina = async () => {
  if (cachePrenomina !== null) return cachePrenomina;
  const [cabecera, empleados, lineas] = await Promise.all([
    tablaExiste('empresa_prenominas'),
    tablaExiste('usuarios_prenomina'),
    tablaExiste('usuarios_prenomina_lineas'),
  ]);
  cachePrenomina = cabecera && empleados && lineas;
  return cachePrenomina;
};

module.exports = {
  nominasSoportaRetribucion,
  nominasSoportaDocumentos,
  nominasSoportaPrenomina,
};
