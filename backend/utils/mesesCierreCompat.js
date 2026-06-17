const { sequelize } = require('../config/db');

/** Atributos existentes antes de la migración notificacion_vista. */
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

let cacheNotificacionVista = null;

const mesesCierreSoportaNotificacionVista = async () => {
  if (cacheNotificacionVista !== null) return cacheNotificacionVista;
  try {
    const rows = await sequelize.query(
      `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'meses_cierre'
         AND COLUMN_NAME = 'notificacion_vista'
       LIMIT 1`,
      { type: sequelize.QueryTypes.SELECT },
    );
    cacheNotificacionVista = Array.isArray(rows) && rows.length > 0;
  } catch {
    cacheNotificacionVista = false;
  }
  return cacheNotificacionVista;
};

module.exports = {
  MESES_CIERRE_ATTRS,
  mesesCierreSoportaNotificacionVista,
};
