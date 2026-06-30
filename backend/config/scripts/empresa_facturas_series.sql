-- Series de facturación anuales (F = factura, R = recibo 0 €)
-- Ejecutar después de empresa_facturas.sql

CREATE TABLE IF NOT EXISTS factura_series (
  serie CHAR(1) NOT NULL,
  ejercicio SMALLINT UNSIGNED NOT NULL,
  ultimo_numero INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (serie, ejercicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE empresa_facturas
  ADD COLUMN serie CHAR(1) NULL AFTER numero_recibo,
  ADD COLUMN ejercicio SMALLINT UNSIGNED NULL AFTER serie,
  ADD COLUMN numero_secuencial INT UNSIGNED NULL AFTER ejercicio;
