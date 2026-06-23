-- Bolsa de horas: movimientos mensuales y ajustes manuales por empleado.
-- Ejecutar manualmente sobre la base de datos MySQL.

CREATE TABLE IF NOT EXISTS bolsa_horas_movimientos (
  empresa_id       INT NOT NULL,
  id_movimiento    INT NOT NULL,
  id_usuario       INT NOT NULL,
  mes              CHAR(7) NULL COMMENT 'YYYY-MM; obligatorio para tipo_movimiento=mes',
  minutos          INT NOT NULL COMMENT 'Positivo acumula, negativo compensa',
  tipo_movimiento  VARCHAR(20) NOT NULL DEFAULT 'mes' COMMENT 'mes | ajuste_manual',
  motivo           VARCHAR(255) NULL,
  id_mes_cierre    INT NULL,
  usuario_alta     INT NULL,
  fecha_alta       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_baja       DATETIME NULL,
  usuario_baja     INT NULL,
  PRIMARY KEY (empresa_id, id_movimiento),
  UNIQUE KEY uq_bolsa_mes_usuario (empresa_id, id_usuario, mes, tipo_movimiento),
  KEY idx_bolsa_usuario (empresa_id, id_usuario),
  KEY idx_bolsa_mes (empresa_id, id_usuario, mes)
);
