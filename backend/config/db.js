require('dotenv').config();
const { Sequelize } = require('sequelize');

const requiredEnv = ['DB_NAME', 'DB_USER', 'DB_HOST'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(
    `Faltan variables de entorno para la base de datos: ${missingEnv.join(', ')}`
  );
  process.exit(1);
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: Number(process.env.DB_PORT) || 3306,
    logging: false,
    timezone: '+02:00',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
  }
);

const connectToDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos exitosa');
    return true;
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
    throw error;
  }
};

module.exports = { sequelize, connectToDatabase };
