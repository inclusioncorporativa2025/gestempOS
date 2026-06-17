require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../../config/db');

const sql = `
  ALTER TABLE peticiones
  ADD COLUMN motivo_rechazo TEXT NULL
  COMMENT 'Motivo indicado por el gestor al rechazar la peticion'
  AFTER fecha_cancelacion
`;

sequelize.query(sql)
  .then(() => {
    console.log('Columna motivo_rechazo creada correctamente');
    process.exit(0);
  })
  .catch((err) => {
    if (String(err.message).includes('Duplicate column')) {
      console.log('La columna motivo_rechazo ya existe');
      process.exit(0);
    }
    console.error(err.message);
    process.exit(1);
  });
