const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { ROLES } = require('../middleware/authMiddleware');

const isEmailValido = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

/** Admin (3) y supervisor (4) activos en la empresa, con email válido. */
const obtenerEmailsGestoresEmpresa = async (idEmpresa) => {
  const filas = await sequelize.query(
    `SELECT DISTINCT u.email
     FROM m_usuarios_empresas ue
     INNER JOIN m_usuarios u ON u.id_usuario = ue.id_usuario
     WHERE ue.id_empresa = :idEmpresa
       AND ue.fecha_baja IS NULL
       AND u.fecha_baja IS NULL
       AND IFNULL(ue.activo, 1) = 1
       AND IFNULL(u.activo, 1) = 1
       AND COALESCE(ue.tipo_usuario, u.tipo_usuario) IN (:tipoAdmin, :tipoSupervisor)`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        idEmpresa,
        tipoAdmin: ROLES.ADMIN_EMPRESA,
        tipoSupervisor: ROLES.SUPERVISOR,
      },
    },
  );

  const emails = filas.map((r) => r.email).filter(isEmailValido);
  return [...new Set(emails)];
};

module.exports = {
  isEmailValido,
  obtenerEmailsGestoresEmpresa,
};
