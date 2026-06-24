-- Tokens de restablecimiento de contraseña (forgot-password / bienvenida).
-- Ejecutar si falla el reset con error de columna desconocida.
-- Comprobar antes: DESCRIBE m_usuarios;

ALTER TABLE m_usuarios
  ADD COLUMN reset_token_hash VARCHAR(255) NULL
  COMMENT 'SHA-256 del token de reset'
  AFTER requiere_reset_password;

ALTER TABLE m_usuarios
  ADD COLUMN reset_token_expira DATETIME NULL
  COMMENT 'Caducidad del token de reset'
  AFTER reset_token_hash;
