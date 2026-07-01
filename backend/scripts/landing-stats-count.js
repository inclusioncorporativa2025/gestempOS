require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/db');

const queries = {
  empresas_activas: `
    SELECT COUNT(*) AS total
    FROM m_empresas
    WHERE fecha_baja IS NULL
  `,
  usuarios_activos_vinculados: `
    SELECT COUNT(DISTINCT ue.id_usuario) AS total
    FROM m_usuarios_empresas ue
    JOIN m_usuarios u ON u.id_usuario = ue.id_usuario
    WHERE ue.fecha_baja IS NULL
      AND ue.activo = 1
      AND u.fecha_baja IS NULL
  `,
  vinculos_usuario_empresa_activos: `
    SELECT COUNT(*) AS total
    FROM m_usuarios_empresas
    WHERE fecha_baja IS NULL
      AND activo = 1
  `,
  fichajes_activos: `
    SELECT COUNT(*) AS total
    FROM fichajes
    WHERE fecha_baja IS NULL
  `,
  fichajes_total_historico: `
    SELECT COUNT(*) AS total
    FROM fichajes
  `,
  licencias_contratadas: `
    SELECT COALESCE(SUM(licencias), 0) AS total
    FROM m_empresas
    WHERE fecha_baja IS NULL
  `,
  usuarios_distintos_vinculados: `
    SELECT COUNT(DISTINCT id_usuario) AS total
    FROM m_usuarios_empresas
    WHERE fecha_baja IS NULL
  `,
  usuarios_con_fichaje: `
    SELECT COUNT(DISTINCT id_usuario) AS total
    FROM fichajes
    WHERE fecha_baja IS NULL
  `,
};

async function run() {
  const result = {};

  for (const [key, sql] of Object.entries(queries)) {
    const [rows] = await sequelize.query(sql);
    result[key] = Number(rows[0].total);
  }

  console.log(JSON.stringify(result, null, 2));
  await sequelize.close();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
