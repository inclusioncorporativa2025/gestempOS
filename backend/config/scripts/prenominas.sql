-- Prenómina mensual: cabecera, resumen por empleado y líneas de detalle.
-- Ejecutar manualmente sobre la BD gestemp.

CREATE TABLE IF NOT EXISTS empresa_prenominas (
  empresa_id              INT NOT NULL,
  id_prenomina            INT NOT NULL,
  periodo_mes             TINYINT UNSIGNED NOT NULL COMMENT '1-12',
  periodo_anio            SMALLINT UNSIGNED NOT NULL,
  estado                  VARCHAR(20) NOT NULL DEFAULT 'borrador'
    COMMENT 'borrador | revisada | cerrada',
  fecha_generacion        DATETIME NOT NULL,
  usuario_generacion      INT NOT NULL,
  fecha_cierre            DATETIME NULL,
  usuario_cierre          INT NULL,
  observaciones           VARCHAR(500) NULL,
  usuario_alta            INT NULL,
  fecha_alta              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_modificacion    INT NULL,
  fecha_modificacion      DATETIME NULL,
  fecha_baja              DATETIME NULL,
  usuario_baja            INT NULL,
  PRIMARY KEY (empresa_id, id_prenomina),
  KEY idx_ep_periodo (empresa_id, periodo_anio, periodo_mes, fecha_baja),
  UNIQUE KEY uq_ep_periodo_activo (empresa_id, periodo_anio, periodo_mes, fecha_baja)
);

CREATE TABLE IF NOT EXISTS usuarios_prenomina (
  empresa_id                  INT NOT NULL,
  id_prenomina_empleado       INT NOT NULL,
  id_prenomina                INT NOT NULL COMMENT 'FK lógica → empresa_prenominas',
  id_usuario                  INT NOT NULL,
  dias_trabajados             DECIMAL(5, 1) NULL,
  dias_ausencia               DECIMAL(5, 1) NULL,
  dias_vacaciones             DECIMAL(5, 1) NULL,
  salario_base                DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  importe_extras              DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  importe_complementarias     DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  otros_devengos              DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_bruto_estimado        DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  moneda                      CHAR(3) NOT NULL DEFAULT 'EUR',
  id_retribucion              INT NULL COMMENT 'Retribución usada en el cálculo',
  estado                      VARCHAR(30) NOT NULL DEFAULT 'ok'
    COMMENT 'ok | sin_salario | sin_jornada | incidencias',
  snapshot_json               JSON NULL COMMENT 'Horas, incidencias y trazabilidad del cálculo',
  usuario_alta                INT NULL,
  fecha_alta                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_modificacion        INT NULL,
  fecha_modificacion          DATETIME NULL,
  fecha_baja                  DATETIME NULL,
  usuario_baja                INT NULL,
  PRIMARY KEY (empresa_id, id_prenomina_empleado),
  UNIQUE KEY uq_up_prenomina_usuario_activo (empresa_id, id_prenomina, id_usuario, fecha_baja),
  KEY idx_up_prenomina (empresa_id, id_prenomina, fecha_baja),
  KEY idx_up_usuario (empresa_id, id_usuario, fecha_baja)
);

CREATE TABLE IF NOT EXISTS usuarios_prenomina_lineas (
  empresa_id              INT NOT NULL,
  id_linea                INT NOT NULL,
  id_prenomina            INT NOT NULL,
  id_usuario              INT NOT NULL,
  codigo_concepto         VARCHAR(30) NOT NULL COMMENT 'Ej. BASE, HEX, HCOMP, VAC',
  descripcion             VARCHAR(255) NOT NULL,
  tipo                    VARCHAR(20) NOT NULL DEFAULT 'devengo'
    COMMENT 'devengo | deduccion | informativo',
  cantidad                DECIMAL(10, 4) NULL COMMENT 'Horas, días, etc.',
  unidad                  VARCHAR(20) NULL COMMENT 'horas | dias | importe',
  importe                 DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  origen                  VARCHAR(20) NOT NULL DEFAULT 'automatico'
    COMMENT 'automatico | manual',
  orden                   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  usuario_alta            INT NULL,
  fecha_alta              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_modificacion    INT NULL,
  fecha_modificacion      DATETIME NULL,
  fecha_baja              DATETIME NULL,
  usuario_baja            INT NULL,
  PRIMARY KEY (empresa_id, id_linea),
  KEY idx_upl_prenomina_usuario (empresa_id, id_prenomina, id_usuario, fecha_baja),
  KEY idx_upl_concepto (empresa_id, id_prenomina, codigo_concepto)
);
