-- Flujo de aprobación de ausencias (ejecutar manualmente sobre MySQL gestemp).

ALTER TABLE ausencias
  ADD COLUMN fecha_aceptacion DATETIME NULL AFTER fecha_alta,
  ADD COLUMN fecha_cancelacion DATETIME NULL AFTER fecha_aceptacion,
  ADD COLUMN id_usuario_gestor INT NULL AFTER fecha_cancelacion,
  ADD COLUMN motivo_rechazo TEXT NULL AFTER id_usuario_gestor,
  ADD COLUMN notificacion_vista TINYINT(1) NOT NULL DEFAULT 0 AFTER motivo_rechazo;

-- Ausencias existentes: considerarlas ya aprobadas.
UPDATE ausencias
SET fecha_aceptacion = COALESCE(fecha_alta, NOW())
WHERE fecha_baja IS NULL
  AND fecha_aceptacion IS NULL
  AND fecha_cancelacion IS NULL;
