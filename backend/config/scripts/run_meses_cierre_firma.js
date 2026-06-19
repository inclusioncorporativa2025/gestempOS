require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../../config/db');

const statements = [
  `ALTER TABLE meses_cierre ADD COLUMN firma_imagen MEDIUMTEXT NULL AFTER fecha_baja`,
  `ALTER TABLE meses_cierre ADD COLUMN firma_hash CHAR(64) NULL AFTER firma_imagen`,
  `ALTER TABLE meses_cierre ADD COLUMN hash_registro_mes CHAR(64) NULL AFTER firma_hash`,
];

(async () => {
  try {
    for (const sql of statements) {
      try {
        await sequelize.query(sql);
        console.log('OK:', sql.split('ADD COLUMN ')[1]?.split(' ')[0]);
      } catch (err) {
        if (String(err.message).includes('Duplicate column')) {
          console.log('Ya existe:', sql.split('ADD COLUMN ')[1]?.split(' ')[0]);
        } else {
          throw err;
        }
      }
    }
    console.log('Migración de firma en meses_cierre completada');
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
