const setupSchema = require('./setupSchema');
const { sequelize } = require('../db');

const initializeSchema = async (name) => {
  const transaction = await sequelize.transaction();
  var esquema = 'empresa' + name;

  try {
    console.log(`Iniciando configuración para el esquema: ${esquema}`);

    await setupSchema(esquema, transaction);

    await transaction.commit();
    console.log(`Esquema ${esquema} inicializado correctamente.`);

  } catch (err) {
    console.error('Error al inicializar el esquema:', err);

    await transaction.rollback();
    throw err;
  }
};

module.exports = initializeSchema;
