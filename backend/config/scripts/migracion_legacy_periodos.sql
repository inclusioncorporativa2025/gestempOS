-- Migración periodos de facturación legacy → empresa_facturacion
-- Ejecutar manualmente sobre MySQL (gestemp).
--
-- Clientes legacy: ciclo ANUAL anclado a m_empresas.fecha_alta (aniversario).
-- No modifica clientes stripe/trial con suscripción activa.
--
-- Orden recomendado:
--   1) migracion_legacy_plan_esencial.sql
--   2) migracion_legacy_licencias.sql
--   3) Este script
--
-- La app también recalcula periodos legacy al consultar facturación
-- (backend/utils/legacyBillingPeriod.js + billingService).

-- =============================================================================
-- A) DIAGNÓSTICO
-- =============================================================================

-- SELECT
--   e.id_empresa,
--   e.nombre,
--   e.fecha_alta,
--   ef.modo_facturacion,
--   ef.ciclo_facturacion,
--   ef.current_period_start,
--   ef.current_period_end
-- FROM m_empresas e
-- LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
-- WHERE e.fecha_baja IS NULL
--   AND (ef.modo_facturacion = 'legacy' OR ef.modo_facturacion IS NULL)
--   AND ef.stripe_subscription_id IS NULL
-- ORDER BY e.fecha_alta;

-- =============================================================================
-- B) Filas faltantes + modo legacy + ciclo anual
-- =============================================================================

INSERT INTO empresa_facturacion (
  id_empresa, modo_facturacion, id_plan, licencias_facturadas, ciclo_facturacion
)
SELECT
  e.id_empresa,
  'legacy',
  COALESCE(p.id_plan, 1),
  COALESCE(e.licencias, p.min_licencias, 5),
  'anual'
FROM m_empresas e
LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
LEFT JOIN planes p ON p.codigo = COALESCE(NULLIF(e.plan, ''), 'esencial') AND p.activo = 1
WHERE e.fecha_baja IS NULL
  AND ef.id_empresa IS NULL;

UPDATE empresa_facturacion ef
INNER JOIN m_empresas e ON e.id_empresa = ef.id_empresa AND e.fecha_baja IS NULL
SET ef.modo_facturacion = 'legacy'
WHERE ef.stripe_subscription_id IS NULL
  AND (ef.modo_facturacion IS NULL OR ef.modo_facturacion = '');

UPDATE empresa_facturacion ef
INNER JOIN m_empresas e ON e.id_empresa = ef.id_empresa AND e.fecha_baja IS NULL
SET ef.ciclo_facturacion = 'anual'
WHERE ef.modo_facturacion = 'legacy'
  AND ef.stripe_subscription_id IS NULL
  AND (ef.ciclo_facturacion IS NULL OR ef.ciclo_facturacion = '' OR ef.ciclo_facturacion = 'mensual');

-- =============================================================================
-- C) Periodo anual actual desde fecha_alta (aniversario)
-- =============================================================================

UPDATE empresa_facturacion ef
INNER JOIN m_empresas e ON e.id_empresa = ef.id_empresa AND e.fecha_baja IS NULL
SET
  ef.current_period_start = DATE_ADD(
    DATE(e.fecha_alta),
    INTERVAL (
      YEAR(CURDATE()) - YEAR(DATE(e.fecha_alta))
      - IF(DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(e.fecha_alta, '%m%d'), 1, 0)
    ) YEAR
  ),
  ef.current_period_end = DATE_ADD(
    DATE(e.fecha_alta),
    INTERVAL (
      YEAR(CURDATE()) - YEAR(DATE(e.fecha_alta))
      - IF(DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(e.fecha_alta, '%m%d'), 1, 0)
      + 1
    ) YEAR
  )
WHERE ef.modo_facturacion = 'legacy'
  AND ef.stripe_subscription_id IS NULL
  AND e.fecha_alta IS NOT NULL
  AND (
    ef.current_period_start IS NULL
    OR ef.current_period_end IS NULL
    OR ef.ciclo_facturacion = 'anual'
  );

-- =============================================================================
-- D) VERIFICACIÓN
-- =============================================================================

-- Legacy activos sin periodo (debe ser 0)
-- SELECT e.id_empresa, e.nombre, ef.ciclo_facturacion,
--        ef.current_period_start, ef.current_period_end
-- FROM m_empresas e
-- JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
-- WHERE e.fecha_baja IS NULL
--   AND ef.modo_facturacion = 'legacy'
--   AND ef.stripe_subscription_id IS NULL
--   AND (ef.current_period_start IS NULL OR ef.current_period_end IS NULL);
