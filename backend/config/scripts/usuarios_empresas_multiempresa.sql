-- Multi-empresa: rol por membresía y vínculo único usuario-empresa.
-- Ejecutar manualmente sobre la base de datos MySQL.

ALTER TABLE m_usuarios_empresas
  ADD COLUMN tipo_usuario INT NULL COMMENT 'Rol en esta empresa (3-6)' AFTER id_empresa;

UPDATE m_usuarios_empresas ue
INNER JOIN m_usuarios u ON u.id_usuario = ue.id_usuario
SET ue.tipo_usuario = u.tipo_usuario
WHERE ue.tipo_usuario IS NULL
  AND ue.fecha_baja IS NULL
  AND u.tipo_usuario IN (3, 4, 5, 6);

CREATE UNIQUE INDEX uq_usuarios_empresas_par
  ON m_usuarios_empresas (id_usuario, id_empresa);
