-- Retribución anual con 12 o 14 pagas (cálculo del mensual de referencia).
-- Ejecutar manualmente sobre la BD gestemp.

ALTER TABLE usuarios_retribucion
  ADD COLUMN salario_bruto_anual DECIMAL(10, 2) NULL
    COMMENT 'Bruto anual de referencia; mensual = anual / numero_pagas' AFTER salario_bruto_mensual,
  ADD COLUMN numero_pagas TINYINT UNSIGNED NULL
    COMMENT '12 o 14 pagas al calcular desde anual' AFTER salario_bruto_anual;
