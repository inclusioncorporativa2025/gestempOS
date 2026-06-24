const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Usuario = require('../models/Usuario');
const { ROLE_GROUPS, ROLES } = require('../middleware/authMiddleware');

const isEmailValido = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

/** Gestores de la empresa (tipos 3 y 4) + super-admins globales (tipo 1) con email válido. */
const obtenerEmailsGestoresEmpresa = async (idEmpresa) => {
  const usuariosEmpresa = await sequelize.query(
    'SELECT id_usuario FROM m_usuarios_empresas WHERE id_empresa = :idEmpresa AND fecha_baja IS NULL',
    {
      type: QueryTypes.SELECT,
      replacements: { idEmpresa },
    },
  );

  const usuariosIds = usuariosEmpresa.map((u) => Number(u.id_usuario));

  const [vinculados, rootsGlobales] = await Promise.all([
    usuariosIds.length
      ? Usuario.findAll({
          where: {
            id_usuario: { [Op.in]: usuariosIds },
            tipo_usuario: { [Op.in]: ROLE_GROUPS.COMPANY_STAFF },
            fecha_baja: null,
          },
          attributes: ['email'],
          raw: true,
        })
      : [],
    Usuario.findAll({
      where: {
        tipo_usuario: ROLES.ROOT,
        fecha_baja: null,
      },
      attributes: ['email'],
      raw: true,
    }),
  ]);

  const emails = [...vinculados, ...rootsGlobales]
    .map((u) => u.email)
    .filter(isEmailValido);

  return [...new Set(emails)];
};

module.exports = {
  isEmailValido,
  obtenerEmailsGestoresEmpresa,
};
