-- Migración licencias legacy → m_empresas.licencias + empresa_facturacion.licencias_facturadas
-- Ejecutar manualmente sobre MySQL (gestemp).
--
-- Lógica (igual que la app en usuariosEmpresasRepository):
--   licencias_usadas = vínculos activos (m_usuarios_empresas) - 1  (el admin no cuenta)
--   licencias contratadas = MAX(licencias_usadas, min_licencias del plan)
--
-- Orden recomendado:
--   1) Consultas de diagnóstico (sección A)
--   2) Updates (sección B)
--   3) Verificación (sección C)

-- =============================================================================
-- A) DIAGNÓSTICO (solo lectura — ejecutar antes)
-- =============================================================================

-- Empresas sin licencias en m_empresas
-- SELECT e.id_empresa, e.nombre, e.licencias, ef.licencias_facturadas, p.min_licencias
-- FROM m_empresas e
-- JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
-- JOIN planes p ON p.id_plan = ef.id_plan
-- WHERE e.fecha_baja IS NULL
--   AND e.licencias IS NULL
-- ORDER BY e.id_empresa;

-- Vista previa del cálculo propuesto (sin modificar nada)
-- SELECT
--   e.id_empresa,
--   e.nombre,
--   e.licencias AS licencias_actuales,
--   ef.licencias_facturadas AS facturadas_actuales,
--   IFNULL(cu.vinculos, 0) AS vinculos_activos,
--   GREATEST(GREATEST(IFNULL(cu.vinculos, 1) - 1, 0), p.min_licencias) AS licencias_propuestas
-- FROM m_empresas e
-- JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
-- JOIN planes p ON p.id_plan = ef.id_plan
-- LEFT JOIN (
--   SELECT id_empresa, COUNT(*) AS vinculos
--   FROM m_usuarios_empresas
--   WHERE fecha_baja IS NULL
--   GROUP BY id_empresa
-- ) cu ON cu.id_empresa = e.id_empresa
-- WHERE e.fecha_baja IS NULL
--   AND ef.modo_facturacion = 'legacy'
-- ORDER BY e.id_empresa;

-- =============================================================================
-- B) MIGRACIÓN
-- =============================================================================

-- B1) Copiar licencias ya conocidas en m_empresas → facturación
UPDATE empresa_facturacion ef
INNER JOIN m_empresas e ON e.id_empresa = ef.id_empresa
SET ef.licencias_facturadas = e.licencias
WHERE ef.modo_facturacion = 'legacy'
  AND ef.licencias_facturadas IS NULL
  AND e.licencias IS NOT NULL
  AND e.fecha_baja IS NULL;

-- B2) Rellenar m_empresas.licencias donde falta (estimar por uso + mínimo del plan)
UPDATE m_empresas e
INNER JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
INNER JOIN planes p ON p.id_plan = ef.id_plan
LEFT JOIN (
  SELECT id_empresa, COUNT(*) AS vinculos
  FROM m_usuarios_empresas
  WHERE fecha_baja IS NULL
  GROUP BY id_empresa
) cu ON cu.id_empresa = e.id_empresa
SET e.licencias = GREATEST(
  GREATEST(IFNULL(cu.vinculos, 1) - 1, 0),
  p.min_licencias
)
WHERE e.licencias IS NULL
  AND e.fecha_baja IS NULL
  AND ef.modo_facturacion = 'legacy';

-- B3) Sincronizar facturación con m_empresas (incluye las recién calculadas en B2)
UPDATE empresa_facturacion ef
INNER JOIN m_empresas e ON e.id_empresa = ef.id_empresa
SET ef.licencias_facturadas = e.licencias
WHERE ef.modo_facturacion = 'legacy'
  AND ef.licencias_facturadas IS NULL
  AND e.licencias IS NOT NULL
  AND e.fecha_baja IS NULL;

-- =============================================================================
-- C) VERIFICACIÓN
-- =============================================================================

-- Debe devolver 0 filas (legacy sin licencias en alguna capa)
-- SELECT e.id_empresa, e.nombre, e.licencias, ef.licencias_facturadas
-- FROM m_empresas e
-- JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
-- WHERE e.fecha_baja IS NULL
--   AND ef.modo_facturacion = 'legacy'
--   AND (e.licencias IS NULL OR ef.licencias_facturadas IS NULL);

-- Resumen: licencias vs empleados reales (admin excluido)
-- SELECT
--   e.id_empresa,
--   e.nombre,
--   e.licencias,
--   ef.licencias_facturadas,
--   GREATEST(IFNULL(cu.vinculos, 1) - 1, 0) AS empleados_activos
-- FROM m_empresas e
-- JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
-- LEFT JOIN (
--   SELECT id_empresa, COUNT(*) AS vinculos
--   FROM m_usuarios_empresas
--   WHERE fecha_baja IS NULL
--   GROUP BY id_empresa
-- ) cu ON cu.id_empresa = e.id_empresa
-- WHERE e.fecha_baja IS NULL
--   AND ef.modo_facturacion = 'legacy'
-- ORDER BY e.id_empresa;
