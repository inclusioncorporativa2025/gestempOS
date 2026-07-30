-- Notificación a gestores cuando el personal modifica una ausencia aprobada.
-- mysql -u ... -p gestemp < backend/config/scripts/ausencias_notificacion_gestor.sql

ALTER TABLE ausencias
  ADD COLUMN notificacion_gestor_vista TINYINT(1) NOT NULL DEFAULT 1
  COMMENT '0 = gestor debe ver modificación del empleado'
  AFTER notificacion_vista;
