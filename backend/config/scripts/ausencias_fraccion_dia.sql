-- Fracción de día en solicitudes de ausencia (vacaciones).
ALTER TABLE ausencias
  ADD COLUMN fraccion_dia VARCHAR(10) NULL
  COMMENT 'completo | manana | tarde' AFTER tipo;
