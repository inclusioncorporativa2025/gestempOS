-- Esquema alineado con la tabla en producción (DESCRIBE fichaje_registro_eventos).
-- No hace falta ALTER si ya coincide; solo usar si creas la tabla desde cero.

CREATE TABLE IF NOT EXISTS fichaje_registro_eventos (
  id_evento       INT          NOT NULL,
  empresa_id      INT          NOT NULL,
  id_usuario      INT          NOT NULL,
  tipo            VARCHAR(20)  NOT NULL,
  fecha           DATE         NOT NULL,
  hora            TIME         NOT NULL,
  ubicacion       VARCHAR(255) DEFAULT '',
  observaciones   VARCHAR(500) DEFAULT '',
  hash            CHAR(64)     NOT NULL,
  id_fichaje_ref  INT          NULL,
  id_descanso_ref INT          NULL,
  fecha_alta      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_evento, empresa_id),
  INDEX idx_fre_empresa_usuario_fecha (empresa_id, id_usuario, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Opcional: guardar quién generó el evento (no existe en tu tabla actual)
-- ALTER TABLE fichaje_registro_eventos
--   ADD COLUMN usuario_alta INT NULL AFTER id_descanso_ref;
