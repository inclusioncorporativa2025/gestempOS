-- Tabla de auditoría de fichajes (eventos inmutables con hash SHA-256).
-- Ejecutar por cada empresa existente si la tabla aún no existe.

CREATE TABLE IF NOT EXISTS fichaje_registro_eventos (
  empresa_id      INT          NOT NULL,
  id_evento       INT          NOT NULL,
  id_usuario      INT          NOT NULL,
  tipo            VARCHAR(20)  NOT NULL COMMENT 'entrada|salida|pausa|pausa_fin|edicion_autorizada',
  fecha           DATE         NOT NULL,
  hora            TIME         NOT NULL,
  ubicacion       VARCHAR(255) DEFAULT '',
  observaciones   VARCHAR(500) DEFAULT '',
  hash            CHAR(64)     NOT NULL,
  id_fichaje      INT          NULL,
  id_descanso     INT          NULL,
  usuario_alta    INT          NULL,
  fecha_alta      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (empresa_id, id_evento),
  INDEX idx_fre_empresa_usuario_fecha (empresa_id, id_usuario, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
