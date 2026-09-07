-- Corrección retroactiva: clientes vendidos con VENTA DIRECTA antes del despliegue del flujo.
-- Revisar el SELECT de verificación antes de ejecutar el UPDATE.

-- 1) Ver empresas afectadas (trial activo o legacy sin suscripción, vinculadas a venta directa)
SELECT
  e.id_empresa,
  e.nombre,
  e.email,
  c.nombre AS campana,
  ef.modo_facturacion,
  ef.trial_ends_at,
  ef.ciclo_facturacion,
  ef.estado_suscripcion,
  ef.stripe_subscription_id
FROM crm_venta v
INNER JOIN crm_campana c ON c.id_campana = v.id_campana AND c.tipo = 'venta_directa'
INNER JOIN m_empresas e ON e.id_empresa = v.id_empresa
LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
WHERE e.fecha_baja IS NULL
  AND (ef.stripe_subscription_id IS NULL OR ef.stripe_subscription_id = '')
  AND LOWER(IFNULL(ef.estado_suscripcion, '')) NOT IN ('active', 'past_due')
ORDER BY e.id_empresa;

-- 2) Pasar a pago pendiente (sin periodo de prueba) las que aún no han pagado
UPDATE empresa_facturacion ef
INNER JOIN crm_venta v ON v.id_empresa = ef.id_empresa
INNER JOIN crm_campana c ON c.id_campana = v.id_campana AND c.tipo = 'venta_directa'
SET ef.modo_facturacion = 'pendiente_pago',
    ef.trial_ends_at = NULL,
    ef.ciclo_facturacion = COALESCE(NULLIF(TRIM(ef.ciclo_facturacion), ''), 'mensual')
WHERE (ef.stripe_subscription_id IS NULL OR ef.stripe_subscription_id = '')
  AND LOWER(IFNULL(ef.estado_suscripcion, '')) NOT IN ('active', 'past_due', 'trialing');

-- 3) Invitaciones pendientes con campaña venta directa sin ciclo definido
UPDATE crm_invitacion_registro i
INNER JOIN crm_campana c ON c.id_campana = i.id_campana AND c.tipo = 'venta_directa'
SET i.ciclo_facturacion = COALESCE(NULLIF(TRIM(i.ciclo_facturacion), ''), 'mensual')
WHERE i.usado = 0
  AND (i.ciclo_facturacion IS NULL OR TRIM(i.ciclo_facturacion) = '');

-- 4) Verificación final
SELECT
  e.id_empresa,
  e.nombre,
  ef.modo_facturacion,
  ef.ciclo_facturacion,
  ef.estado_suscripcion
FROM crm_venta v
INNER JOIN crm_campana c ON c.id_campana = v.id_campana AND c.tipo = 'venta_directa'
INNER JOIN m_empresas e ON e.id_empresa = v.id_empresa
LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
WHERE e.fecha_baja IS NULL
ORDER BY e.id_empresa;
