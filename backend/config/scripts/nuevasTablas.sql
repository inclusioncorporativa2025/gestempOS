CREATE TABLE empresa79.jornadas (
    id_jornada INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR NOT NULL UNIQUE,
    tipo INTEGER NOT NULL,
    tipo_hora INTEGER NOT NULL,
    column1 JSONB NOT NULL,

    fecha_alta TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario_alta INTEGER NOT NULL,
    
    fecha_modificacion TIMESTAMP,
    usuario_modificacion INTEGER,
    
    fecha_baja TIMESTAMP,
    usuario_baja INTEGER,

    CONSTRAINT jornadas_usuario_alta_fk FOREIGN KEY (usuario_alta) REFERENCES usuarios(id_usuario),
    CONSTRAINT jornadas_usuario_modificacion_fk FOREIGN KEY (usuario_modificacion) REFERENCES usuarios(id_usuario),
    CONSTRAINT jornadas_usuario_baja_fk FOREIGN KEY (usuario_baja) REFERENCES usuarios(id_usuario)
);
