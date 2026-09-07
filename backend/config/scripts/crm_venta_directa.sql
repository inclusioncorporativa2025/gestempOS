-- Campaña VENTA DIRECTA: sin prueba, pago Stripe inmediato, ciclo mensual/anual en invitación.
-- Ejecutar en prod tras desplegar el código.

-- Ciclo acordado con el cliente en la invitación (mensual | anual)
ALTER TABLE crm_invitacion_registro
  ADD COLUMN ciclo_facturacion VARCHAR(10) NULL DEFAULT NULL
  COMMENT 'mensual o anual; obligatorio con campaña venta_directa'
  AFTER id_campana;

-- Marcar campaña VENTA DIRECTA (ajusta el WHERE si el nombre/código difiere en tu BD)
UPDATE crm_campana
SET tipo = 'venta_directa',
    dias_prueba = NULL
WHERE activo = 1
  AND (
    LOWER(TRIM(nombre)) IN ('venta directa', 'venta-directa')
    OR LOWER(TRIM(codigo)) IN ('venta-directa', 'venta_directa')
  );
