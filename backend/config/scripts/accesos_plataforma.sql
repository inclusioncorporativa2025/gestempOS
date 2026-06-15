-- Registro de accesos y navegación en la aplicación (auditoría para roles de plataforma).
CREATE TABLE IF NOT EXISTS m_accesos_plataforma (
  id_acceso INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  tipo_evento VARCHAR(20) NOT NULL COMMENT 'login | navegacion',
  ruta VARCHAR(500) NOT NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  id_empresa INT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_accesos_fecha (fecha),
  INDEX idx_accesos_usuario (id_usuario),
  INDEX idx_accesos_tipo (tipo_evento),
  CONSTRAINT fk_accesos_usuario FOREIGN KEY (id_usuario) REFERENCES m_usuarios (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
