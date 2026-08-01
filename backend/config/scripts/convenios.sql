-- Convenios: catálogo global, incorporación por empresa y asignación al personal.
-- Ejecutar manualmente sobre MySQL (gestemp).
--
-- mysql -u ... -p gestemp < backend/config/scripts/convenios.sql

-- ---------------------------------------------------------------------------
-- 1) Catálogo global (ROOT)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_convenios (
  id_convenio               INT NOT NULL AUTO_INCREMENT,
  codigo                    VARCHAR(40) NOT NULL,
  nombre                    VARCHAR(255) NOT NULL,
  modo_conteo_vacaciones    ENUM('natural', 'laboral') NOT NULL DEFAULT 'natural',
  dias_cupo_defecto         DECIMAL(5,1) NOT NULL DEFAULT 30,
  excluir_festivos          TINYINT(1) NOT NULL DEFAULT 0,
  permite_medio_dia         TINYINT(1) NOT NULL DEFAULT 1,
  horas_anuales             SMALLINT NULL,
  horas_semanales           DECIMAL(4,2) NULL,
  dias_semana_laborables    TINYINT NULL,
  tipo_jornada              ENUM('completa', 'parcial') NOT NULL DEFAULT 'completa',
  descripcion               TEXT NULL,
  ambito                    VARCHAR(40) NULL,
  vigencia_inicio           DATE NULL,
  vigencia_fin              DATE NULL,
  orden                     SMALLINT NOT NULL DEFAULT 0,
  activo                    TINYINT(1) NOT NULL DEFAULT 1,
  usuario_alta              INT NULL,
  fecha_alta                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_modificacion      INT NULL,
  fecha_modificacion        DATETIME NULL,
  fecha_baja                DATETIME NULL,
  usuario_baja              INT NULL,
  PRIMARY KEY (id_convenio),
  UNIQUE KEY uq_catalogo_convenios_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 2) Convenios incorporados por empresa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_convenios (
  id_empresa_convenio       INT NOT NULL AUTO_INCREMENT,
  id_empresa                INT NOT NULL,
  id_convenio               INT NOT NULL,
  nombre_visible            VARCHAR(120) NULL,
  activo                    TINYINT(1) NOT NULL DEFAULT 1,
  es_defecto                TINYINT(1) NOT NULL DEFAULT 0,
  empresa_defecto_unico     INT
    GENERATED ALWAYS AS (
      CASE
        WHEN es_defecto = 1 AND activo = 1 THEN id_empresa
        ELSE NULL
      END
    ) STORED,
  usuario_alta              INT NULL,
  fecha_alta                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_modificacion      INT NULL,
  fecha_modificacion        DATETIME NULL,
  fecha_baja                DATETIME NULL,
  usuario_baja              INT NULL,
  PRIMARY KEY (id_empresa_convenio),
  UNIQUE KEY uq_empresa_convenio (id_empresa, id_convenio),
  UNIQUE KEY uq_empresa_convenio_defecto (empresa_defecto_unico),
  KEY idx_empresa_convenios_empresa (id_empresa),
  KEY idx_empresa_convenios_convenio (id_convenio),
  CONSTRAINT fk_empresa_convenios_empresa
    FOREIGN KEY (id_empresa) REFERENCES m_empresas (id_empresa)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_empresa_convenios_catalogo
    FOREIGN KEY (id_convenio) REFERENCES catalogo_convenios (id_convenio)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 3) Asignación al personal (membresía usuario–empresa)
--    La columna debe referenciar empresa_convenios.id_empresa_convenio
--    (no catalogo_convenios.id_convenio).
-- ---------------------------------------------------------------------------

-- Si existe id_convenio (nombre legacy), renombrar a id_empresa_convenio
SET @has_legacy := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'm_usuarios_empresas'
    AND COLUMN_NAME = 'id_convenio'
);

SET @has_target := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'm_usuarios_empresas'
    AND COLUMN_NAME = 'id_empresa_convenio'
);

SET @ddl_rename := IF(
  @has_legacy = 1 AND @has_target = 0,
  'ALTER TABLE m_usuarios_empresas
     CHANGE COLUMN id_convenio id_empresa_convenio INT NULL
       COMMENT ''FK a empresa_convenios.id_empresa_convenio''',
  'SELECT ''Sin renombrado id_convenio -> id_empresa_convenio'' AS info'
);

PREPARE stmt_rename FROM @ddl_rename;
EXECUTE stmt_rename;
DEALLOCATE PREPARE stmt_rename;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'm_usuarios_empresas'
    AND COLUMN_NAME = 'id_empresa_convenio'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE m_usuarios_empresas
     ADD COLUMN id_empresa_convenio INT NULL
       COMMENT ''FK a empresa_convenios.id_empresa_convenio''
       AFTER tipo_hora,
     ADD KEY idx_usuarios_empresas_convenio (id_empresa_convenio)',
  'SELECT ''Columna id_empresa_convenio ya existe en m_usuarios_empresas'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK (eliminar legacy si apuntaba al catálogo y recrear hacia empresa_convenios)
SET @fk_legacy := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'm_usuarios_empresas'
    AND COLUMN_NAME = 'id_empresa_convenio'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @ddl_drop_fk := IF(
  @fk_legacy IS NOT NULL,
  CONCAT('ALTER TABLE m_usuarios_empresas DROP FOREIGN KEY ', @fk_legacy),
  'SELECT ''Sin FK previa en id_empresa_convenio'' AS info'
);

PREPARE stmt_drop FROM @ddl_drop_fk;
EXECUTE stmt_drop;
DEALLOCATE PREPARE stmt_drop;

SET @fk_ok := (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'm_usuarios_empresas'
    AND COLUMN_NAME = 'id_empresa_convenio'
    AND REFERENCED_TABLE_NAME = 'empresa_convenios'
);

SET @ddl_fk := IF(
  @fk_ok = 0,
  'ALTER TABLE m_usuarios_empresas
     ADD CONSTRAINT fk_usuarios_empresas_convenio
       FOREIGN KEY (id_empresa_convenio)
       REFERENCES empresa_convenios (id_empresa_convenio)
       ON DELETE SET NULL
       ON UPDATE CASCADE',
  'SELECT ''FK fk_usuarios_empresas_convenio ya existe'' AS info'
);

PREPARE stmt_fk FROM @ddl_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;
