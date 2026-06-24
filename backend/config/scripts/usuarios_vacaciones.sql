-- Saldo de vacaciones por empleado y empresa (ejecutar si aún no existen las tablas).

CREATE TABLE IF NOT EXISTS usuarios_vacaciones_cupo (
  empresa_id              INT NOT NULL,
  id_cupo                 INT NOT NULL,
  id_usuario              INT NOT NULL,
  anio                    SMALLINT NOT NULL COMMENT 'Año natural, ej. 2025',
  dias_asignados          DECIMAL(5,1) NOT NULL DEFAULT 0,
  dias_arrastre_entrada   DECIMAL(5,1) NOT NULL DEFAULT 0 COMMENT 'Días de años anteriores',
  dias_arrastre_salida    DECIMAL(5,1) NOT NULL DEFAULT 0 COMMENT 'Días que pasan al año siguiente',
  fecha_limite_disfrute   DATE NULL,
  observaciones           VARCHAR(500) NULL,
  usuario_alta            INT NULL,
  fecha_alta              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_modificacion    INT NULL,
  fecha_modificacion      DATETIME NULL,
  fecha_baja              DATETIME NULL,
  usuario_baja            INT NULL,
  PRIMARY KEY (empresa_id, id_cupo),
  UNIQUE KEY uq_uvc_usuario_anio (empresa_id, id_usuario, anio),
  KEY idx_uvc_usuario (empresa_id, id_usuario)
);

CREATE TABLE IF NOT EXISTS usuarios_vacaciones_movimientos (
  empresa_id              INT NOT NULL,
  id_movimiento           INT NOT NULL,
  id_usuario              INT NOT NULL,
  anio                    SMALLINT NOT NULL COMMENT 'Año del cupo afectado',
  dias                    DECIMAL(5,1) NOT NULL COMMENT 'Negativo consume, positivo devuelve/ajusta',
  tipo_movimiento         VARCHAR(30) NOT NULL
    COMMENT 'consumo | anulacion_consumo | ajuste_manual',
  fraccion_dia            VARCHAR(10) NULL
    COMMENT 'completo | manana | tarde',
  fecha_disfrute          DATE NULL,
  fecha_disfrute_hasta    DATE NULL,
  id_ausencia             INT NULL,
  id_usuario_gestor       INT NULL,
  motivo                  VARCHAR(500) NULL,
  usuario_alta            INT NULL,
  fecha_alta              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_baja              DATETIME NULL,
  usuario_baja            INT NULL,
  PRIMARY KEY (empresa_id, id_movimiento),
  KEY idx_uvm_usuario_anio (empresa_id, id_usuario, anio),
  KEY idx_uvm_ausencia (empresa_id, id_ausencia)
);

-- Opcional: fracción de día en solicitudes de ausencia
-- ALTER TABLE ausencias
--   ADD COLUMN fraccion_dia VARCHAR(10) NULL COMMENT 'completo | manana | tarde';
