-- Festivos oficiales importados + región de festivos en empresa.
-- Ejecutar manualmente sobre MySQL (gestemp).

ALTER TABLE m_empresas
  ADD COLUMN codigo_region_festivos VARCHAR(10) NULL
  COMMENT 'Código ISO CCAA para Nager.Date (p. ej. ES-MD)'
  AFTER provincia;

ALTER TABLE festivos_empresa
  ADD COLUMN origen VARCHAR(20) NOT NULL DEFAULT 'local'
  COMMENT 'oficial | local'
  AFTER descripcion;

ALTER TABLE festivos_empresa
  ADD COLUMN external_key VARCHAR(50) NULL
  COMMENT 'Clave externa (p. ej. 2026:2026-01-01)'
  AFTER origen;

CREATE INDEX idx_festivos_empresa_origen ON festivos_empresa (empresa_id, origen, fecha);
