-- Hub comercial CRM — tablas satélite (m_empresas intacta)
-- Ejecutar en prod cuando corresponda.

CREATE TABLE IF NOT EXISTS crm_puesto_interno (
  id_puesto     INT NOT NULL AUTO_INCREMENT,
  codigo        VARCHAR(40)  NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id_puesto),
  UNIQUE KEY uk_crm_puesto_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_permiso_hub (
  id_permiso    INT NOT NULL AUTO_INCREMENT,
  codigo        VARCHAR(60)  NOT NULL,
  nombre        VARCHAR(120) NOT NULL,
  descripcion   VARCHAR(255) NULL,
  PRIMARY KEY (id_permiso),
  UNIQUE KEY uk_crm_permiso_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_puesto_permiso_hub (
  id_puesto     INT NOT NULL,
  id_permiso    INT NOT NULL,
  PRIMARY KEY (id_puesto, id_permiso),
  CONSTRAINT fk_crm_puesto_permiso_puesto
    FOREIGN KEY (id_puesto)  REFERENCES crm_puesto_interno (id_puesto),
  CONSTRAINT fk_crm_puesto_permiso_permiso
    FOREIGN KEY (id_permiso) REFERENCES crm_permiso_hub (id_permiso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_usuario_puesto_interno (
  id            INT NOT NULL AUTO_INCREMENT,
  id_usuario    INT NOT NULL,
  id_puesto     INT NOT NULL,
  fecha_alta    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_baja    DATETIME NULL,
  usuario_alta  INT NULL,
  PRIMARY KEY (id),
  KEY idx_crm_upi_usuario (id_usuario),
  KEY idx_crm_upi_puesto (id_puesto),
  KEY idx_crm_upi_activo (id_usuario, fecha_baja),
  CONSTRAINT fk_crm_upi_usuario
    FOREIGN KEY (id_usuario) REFERENCES m_usuarios (id_usuario),
  CONSTRAINT fk_crm_upi_puesto
    FOREIGN KEY (id_puesto)  REFERENCES crm_puesto_interno (id_puesto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_invitacion_registro (
  id_invitacion        INT NOT NULL AUTO_INCREMENT,
  token_hash           CHAR(64)     NOT NULL,
  codigo_corto         VARCHAR(12)  NULL,
  id_usuario_comercial INT NOT NULL,
  email_previsto       VARCHAR(255) NULL,
  telefono_previsto    VARCHAR(50)  NULL,
  canal                VARCHAR(40)  NOT NULL DEFAULT 'telefono',
  usado                TINYINT(1)   NOT NULL DEFAULT 0,
  id_empresa_uso       INT NULL,
  id_venta             INT NULL,
  fecha_creacion       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion     DATETIME     NULL,
  fecha_uso            DATETIME     NULL,
  PRIMARY KEY (id_invitacion),
  UNIQUE KEY uk_crm_invitacion_token (token_hash),
  UNIQUE KEY uk_crm_invitacion_codigo (codigo_corto),
  KEY idx_crm_invitacion_comercial (id_usuario_comercial),
  KEY idx_crm_invitacion_usado (usado, fecha_expiracion),
  CONSTRAINT fk_crm_invitacion_comercial
    FOREIGN KEY (id_usuario_comercial) REFERENCES m_usuarios (id_usuario),
  CONSTRAINT fk_crm_invitacion_empresa
    FOREIGN KEY (id_empresa_uso) REFERENCES m_empresas (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_venta (
  id_venta                 INT NOT NULL AUTO_INCREMENT,
  id_empresa               INT NOT NULL,
  id_usuario_comercial     INT NOT NULL,
  id_invitacion_registro   INT NULL,
  canal                    VARCHAR(40) NOT NULL DEFAULT 'telefono',
  etapa                    VARCHAR(40) NOT NULL DEFAULT 'registrada',
  notas                    TEXT NULL,
  fecha_venta              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion       DATETIME NULL,
  fecha_baja               DATETIME NULL,
  usuario_alta             INT NULL,
  PRIMARY KEY (id_venta),
  UNIQUE KEY uk_crm_venta_empresa (id_empresa),
  KEY idx_crm_venta_comercial (id_usuario_comercial),
  KEY idx_crm_venta_etapa (etapa),
  CONSTRAINT fk_crm_venta_empresa
    FOREIGN KEY (id_empresa) REFERENCES m_empresas (id_empresa),
  CONSTRAINT fk_crm_venta_comercial
    FOREIGN KEY (id_usuario_comercial) REFERENCES m_usuarios (id_usuario),
  CONSTRAINT fk_crm_venta_invitacion
    FOREIGN KEY (id_invitacion_registro) REFERENCES crm_invitacion_registro (id_invitacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE crm_invitacion_registro
  ADD CONSTRAINT fk_crm_invitacion_venta
  FOREIGN KEY (id_venta) REFERENCES crm_venta (id_venta);

CREATE TABLE IF NOT EXISTS crm_venta_evento (
  id_evento     INT NOT NULL AUTO_INCREMENT,
  id_venta      INT NOT NULL,
  tipo          VARCHAR(40) NOT NULL,
  payload       JSON NULL,
  id_usuario    INT NOT NULL,
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_evento),
  KEY idx_crm_venta_evento_venta (id_venta),
  KEY idx_crm_venta_evento_fecha (fecha),
  CONSTRAINT fk_crm_venta_evento_venta
    FOREIGN KEY (id_venta)   REFERENCES crm_venta (id_venta),
  CONSTRAINT fk_crm_venta_evento_usuario
    FOREIGN KEY (id_usuario) REFERENCES m_usuarios (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO crm_puesto_interno (codigo, nombre) VALUES
  ('comercial',            'Comercial'),
  ('supervisor_comercial', 'Supervisor comercial'),
  ('admin_hub',            'Admin hub')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO crm_permiso_hub (codigo, nombre, descripcion) VALUES
  ('ver_propias',       'Ver empresas propias',    'Solo clientes atribuidos al comercial'),
  ('ver_equipo',        'Ver empresas del equipo', 'Clientes de comerciales del equipo'),
  ('ver_todas',         'Ver todas las empresas',  'Vista global del hub'),
  ('ver_importes',      'Ver importes',            'Datos de facturación / importe'),
  ('crear_invitacion',  'Crear invitación',        'Enlace o código de register'),
  ('asignar_comercial', 'Asignar comercial',       'Atribuir comercial a empresa existente')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO crm_puesto_permiso_hub (id_puesto, id_permiso)
SELECT p.id_puesto, h.id_permiso
FROM crm_puesto_interno p
JOIN crm_permiso_hub h ON h.codigo IN ('ver_propias', 'crear_invitacion')
WHERE p.codigo = 'comercial'
ON DUPLICATE KEY UPDATE id_puesto = id_puesto;

INSERT INTO crm_puesto_permiso_hub (id_puesto, id_permiso)
SELECT p.id_puesto, h.id_permiso
FROM crm_puesto_interno p
JOIN crm_permiso_hub h ON h.codigo IN (
  'ver_equipo', 'ver_importes', 'crear_invitacion', 'asignar_comercial'
)
WHERE p.codigo = 'supervisor_comercial'
ON DUPLICATE KEY UPDATE id_puesto = id_puesto;

INSERT INTO crm_puesto_permiso_hub (id_puesto, id_permiso)
SELECT p.id_puesto, h.id_permiso
FROM crm_puesto_interno p
CROSS JOIN crm_permiso_hub h
WHERE p.codigo = 'admin_hub'
ON DUPLICATE KEY UPDATE id_puesto = id_puesto;
