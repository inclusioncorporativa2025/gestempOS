-- Migra tipos de ausencia antiguos al catálogo vigente (ejecutar sobre MySQL gestemp).
-- Tipos nuevos: Vacaciones, Baja médica / IT, Accidente laboral, Maternidad / Paternidad / Cuidado,
-- Permiso retribuido, Permiso no retribuido, Formación, Otros.

UPDATE ausencias
SET tipo = 'Baja médica / IT'
WHERE fecha_baja IS NULL
  AND TRIM(tipo) IN ('Baja', 'baja');

UPDATE ausencias
SET tipo = 'Permiso retribuido'
WHERE fecha_baja IS NULL
  AND LOWER(TRIM(tipo)) IN ('asuntos propios', 'días retribuidos', 'dias retribuidos');

UPDATE ausencias
SET tipo = 'Otros'
WHERE fecha_baja IS NULL
  AND TRIM(tipo) = 'otros';
