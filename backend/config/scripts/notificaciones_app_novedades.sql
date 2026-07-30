-- Centro de novedades de la app (changelog segmentado por rol/plan).
-- Ejecutar manualmente sobre MySQL (gestemp).
--
-- mysql -u ... -p gestemp < backend/config/scripts/notificaciones_app_novedades.sql

-- ---------------------------------------------------------------------------
-- 1) Catálogo de novedades (ROOT)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones_app_novedades (
  id_novedad                INT NOT NULL AUTO_INCREMENT,
  codigo                    VARCHAR(40) NOT NULL,
  titulo                    VARCHAR(120) NOT NULL,
  resumen                   VARCHAR(300) NOT NULL,
  contenido                 TEXT NOT NULL,
  roles_permitidos          VARCHAR(30) NULL COMMENT 'CSV tipos usuario: 1,2,3,4,5,6. NULL = todos',
  planes_permitidos         VARCHAR(60) NULL COMMENT 'CSV planes: esencial,rrhh,completo. NULL = todos',
  requiere_feature          VARCHAR(40) NULL COMMENT 'Feature del plan requerida (vacaciones, nominas, etc.)',
  orden                     SMALLINT NOT NULL DEFAULT 0,
  activo                    TINYINT(1) NOT NULL DEFAULT 1,
  fecha_publicacion         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_alta              INT NULL,
  fecha_alta                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_modificacion      INT NULL,
  fecha_modificacion        DATETIME NULL,
  fecha_baja                DATETIME NULL,
  usuario_baja              INT NULL,
  PRIMARY KEY (id_novedad),
  UNIQUE KEY uq_novedades_codigo (codigo),
  KEY idx_novedades_activo_pub (activo, fecha_publicacion DESC, orden DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 2) Novedades vistas por usuario
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones_app_novedades_vistas (
  id                        INT NOT NULL AUTO_INCREMENT,
  id_usuario                INT NOT NULL,
  id_novedad                INT NOT NULL,
  fecha_vista               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_novedad_usuario (id_usuario, id_novedad),
  KEY idx_novedad_vista_usuario (id_usuario),
  CONSTRAINT fk_novedad_vista_usuario
    FOREIGN KEY (id_usuario) REFERENCES m_usuarios (id_usuario)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_novedad_vista_novedad
    FOREIGN KEY (id_novedad) REFERENCES notificaciones_app_novedades (id_novedad)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
