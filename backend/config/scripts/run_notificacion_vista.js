require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../../config/db');

const sql = `
  ALTER TABLE peticiones
  ADD COLUMN notificacion_vista TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1 si el empleado ya vio la resolucion de la peticion'
  AFTER motivo_rechazo
`;

sequelize.query(sql)
  .then(() => {
    console.log('Columna notificacion_vista creada correctamente');
    process.exit(0);
  })
  .catch((err) => {
    if (String(err.message).includes('Duplicate column')) {
      console.log('La columna notificacion_vista ya existe');
      process.exit(0);
    }
    console.error(err.message);
    process.exit(1);
  });
