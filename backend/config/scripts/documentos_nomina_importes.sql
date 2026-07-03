-- Importes opcionales de la nómina oficial (PDF) para comparativa y consulta del empleado.
-- Ejecutar manualmente sobre la BD gestemp.

ALTER TABLE usuarios_documentos_nomina
  ADD COLUMN importe_bruto DECIMAL(10, 2) NULL COMMENT 'Bruto devengado según nómina oficial' AFTER hash_sha256,
  ADD COLUMN importe_deducciones DECIMAL(10, 2) NULL COMMENT 'Total deducciones según nómina oficial' AFTER importe_bruto,
  ADD COLUMN importe_liquido DECIMAL(10, 2) NULL COMMENT 'Líquido a percibir según nómina oficial' AFTER importe_deducciones;
