-- Motivo del gestor al rechazar una petición de cambio de horario.
-- Ejecutar en la BD de cada entorno (local y producción).

ALTER TABLE peticiones
  ADD COLUMN motivo_rechazo TEXT NULL
  COMMENT 'Motivo indicado por el gestor al rechazar la petición'
  AFTER fecha_cancelacion;
