const { sequelize } = require('../config/db');

let cacheTablas = null;

const tablaExiste = async (nombreTabla) => {
  const rows = await sequelize.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :nombreTabla
     LIMIT 1`,
    {
      replacements: { nombreTabla },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return Array.isArray(rows) && rows.length > 0;
};

const vacacionesSoportaSaldo = async () => {
  if (cacheTablas !== null) return cacheTablas;
  try {
    const [cupo, movimientos] = await Promise.all([
      tablaExiste('usuarios_vacaciones_cupo'),
      tablaExiste('usuarios_vacaciones_movimientos'),
    ]);
    cacheTablas = cupo && movimientos;
  } catch {
    cacheTablas = false;
  }
  return cacheTablas;
};

module.exports = {
  vacacionesSoportaSaldo,
};
