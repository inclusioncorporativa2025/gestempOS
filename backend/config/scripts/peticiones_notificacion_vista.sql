-- Marca si el empleado ya vio la resolución de su petición (para el badge del header).
ALTER TABLE peticiones
  ADD COLUMN notificacion_vista TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1 si el empleado ya vio la resolución de la petición'
  AFTER motivo_rechazo;
