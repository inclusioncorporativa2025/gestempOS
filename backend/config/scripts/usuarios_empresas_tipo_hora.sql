-- tipo_hora por membresía (NULL = hereda de jornadas.tipo_hora)
-- Ejecutar si no está aplicado en el entorno.

ALTER TABLE m_usuarios_empresas
  ADD COLUMN tipo_hora INT NULL
  COMMENT '1=Extra, 2=Complementaria, 3=Bolsa. NULL=hereda jornada'
  AFTER tipo_usuario;
