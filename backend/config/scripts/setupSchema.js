const { sequelize } = require('../db');

const setupSchema = async (schemaName, transaction) => {
  try {
    console.log(`Creando esquema y tablas para: ${schemaName}`);

    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`, { transaction });

    const result = await sequelize.query(`

      -- Tabla jornadas
      CREATE TABLE IF NOT EXISTS ${schemaName}.jornadas (
          id_jornada INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          nombre VARCHAR NOT NULL UNIQUE,
          tipo INTEGER NOT NULL,
          tipo_hora INTEGER NOT NULL,
          column1 JSONB NOT NULL,

          fecha_alta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          usuario_alta INTEGER NOT NULL,

          fecha_modificacion TIMESTAMP WITH TIME ZONE,
          usuario_modificacion INTEGER,

          fecha_baja TIMESTAMP WITH TIME ZONE,
          usuario_baja INTEGER,

          CONSTRAINT jornadas_usuario_alta_fk FOREIGN KEY (usuario_alta) REFERENCES usuarios(id_usuario),
          CONSTRAINT jornadas_usuario_modificacion_fk FOREIGN KEY (usuario_modificacion) REFERENCES usuarios(id_usuario),
          CONSTRAINT jornadas_usuario_baja_fk FOREIGN KEY (usuario_baja) REFERENCES usuarios(id_usuario)
      );

      -- Tabla usuario_jornada
      CREATE TABLE ${schemaName}.usuario_jornada (
          id_usuario_jornada SERIAL PRIMARY KEY,
          id_usuario INT NOT NULL,
          id_jornada INT NOT NULL,
          usuario_alta INT NOT NULL,
          fecha_alta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          usuario_modificacion INT,
          fecha_modificacion TIMESTAMP WITH TIME ZONE,
          usuario_baja INT,
          fecha_baja TIMESTAMP WITH TIME ZONE,

          CONSTRAINT fk_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
          CONSTRAINT fk_empresa FOREIGN KEY (id_jornada) REFERENCES ${schemaName}.jornadas(id_jornada) ON DELETE CASCADE,
          CONSTRAINT fk_usuario_alta FOREIGN KEY (usuario_alta) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
          CONSTRAINT fk_usuario_modificacion FOREIGN KEY (usuario_modificacion) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
          CONSTRAINT fk_usuario_baja FOREIGN KEY (usuario_baja) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
      );

      CREATE INDEX idx_usuario_jornada_id_usuario ON ${schemaName}.usuario_jornada (id_usuario);
      CREATE INDEX idx_usuario_jornada_id_jornada ON ${schemaName}.usuario_jornada (id_jornada);
      CREATE INDEX idx_usuario_jornada_usuario_alta ON ${schemaName}.usuario_jornada (usuario_alta);
      CREATE INDEX idx_usuario_jornada_usuario_modificacion ON ${schemaName}.usuario_jornada (usuario_modificacion);
      CREATE INDEX idx_usuario_jornada_usuario_baja ON ${schemaName}.usuario_jornada (usuario_baja);

      -- Tabla fichajes
      CREATE TABLE IF NOT EXISTS ${schemaName}.fichajes (
          id_fichaje SERIAL PRIMARY KEY,
          id_usuario INT,
          fecha_entrada TIMESTAMP WITH TIME ZONE NOT NULL,
          fecha_salida TIMESTAMP WITH TIME ZONE,
          fecha_alta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          usuario_alta INT NOT NULL,
          fecha_modificacion TIMESTAMP WITH TIME ZONE,
          usuario_modificacion INT,
          fecha_baja TIMESTAMP WITH TIME ZONE,
          usuario_baja INT,
          ubicacion_entrada VARCHAR(255),
          ubicacion_salida VARCHAR(255),
          descanso BOOLEAN DEFAULT FALSE,

          CONSTRAINT fichajes_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
          CONSTRAINT fichajes_usuario_alta_fkey FOREIGN KEY (usuario_alta) REFERENCES public.usuarios(id_usuario),
          CONSTRAINT fichajes_usuario_baja_fkey FOREIGN KEY (usuario_baja) REFERENCES public.usuarios(id_usuario),
          CONSTRAINT fichajes_usuario_modificacion_fkey FOREIGN KEY (usuario_modificacion) REFERENCES public.usuarios(id_usuario)
      );

      -- Tabla festivos_empresa
      CREATE TABLE ${schemaName}.festivos_empresa (
          id_festivo SERIAL PRIMARY KEY,
          id_empresa INT NOT NULL,
          fecha DATE NOT NULL,
          descripcion TEXT NOT NULL,

          usuario_alta INT NOT NULL,
          fecha_alta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          usuario_modificacion INT,
          fecha_modificacion TIMESTAMP WITH TIME ZONE,
          usuario_baja INT,
          fecha_baja TIMESTAMP WITH TIME ZONE,

          CONSTRAINT fk_festivo_empresa_usuario_alta FOREIGN KEY (usuario_alta) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
          CONSTRAINT fk_festivo_empresa_usuario_modificacion FOREIGN KEY (usuario_modificacion) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
          CONSTRAINT fk_festivo_empresa_usuario_baja FOREIGN KEY (usuario_baja) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
      );

      CREATE INDEX idx_festivos_empresa_id_empresa ON ${schemaName}.festivos_empresa (id_empresa);
      CREATE INDEX idx_festivos_empresa_fecha ON ${schemaName}.festivos_empresa (fecha);
      CREATE INDEX idx_festivos_empresa_usuario_alta ON ${schemaName}.festivos_empresa (usuario_alta);
      CREATE INDEX idx_festivos_empresa_usuario_modificacion ON ${schemaName}.festivos_empresa (usuario_modificacion);
      CREATE INDEX idx_festivos_empresa_usuario_baja ON ${schemaName}.festivos_empresa (usuario_baja);

      -- Tabla peticiones
      CREATE TABLE IF NOT EXISTS ${schemaName}.peticiones (
          id_peticion SERIAL PRIMARY KEY,
          id_usuario_peticion INT NOT NULL,
          id_usuario_gestor INT,
          id_fichaje INT,
          nueva_entrada TIMESTAMP WITH TIME ZONE NOT NULL,
          nueva_salida TIMESTAMP WITH TIME ZONE NOT NULL,
          justificacion TEXT,
          fecha_alta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          fecha_aceptacion TIMESTAMP WITH TIME ZONE,
          fecha_cancelacion TIMESTAMP WITH TIME ZONE,

          CONSTRAINT peticiones_id_usuario_peticion_fkey FOREIGN KEY (id_usuario_peticion) REFERENCES public.usuarios(id_usuario),
          CONSTRAINT peticiones_id_usuario_gestor_fkey FOREIGN KEY (id_usuario_gestor) REFERENCES public.usuarios(id_usuario)
      );

-- Tabla ausencias
CREATE TABLE IF NOT EXISTS ${schemaName}.ausencias (
    id_ausencia SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_desde VARCHAR(10) NOT NULL,          -- formato DD-MM-YYYY
    fecha_hasta VARCHAR(10) NOT NULL,          -- formato DD-MM-YYYY
    hora_ausencia_desde TIME,                  -- hora de inicio de la ausencia
    hora_ausencia_hasta TIME,                  -- hora de fin de la ausencia
    tipo VARCHAR(100),                         -- nuevo campo tipo
    comentarios VARCHAR(500),                  -- campo para comentarios

    usuario_alta INT NOT NULL,
    fecha_alta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    usuario_modificacion INT,
    fecha_modificacion TIMESTAMP WITH TIME ZONE,

    usuario_baja INT,
    fecha_baja TIMESTAMP WITH TIME ZONE,

    CONSTRAINT ausencias_id_usuario_fkey FOREIGN KEY (id_usuario)
        REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT ausencias_usuario_alta_fkey FOREIGN KEY (usuario_alta)
        REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT ausencias_usuario_modificacion_fkey FOREIGN KEY (usuario_modificacion)
        REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT ausencias_usuario_baja_fkey FOREIGN KEY (usuario_baja)
        REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL
);

-- Tabla descansos
CREATE TABLE IF NOT EXISTS ${schemaName}.descansos (
    id_descanso SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_entrada TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_salida TIMESTAMP WITH TIME ZONE,
    ubicacion_entrada VARCHAR(255),
    ubicacion_salida VARCHAR(255),

    fecha_alta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_alta INT NOT NULL,
    fecha_modificacion TIMESTAMP WITH TIME ZONE,
    usuario_modificacion INT,
    fecha_baja TIMESTAMP WITH TIME ZONE,
    usuario_baja INT,

    CONSTRAINT descansos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT descansos_usuario_alta_fkey FOREIGN KEY (usuario_alta) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT descansos_usuario_modificacion_fkey FOREIGN KEY (usuario_modificacion) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT descansos_usuario_baja_fkey FOREIGN KEY (usuario_baja) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL
);

-- Índices para la tabla descansos
CREATE INDEX idx_descansos_id_usuario ON ${schemaName}.descansos (id_usuario);
CREATE INDEX idx_descansos_usuario_alta ON ${schemaName}.descansos (usuario_alta);
CREATE INDEX idx_descansos_usuario_modificacion ON ${schemaName}.descansos (usuario_modificacion);
CREATE INDEX idx_descansos_usuario_baja ON ${schemaName}.descansos (usuario_baja);

-- Tabla meses_cierre
CREATE TABLE IF NOT EXISTS ${schemaName}.meses_cierre (
    id_mes_cierre SERIAL PRIMARY KEY,
    mes VARCHAR(20) NOT NULL, -- Ejemplo: 'enero 2025' o '01-2025'

    usuario_aceptacion INT,
    fecha_aceptacion TIMESTAMP WITH TIME ZONE,

    usuario_cancelacion INT,
    fecha_cancelacion TIMESTAMP WITH TIME ZONE,

    usuario_alta INT NOT NULL,
    fecha_alta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    usuario_baja INT,
    fecha_baja TIMESTAMP WITH TIME ZONE,

    CONSTRAINT meses_cierre_usuario_aceptacion_fk FOREIGN KEY (usuario_aceptacion) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT meses_cierre_usuario_cancelacion_fk FOREIGN KEY (usuario_cancelacion) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT meses_cierre_usuario_alta_fk FOREIGN KEY (usuario_alta) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT meses_cierre_usuario_baja_fk FOREIGN KEY (usuario_baja) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- Índices recomendados
CREATE INDEX idx_meses_cierre_mes ON ${schemaName}.meses_cierre (mes);
CREATE INDEX idx_meses_cierre_usuario_alta ON ${schemaName}.meses_cierre (usuario_alta);
CREATE INDEX idx_meses_cierre_usuario_aceptacion ON ${schemaName}.meses_cierre (usuario_aceptacion);
CREATE INDEX idx_meses_cierre_usuario_cancelacion ON ${schemaName}.meses_cierre (usuario_cancelacion);
CREATE INDEX idx_meses_cierre_usuario_baja ON ${schemaName}.meses_cierre (usuario_baja);

    `, { transaction });

    console.log(`Tablas para el esquema ${schemaName} creadas exitosamente.`);
    return result;
  } catch (err) {
    console.error(`Error al configurar el esquema ${schemaName}:`, err);
    throw err;
  }
};

module.exports = setupSchema;
