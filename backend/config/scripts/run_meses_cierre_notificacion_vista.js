require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../../config/db');

const sql = `
  ALTER TABLE meses_cierre
  ADD COLUMN notificacion_vista TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1 si el empleado ya vio la resolucion del cierre mensual'
  AFTER fecha_baja
`;

sequelize.query(sql)
  .then(() => {
    console.log('Columna notificacion_vista en meses_cierre creada correctamente');
    process.exit(0);
  })
  .catch((err) => {
    if (String(err.message).includes('Duplicate column')) {
      console.log('La columna notificacion_vista ya existe en meses_cierre');
      process.exit(0);
    }
    console.error(err.message);
    process.exit(1);
  });
