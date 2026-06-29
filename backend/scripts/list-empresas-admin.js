require('dotenv').config();
const { sequelize } = require('../config/db');

const sql = `
  SELECT e.id_empresa, e.nombre, e.plan, e.licencias,
         ef.modo_facturacion, ef.trial_ends_at, ef.estado_suscripcion,
         u.id_usuario, u.email, u.nombre AS admin_nombre, ue.tipo_usuario
  FROM m_empresas e
  JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
  JOIN m_usuarios_empresas ue ON ue.id_empresa = e.id_empresa AND ue.fecha_baja IS NULL
  JOIN m_usuarios u ON u.id_usuario = ue.id_usuario
  WHERE ue.tipo_usuario = 3 AND e.fecha_baja IS NULL
  ORDER BY e.id_empresa DESC
  LIMIT 5
`;

sequelize.query(sql, { type: sequelize.QueryTypes.SELECT })
  .then((rows) => {
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('DB:', error.message);
    process.exit(1);
  });
