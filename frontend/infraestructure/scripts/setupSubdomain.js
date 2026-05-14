const { pool } = require('../backend/config/db');


//Automatiza la creación de esquemas con un script
const createSchema = async (companyName) => {
    const schemaName = `empresa_${companyName.toLowerCase().replace(/\s+/g, '_')}`;
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
};

createSchema('NombreEmpresa');
