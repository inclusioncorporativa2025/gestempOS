const { sequelize } = require('../config/db');

const MESES_CIERRE_ATTRS = [
  'empresa_id',
  'id_mes_cierre',
  'mes',
  'usuario_aceptacion',
  'fecha_aceptacion',
  'usuario_cancelacion',
  'fecha_cancelacion',
  'usuario_alta',
  'fecha_alta',
  'usuario_baja',
  'fecha_baja',
];

const MESES_CIERRE_FIRMA_META_ATTRS = ['firma_hash', 'hash_registro_mes'];

let cacheNotificacionVista = null;
let cacheFirma = null;

const columnaExiste = async (nombreColumna) => {
  const rows = await sequelize.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'meses_cierre'
       AND COLUMN_NAME = :nombreColumna
     LIMIT 1`,
    {
      replacements: { nombreColumna },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return Array.isArray(rows) && rows.length > 0;
};

const mesesCierreSoportaNotificacionVista = async () => {
  if (cacheNotificacionVista !== null) return cacheNotificacionVista;
  try {
    cacheNotificacionVista = await columnaExiste('notificacion_vista');
  } catch {
    cacheNotificacionVista = false;
  }
  return cacheNotificacionVista;
};

const mesesCierreSoportaFirma = async () => {
  if (cacheFirma !== null) return cacheFirma;
  try {
    cacheFirma = await columnaExiste('firma_hash');
  } catch {
    cacheFirma = false;
  }
  return cacheFirma;
};

const getMesesCierreListAttrs = async () => {
  const attrs = [...MESES_CIERRE_ATTRS];
  if (await mesesCierreSoportaNotificacionVista()) {
    attrs.push('notificacion_vista');
  }
  if (await mesesCierreSoportaFirma()) {
    attrs.push(...MESES_CIERRE_FIRMA_META_ATTRS);
  }
  return attrs;
};

const getMesesCierreCreateFields = async (incluirFirma = false) => {
  const fields = [...MESES_CIERRE_ATTRS];
  if (incluirFirma && await mesesCierreSoportaFirma()) {
    fields.push('firma_imagen', ...MESES_CIERRE_FIRMA_META_ATTRS);
  }
  return fields;
};

module.exports = {
  MESES_CIERRE_ATTRS,
  MESES_CIERRE_FIRMA_META_ATTRS,
  mesesCierreSoportaNotificacionVista,
  mesesCierreSoportaFirma,
  getMesesCierreListAttrs,
  getMesesCierreCreateFields,
};
