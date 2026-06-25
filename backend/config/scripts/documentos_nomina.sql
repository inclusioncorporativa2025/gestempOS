-- Nóminas definitivas (PDF subido por admin), asignadas a cada empleado.
-- La prenómina no se almacena aquí: se genera automáticamente desde fichajes.
-- Ejecutar manualmente sobre la BD gestemp.

CREATE TABLE IF NOT EXISTS documentos_nomina (
  empresa_id              INT NOT NULL,
  id_documento            INT NOT NULL,
  id_usuario              INT NOT NULL COMMENT 'Empleado al que pertenece la nómina',
  periodo_mes             TINYINT UNSIGNED NOT NULL COMMENT '1-12',
  periodo_anio            SMALLINT UNSIGNED NOT NULL,
  nombre_archivo          VARCHAR(255) NOT NULL COMMENT 'Nombre original del PDF',
  ruta_archivo            VARCHAR(500) NOT NULL COMMENT 'Ruta relativa en disco (uploads/)',
  mime_type               VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  tamano_bytes            INT UNSIGNED NULL,
  hash_sha256             CHAR(64) NULL,
  fecha_publicacion       DATETIME NOT NULL,
  visto_en                DATETIME NULL COMMENT 'Primera descarga/visualización del empleado',
  usuario_alta            INT NOT NULL,
  fecha_alta              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_baja              DATETIME NULL,
  usuario_baja            INT NULL,
  PRIMARY KEY (empresa_id, id_documento),
  KEY idx_dn_usuario (empresa_id, id_usuario, fecha_baja),
  KEY idx_dn_periodo (empresa_id, periodo_anio, periodo_mes, fecha_baja),
  UNIQUE KEY uq_dn_usuario_periodo_activo (empresa_id, id_usuario, periodo_anio, periodo_mes, fecha_baja)
);
