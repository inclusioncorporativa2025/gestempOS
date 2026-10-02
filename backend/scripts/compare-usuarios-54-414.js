require('dotenv').config();
const { sequelize } = require('../config/db');

const IDS = [54, 414];

(async () => {
  console.log('=== Datos base ===');
  console.log(
    JSON.stringify(
      await sequelize.query(
        `SELECT id_usuario, email, nombre, tipo_usuario, dni, activo, fecha_alta, ultimo_login
         FROM m_usuarios WHERE id_usuario IN (54, 414)`,
        { type: sequelize.QueryTypes.SELECT },
      ),
      null,
      2,
    ),
  );

  console.log('\n=== Membresías (empresas) ===');
  console.log(
    JSON.stringify(
      await sequelize.query(
        `SELECT ue.id_usuario, ue.id_empresa, e.nombre AS empresa, ue.tipo_usuario, ue.activo, ue.fecha_alta,
                (SELECT COUNT(*) FROM m_usuarios_empresas x
                 WHERE x.id_empresa = ue.id_empresa AND x.fecha_baja IS NULL AND x.activo = 1) AS total_vinculos_activos,
                (SELECT COUNT(*) FROM m_usuarios_empresas x
                 WHERE x.id_empresa = ue.id_empresa AND x.fecha_baja IS NULL AND x.activo = 1 AND x.tipo_usuario = 5) AS empleados_tipo5
         FROM m_usuarios_empresas ue
         JOIN m_empresas e ON e.id_empresa = ue.id_empresa
         WHERE ue.id_usuario IN (54, 414) AND ue.fecha_baja IS NULL
         ORDER BY ue.id_usuario, ue.id_empresa`,
        { type: sequelize.QueryTypes.SELECT },
      ),
      null,
      2,
    ),
  );

  console.log('\n=== Personal en empresa 136 (Inclusión Corporativa) ===');
  console.log(
    JSON.stringify(
      await sequelize.query(
        `SELECT ue.id_usuario, u.email, u.nombre, ue.tipo_usuario, ue.activo
         FROM m_usuarios_empresas ue
         JOIN m_usuarios u ON u.id_usuario = ue.id_usuario
         WHERE ue.id_empresa = 136 AND ue.fecha_baja IS NULL
         ORDER BY ue.tipo_usuario, u.email`,
        { type: sequelize.QueryTypes.SELECT },
      ),
      null,
      2,
    ),
  );

  console.log('\n=== Actividad por id_usuario (fichajes, altas) ===');
  for (const id of IDS) {
    const [fichajes] = await sequelize.query(
      `SELECT COUNT(*) AS n FROM fichajes WHERE id_usuario = :id`,
      { replacements: { id }, type: sequelize.QueryTypes.SELECT },
    );
    const [altasEmp] = await sequelize.query(
      `SELECT COUNT(*) AS n FROM m_usuarios_empresas WHERE usuario_alta = :id`,
      { replacements: { id }, type: sequelize.QueryTypes.SELECT },
    );
    const [altasUsr] = await sequelize.query(
      `SELECT COUNT(*) AS n FROM m_usuarios WHERE usuario_alta = :id AND fecha_baja IS NULL`,
      { replacements: { id }, type: sequelize.QueryTypes.SELECT },
    );
    const [accesos] = await sequelize.query(
      `SELECT COUNT(*) AS n FROM acceso_plataforma WHERE id_usuario = :id`,
      { replacements: { id }, type: sequelize.QueryTypes.SELECT },
    ).catch(() => [{ n: 'tabla?' }]);
    console.log({
      id_usuario: id,
      fichajes: fichajes.n,
      altas_membresias: altasEmp.n,
      altas_usuarios: altasUsr.n,
      accesos_plataforma: accesos.n,
    });
  }

  console.log('\n=== Últimos accesos (si existe tabla) ===');
  try {
    console.log(
      JSON.stringify(
        await sequelize.query(
          `SELECT id_usuario, tipo_evento, ruta, id_empresa, fecha
           FROM acceso_plataforma
           WHERE id_usuario IN (54, 414)
           ORDER BY fecha DESC LIMIT 10`,
          { type: sequelize.QueryTypes.SELECT },
        ),
        null,
        2,
      ),
    );
  } catch (e) {
    console.log('(sin acceso_plataforma o error:', e.message, ')');
  }

  await sequelize.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
