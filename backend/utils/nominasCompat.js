const { sequelize } = require('../config/db');

let cacheRetribucion = null;
let cacheDocumentos = null;
let cachePrenomina = null;
let cacheDocumentosImportes = null;

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

const columnaExiste = async (nombreTabla, nombreColumna) => {
  const filas = await sequelize.query(
    `SELECT 1 AS ok
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :tabla
       AND COLUMN_NAME = :columna
     LIMIT 1`,
    {
      replacements: { tabla: nombreTabla, columna: nombreColumna },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return filas.length > 0;
};

const nominasSoportaImportesDocumento = async () => {
  if (cacheDocumentosImportes !== null) return cacheDocumentosImportes;
  const tablaOk = await nominasSoportaDocumentos();
  if (!tablaOk) {
    cacheDocumentosImportes = false;
    return false;
  }
  cacheDocumentosImportes = await columnaExiste('usuarios_documentos_nomina', 'importe_liquido');
  return cacheDocumentosImportes;
};

module.exports = {
  nominasSoportaRetribucion,
  nominasSoportaDocumentos,
  nominasSoportaPrenomina,
  nominasSoportaImportesDocumento,
};
