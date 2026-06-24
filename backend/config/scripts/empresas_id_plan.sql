-- FK plan en m_empresas (conserva columna plan como código cacheado).
-- Catálogo: planes.id_plan → 1=esencial, 2=rrhh, 3=completo
-- Ejecutar manualmente sobre MySQL (gestemp).

-- 1) Añadir columna
ALTER TABLE m_empresas
  ADD COLUMN id_plan INT NULL
  COMMENT 'FK planes.id_plan'
  AFTER licencias;

-- 2) Rellenar desde empresa_facturacion (prioridad) o texto plan, default esencial=1
UPDATE m_empresas e
LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
LEFT JOIN planes p_ef ON p_ef.id_plan = ef.id_plan
LEFT JOIN planes p_txt ON p_txt.codigo = e.plan AND p_txt.activo = 1
SET e.id_plan = COALESCE(p_ef.id_plan, p_txt.id_plan, 1)
WHERE e.id_plan IS NULL;

-- 3) Sincronizar texto plan desde catálogo
UPDATE m_empresas e
INNER JOIN planes p ON p.id_plan = e.id_plan
SET e.plan = p.codigo;

-- 4) NOT NULL + default esencial
ALTER TABLE m_empresas
  MODIFY COLUMN id_plan INT NOT NULL DEFAULT 1;

-- 5) FK (ejecutar solo si no existe)
-- ALTER TABLE m_empresas
--   ADD CONSTRAINT fk_m_empresas_plan
--   FOREIGN KEY (id_plan) REFERENCES planes(id_plan);

-- Verificación
-- SELECT e.id_empresa, e.nombre, e.id_plan, e.plan, p.nombre AS plan_nombre
-- FROM m_empresas e
-- INNER JOIN planes p ON p.id_plan = e.id_plan
-- ORDER BY e.id_empresa
-- LIMIT 20;
