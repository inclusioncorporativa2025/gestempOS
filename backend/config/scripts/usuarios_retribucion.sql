-- Retribución (salario base) por empleado y empresa, con histórico por vigencia.
-- Ejecutar manualmente sobre la BD gestemp.

CREATE TABLE IF NOT EXISTS usuarios_retribucion (
  empresa_id              INT NOT NULL,
  id_retribucion          INT NOT NULL,
  id_usuario              INT NOT NULL,
  salario_bruto_mensual   DECIMAL(10, 2) NOT NULL,
  moneda                  CHAR(3) NOT NULL DEFAULT 'EUR',
  fecha_desde             DATE NOT NULL,
  fecha_hasta             DATE NULL COMMENT 'NULL = vigente',
  observaciones           VARCHAR(500) NULL,
  usuario_alta            INT NULL,
  fecha_alta              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_modificacion    INT NULL,
  fecha_modificacion      DATETIME NULL,
  fecha_baja              DATETIME NULL,
  usuario_baja            INT NULL,
  PRIMARY KEY (empresa_id, id_retribucion),
  KEY idx_ur_usuario_vigente (empresa_id, id_usuario, fecha_baja, fecha_hasta),
  KEY idx_ur_fechas (empresa_id, id_usuario, fecha_desde, fecha_hasta)
);
