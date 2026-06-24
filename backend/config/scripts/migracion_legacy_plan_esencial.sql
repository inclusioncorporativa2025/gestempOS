-- Migración empresas legacy → plan Esencial (facturación + histórico)
-- Ejecutar manualmente sobre MySQL (gestemp).
--
-- Catálogo planes (verificado):
--   id_plan=1  codigo=esencial  min_licencias=5
--   id_plan=2  codigo=rrhh      min_licencias=10
--   id_plan=3  codigo=completo  min_licencias=15
--
-- Estado previo:
--   - m_empresas.plan ya existe (DEFAULT 'esencial') → la app usa esta columna
--   - empresa_facturacion: filas legacy con id_plan NULL
--   - Todas las empresas activas tienen fila en empresa_facturacion

-- PASO 1: asegurar m_empresas.plan = esencial
UPDATE m_empresas
SET plan = 'esencial'
WHERE plan IS NULL OR plan = '';

-- PASO 2: asignar plan Esencial (id_plan = 1) en facturación a legacy sin plan
UPDATE empresa_facturacion ef
INNER JOIN planes p ON p.codigo = 'esencial' AND p.activo = 1
SET
  ef.id_plan = p.id_plan,
  ef.modo_facturacion = 'legacy'
WHERE ef.id_plan IS NULL
  AND ef.modo_facturacion = 'legacy';

-- PASO 3: licencias — ver script dedicado migracion_legacy_licencias.sql
--   B1) copia m_empresas.licencias → licencias_facturadas
--   B2) estima m_empresas.licencias (vínculos - 1 admin, mínimo del plan)
--   B3) sincroniza facturación

-- PASO 4 (opcional): histórico de plan — descomenta y ajusta columnas según DESCRIBE empresa_plan_historial
-- INSERT INTO empresa_plan_historial (
--   id_empresa, id_plan, modo_facturacion, motivo, usuario_alta, fecha_alta
-- )
-- SELECT
--   ef.id_empresa,
--   ef.id_plan,
--   'legacy',
--   'Migración inicial: empresas legacy asignadas a plan Esencial',
--   NULL,
--   NOW()
-- FROM empresa_facturacion ef
-- WHERE ef.modo_facturacion = 'legacy'
--   AND ef.id_plan IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM empresa_plan_historial h
--     WHERE h.id_empresa = ef.id_empresa
--   );

-- PASO 5: verificación
-- SELECT COUNT(*) AS legacy_sin_plan
-- FROM empresa_facturacion
-- WHERE modo_facturacion = 'legacy' AND id_plan IS NULL;
--
-- SELECT ef.id_empresa, e.nombre, e.plan, ef.id_plan, ef.licencias_facturadas
-- FROM empresa_facturacion ef
-- JOIN m_empresas e ON e.id_empresa = ef.id_empresa
-- WHERE ef.modo_facturacion = 'legacy'
-- ORDER BY ef.id_empresa
-- LIMIT 20;
