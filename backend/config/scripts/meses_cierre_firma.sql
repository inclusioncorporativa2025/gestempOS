-- Firma manuscrita y huellas de integridad del cierre mensual.
ALTER TABLE meses_cierre
  ADD COLUMN firma_imagen MEDIUMTEXT NULL
    COMMENT 'Imagen PNG base64 de la firma del empleado'
    AFTER fecha_baja,
  ADD COLUMN firma_hash CHAR(64) NULL
    COMMENT 'SHA-256 de usuario+mes+hash registro+firma'
    AFTER firma_imagen,
  ADD COLUMN hash_registro_mes CHAR(64) NULL
    COMMENT 'Hash raíz de los fichajes del mes al momento de firmar'
    AFTER firma_hash;
