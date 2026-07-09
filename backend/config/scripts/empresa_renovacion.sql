-- Tokens y avisos de renovación legacy (7 días antes de current_period_end)
-- Ejecutar: mysql -u root -p gestemp < backend/config/scripts/empresa_renovacion.sql
--
-- Cron diario (crontab del servidor, 08:00):
--   0 8 * * * cd /ruta/gestempOS/backend && node scripts/enviar-avisos-renovacion-legacy.js >> /var/log/timecor-renovacion.log 2>&1

CREATE TABLE IF NOT EXISTS empresa_renovacion_token (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  period_end DATE NOT NULL,
  expira_en DATETIME NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_renovacion_token (token_hash),
  KEY idx_renovacion_empresa (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS empresa_renovacion_aviso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT NOT NULL,
  period_end DATE NOT NULL,
  tipo VARCHAR(32) NOT NULL DEFAULT '7_dias',
  email_destino VARCHAR(255) NULL,
  enviado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_renovacion_aviso (id_empresa, period_end, tipo),
  KEY idx_renovacion_aviso_empresa (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
