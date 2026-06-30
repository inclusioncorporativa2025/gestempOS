-- Facturas propias Timecor (no PDF de Stripe)
-- Ejecutar una vez en la BD principal.

CREATE TABLE IF NOT EXISTS empresa_facturas (
  id_factura INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_empresa INT NOT NULL,
  numero_factura VARCHAR(32) NOT NULL,
  numero_recibo VARCHAR(32) NULL,
  serie CHAR(1) NULL,
  ejercicio SMALLINT UNSIGNED NULL,
  numero_secuencial INT UNSIGNED NULL,
  stripe_invoice_id VARCHAR(64) NULL,
  estado ENUM('emitida', 'pagada', 'anulada') NOT NULL DEFAULT 'emitida',
  fecha_emision DATETIME NOT NULL,
  fecha_pago DATETIME NULL,
  concepto VARCHAR(500) NOT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  importe_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  importe_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  moneda CHAR(3) NOT NULL DEFAULT 'EUR',
  periodo_desde DATE NULL,
  periodo_hasta DATE NULL,
  cliente_nombre VARCHAR(255) NULL,
  cliente_email VARCHAR(255) NULL,
  cliente_direccion TEXT NULL,
  cliente_cif VARCHAR(50) NULL,
  metodo_pago VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_factura),
  UNIQUE KEY uk_numero_factura (numero_factura),
  UNIQUE KEY uk_stripe_invoice (stripe_invoice_id),
  KEY idx_empresa_fecha (id_empresa, fecha_emision DESC),
  CONSTRAINT fk_empresa_facturas_empresa
    FOREIGN KEY (id_empresa) REFERENCES m_empresas (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Series anuales: F = factura, R = recibo (0 €)
CREATE TABLE IF NOT EXISTS factura_series (
  serie CHAR(1) NOT NULL,
  ejercicio SMALLINT UNSIGNED NOT NULL,
  ultimo_numero INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (serie, ejercicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
