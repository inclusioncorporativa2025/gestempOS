-- Soporte fichaje por WhatsApp (plan Completo)
-- Ejecutar manualmente sobre la base de datos MySQL.

ALTER TABLE m_usuarios
  ADD COLUMN telefono_whatsapp VARCHAR(20) NULL
  COMMENT 'Teléfono E.164 sin +, p. ej. 34612345678'
  AFTER dni;

CREATE UNIQUE INDEX idx_usuarios_telefono_whatsapp
  ON m_usuarios (telefono_whatsapp);

CREATE TABLE IF NOT EXISTS openwa_webhook_events (
  idempotency_key VARCHAR(128) NOT NULL PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NULL,
  chat_id VARCHAR(64) NULL,
  estado ENUM('received', 'processed', 'ignored', 'error') NOT NULL DEFAULT 'received',
  error_mensaje VARCHAR(500) NULL,
  procesado_en DATETIME NULL,
  fecha_alta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS whatsapp_chat_contexto (
  chat_id VARCHAR(64) NOT NULL PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_empresa INT NULL,
  paso VARCHAR(32) NOT NULL DEFAULT 'menu',
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_whatsapp_ctx_usuario FOREIGN KEY (id_usuario) REFERENCES m_usuarios (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
