require('dotenv').config();
const { sequelize } = require('../config/db');

const queries = {
  empresas_inclusion: `
    SELECT id_empresa, nombre, alias, identificador_fiscal, email,
           CHAR_LENGTH(email) AS len_email,
           LENGTH(email) AS bytes_email,
           HEX(email) AS hex_email,
           activo, fecha_baja, fecha_alta, plan
    FROM m_empresas
    WHERE fecha_baja IS NULL
      AND (
        nombre LIKE '%Inclusi%n Corporativa%'
        OR identificador_fiscal = 'B75797662'
        OR email LIKE '%inclusioncorp%'
      )
  `,
  usuarios_inclusion: `
    SELECT u.id_usuario, u.email, u.nombre, u.tipo_usuario AS tipo_global,
           CHAR_LENGTH(u.email) AS len_email, HEX(u.email) AS hex_email,
           u.activo, u.fecha_baja
    FROM m_usuarios u
    WHERE u.fecha_baja IS NULL
      AND (u.email LIKE '%inclusioncorp%' OR u.email LIKE '%gerencia%inclusion%')
  `,
  vinculos: `
    SELECT ue.id_usuario, ue.id_empresa, ue.tipo_usuario, ue.activo, ue.fecha_baja,
           e.nombre AS empresa, u.email AS usuario_email, e.email AS empresa_email
    FROM m_usuarios_empresas ue
    JOIN m_usuarios u ON u.id_usuario = ue.id_usuario
    JOIN m_empresas e ON e.id_empresa = ue.id_empresa
    WHERE ue.fecha_baja IS NULL
      AND (
        e.nombre LIKE '%Inclusi%n Corporativa%'
        OR u.email LIKE '%inclusioncorp%'
        OR e.identificador_fiscal = 'B75797662'
      )
  `,
  duplicados_email_usuario: `
    SELECT LOWER(TRIM(email)) AS email_norm, COUNT(*) AS n, GROUP_CONCAT(id_usuario) AS ids
    FROM m_usuarios
    WHERE fecha_baja IS NULL AND email LIKE '%inclusioncorp%'
    GROUP BY LOWER(TRIM(email))
    HAVING n > 1
  `,
};

(async () => {
  for (const [name, sql] of Object.entries(queries)) {
    console.log(`\n=== ${name} ===`);
    const rows = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
    console.log(JSON.stringify(rows, null, 2));
  }

  console.log('\n=== compare_54_414 ===');
  const compare = await sequelize.query(
    `SELECT u.id_usuario, u.email, u.tipo_usuario AS tipo_global, ue.id_empresa, e.nombre, ue.tipo_usuario AS tipo_empresa, ue.activo
     FROM m_usuarios u
     LEFT JOIN m_usuarios_empresas ue ON ue.id_usuario=u.id_usuario AND ue.fecha_baja IS NULL
     LEFT JOIN m_empresas e ON e.id_empresa=ue.id_empresa
     WHERE u.id_usuario IN (54,414)
     ORDER BY u.id_usuario, ue.id_empresa`,
    { type: sequelize.QueryTypes.SELECT },
  );
  console.log(JSON.stringify(compare, null, 2));

  const fic54 = await sequelize.query(
    'SELECT COUNT(*) AS c FROM fichajes WHERE empresa_id=136 AND id_usuario=54',
    { type: sequelize.QueryTypes.SELECT },
  );
  const fic414 = await sequelize.query(
    'SELECT COUNT(*) AS c FROM fichajes WHERE empresa_id=136 AND id_usuario=414',
    { type: sequelize.QueryTypes.SELECT },
  );
  console.log('fichajes empresa 136 usuario 54:', fic54[0].c);
  console.log('fichajes empresa 136 usuario 414:', fic414[0].c);

  await sequelize.close();
})().catch((err) => {
  console.error('DB:', err.message);
  process.exit(1);
});
