-- Marca si el empleado ya vio la resolución de su cierre mensual (badge del header).
ALTER TABLE meses_cierre
  ADD COLUMN notificacion_vista TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1 si el empleado ya vio la resolución del cierre mensual'
  AFTER fecha_baja;
