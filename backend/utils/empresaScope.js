const { sequelize } = require('../config/db');

const parseEmpresaId = (valor) => {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('empresa_id inválido');
  }
  return id;
};

/**
 * Genera el siguiente id para una tabla por-empresa.
 *
 * Las tablas por-empresa usan PK compuesta (empresa_id, id_xxx) SIN AUTO_INCREMENT,
 * por lo que la aplicación debe calcular el id correlativo por empresa.
 *
 * Debe ejecutarse dentro de una transacción con bloqueo para evitar colisiones
 * cuando hay altas concurrentes para la misma empresa.
 *
 * @param {import('sequelize').ModelStatic} model  Modelo Sequelize destino
 * @param {number} empresaId                       Empresa para la que se genera el id
 * @param {string} idField                         Nombre de la columna id (p.ej. 'id_fichaje')
 * @param {import('sequelize').Transaction} [transaction]
 * @returns {Promise<number>}
 */
const getNextId = async (model, empresaId, idField, transaction) => {
  const empresa = parseEmpresaId(empresaId);
  const tabla = model.getTableName();

  const [row] = await sequelize.query(
    `SELECT COALESCE(MAX(\`${idField}\`), 0) + 1 AS nextId FROM \`${tabla}\` WHERE empresa_id = :empresaId FOR UPDATE`,
    {
      replacements: { empresaId: empresa },
      type: sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return Number(row.nextId);
};

/**
 * Crea un registro en una tabla por-empresa generando el id correlativo
 * dentro de una transacción con bloqueo.
 *
 * @param {import('sequelize').ModelStatic} model
 * @param {number} empresaId
 * @param {string} idField
 * @param {object} data  Datos del registro (sin empresa_id ni id)
 * @returns {Promise<object>} Instancia creada
 */
const createConId = async (model, empresaId, idField, data) => {
  const empresa = parseEmpresaId(empresaId);

  return sequelize.transaction(async (transaction) => {
    const nextId = await getNextId(model, empresa, idField, transaction);
    return model.create(
      { ...data, empresa_id: empresa, [idField]: nextId },
      { transaction }
    );
  });
};

/**
 * Genera el siguiente id global (para tablas maestras m_* con PK simple
 * sin AUTO_INCREMENT). Debe ejecutarse dentro de una transacción con bloqueo.
 *
 * @param {import('sequelize').ModelStatic} model
 * @param {string} idField
 * @param {import('sequelize').Transaction} [transaction]
 * @returns {Promise<number>}
 */
const getNextGlobalId = async (model, idField, transaction) => {
  const tabla = model.getTableName();

  const [row] = await sequelize.query(
    `SELECT COALESCE(MAX(\`${idField}\`), 0) + 1 AS nextId FROM \`${tabla}\` FOR UPDATE`,
    {
      type: sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return Number(row.nextId);
};

/**
 * Crea un registro en una tabla maestra (m_*) generando el id global
 * dentro de una transacción con bloqueo.
 *
 * @param {import('sequelize').ModelStatic} model
 * @param {string} idField
 * @param {object} data
 * @returns {Promise<object>}
 */
const createGlobalConId = async (model, idField, data) => {
  return sequelize.transaction(async (transaction) => {
    const nextId = await getNextGlobalId(model, idField, transaction);
    return model.create({ ...data, [idField]: nextId }, { transaction });
  });
};

module.exports = { parseEmpresaId, getNextId, createConId, getNextGlobalId, createGlobalConId };
