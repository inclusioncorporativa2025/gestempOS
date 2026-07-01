-- Justificantes de ausencias (PDF o imagen). Ejecutar manualmente sobre MySQL gestemp.

CREATE TABLE IF NOT EXISTS usuarios_ausencias_documentos (
  empresa_id              INT NOT NULL,
  id_documento            INT NOT NULL,
  id_ausencia             INT NOT NULL COMMENT 'FK lógica a ausencias(empresa_id, id_ausencia)',
  id_usuario              INT NOT NULL COMMENT 'Empleado titular de la ausencia',
  nombre_archivo          VARCHAR(255) NOT NULL,
  ruta_archivo            VARCHAR(500) NOT NULL COMMENT 'documentos/{empresa_id}/ausencias/{id_usuario}/{id_ausencia}/...',
  mime_type               VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  tamano_bytes            INT UNSIGNED NULL,
  hash_sha256             CHAR(64) NULL,
  tipo_justificante       VARCHAR(50) NULL
    COMMENT 'parte_medico | parte_accidente | certificado | citacion | otro',
  usuario_alta            INT NOT NULL,
  fecha_alta              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_baja              DATETIME NULL,
  usuario_baja            INT NULL,
  PRIMARY KEY (empresa_id, id_documento),
  KEY idx_uad_ausencia (empresa_id, id_ausencia, fecha_baja),
  KEY idx_uad_usuario (empresa_id, id_usuario, fecha_baja)
);
