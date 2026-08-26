-- Peticiones de corrección también para descansos (nullable id_fichaje / id_descanso).
-- Ejecutar en prod cuando corresponda.

ALTER TABLE peticiones
  ADD COLUMN id_descanso INT NULL AFTER id_fichaje;

ALTER TABLE peticiones
  MODIFY COLUMN nueva_salida DATETIME NULL;

ALTER TABLE peticiones
  MODIFY COLUMN salida_original DATETIME NULL;
