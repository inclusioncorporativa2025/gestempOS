const { sequelize } = require('../config/db');
const Jornada = require('../models/Jornada');
const UsuarioJornada = require('../models/UsuarioJornada');

const crearJornada = async (req, res) => {
    const { values, idEmpresa, idUsuario } = req.body;

    try {
      if (!values || !idUsuario || !idEmpresa) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      const esquema = `empresa${idEmpresa}`;
      const { nombre, tipo_jornada, tipo_hora, horasMensuales, registros } = values;

      let column1 = {};

      if (parseInt(tipo_jornada) === 1) {
        const diasAgrupados = {};

        registros.forEach(({ dia, tipo_horario, hora_entrada, hora_salida, hora_entrada2, hora_salida2 }) => {
          if (!diasAgrupados[dia]) {
            diasAgrupados[dia] = {
              dia,
              tipo_horario,
              horario: [],
            };
          }

          diasAgrupados[dia].horario.push({
            horaEntrada: hora_entrada,
            horaSalida: hora_salida,
          });

        if (tipo_horario === '2' && hora_entrada2 && hora_salida2) {
          diasAgrupados[dia].horario.push({
            horaEntrada: hora_entrada2,
            horaSalida: hora_salida2,
          });
        }
        });

        column1 = {
          nombreJornada: nombre,
          tipoJornada: 'fija',
          tipoHora: tipo_hora,
          dias: Object.values(diasAgrupados),
          horasMensuales: "",
        };
      } else {
        column1 = {
          nombreJornada: nombre,
          tipoJornada: 'variable',
          tipoHora: tipo_hora,
          dias: [],
          horasMensuales: horasMensuales || "",
        };
      }

      await Jornada.schema(esquema).create({
        nombre,
        tipo: parseInt(tipo_jornada),
        tipo_hora: parseInt(tipo_hora),
        column1,
        usuario_alta: idUsuario,
        fecha_alta: new Date(),
      });

      return res.status(201).json({ message: 'Jornada creada correctamente' });
    } catch (error) {
      console.error('Error creando jornada:', error);
      return res.status(500).json({ error: 'Error guardando nueva jornada' });
    }
  };

  const calcularHoras = (horaEntrada, horaSalida) => {
    const entrada = new Date(`1970-01-01T${horaEntrada}Z`);
    const salida = new Date(`1970-01-01T${horaSalida}Z`);

    const diff = (salida - entrada) / (1000 * 60 * 60);
    return diff;
  };

  function formatTime(timeString) {

    const time = new Date(timeString);

    time.setUTCHours(time.getUTCHours() + 1);

    const hours = time.getUTCHours().toString().padStart(2, '0');
    const minutes = time.getUTCMinutes().toString().padStart(2, '0');
    const seconds = time.getUTCSeconds().toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  };

  const obtenerJornadaYRegistros = async (req, res) => {
    const { idEmpresa } = req.body;

    if (!idEmpresa) {
      return res.status(400).json({ error: 'El idEmpresa es requerido' });
    }

    try {
      const esquema = 'empresa' + idEmpresa;

      const query = `
        SELECT j.id_jornada, j.nombre AS jornada_nombre, j.tipo, j.tipo_hora,r.id_registro_jornada, r.nombre AS registro_nombre, r.hora_entrada, r.hora_salida, r.descansos, r.tipo AS registro_tipo
        FROM ${esquema}.jornadas j
        LEFT JOIN ${esquema}.registros_jornadas r ON j.id_jornada = r.id_jornada
        WHERE j.fecha_baja IS NULL
      `;

      const result = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT
      });

      if (!Array.isArray(result)) {
        return res.status(500).json({ error: 'La respuesta no es un arreglo' });
      }

      const jornadas = result.reduce((acc, row) => {

        if (!acc[row.id_jornada]) {
          acc[row.id_jornada] = {
            id_jornada: row.id_jornada,
            jornada_nombre: row.jornada_nombre,
            tipo: row.tipo,
            tipo_hora: row.tipo_hora,
            registros: []
          };
        }

        if (row.id_registro_jornada) {
          acc[row.id_jornada].registros.push({
            id_registro_jornada: row.id_registro_jornada,
            registro_nombre: row.registro_nombre,
            hora_entrada: row.hora_entrada,
            hora_salida: row.hora_salida,
            descansos: row.descansos,
            registro_tipo: row.registro_tipo
          });
        }

        return acc;
      }, {});

      const jornadasArray = Object.values(jornadas);

      return res.status(200).json(jornadasArray);
    } catch (error) {
      console.error('Error al obtener las jornadas y registros:', error);
      return res.status(500).json({ error: 'Error al recuperar la información' });
    }
  };

  const obtenerJornadaByIdEmpresa = async (req, res) => {
    const { idEmpresa } = req. body;

    try {
      if (!idEmpresa) {
        return res.status(400).json({ error: 'Falta el idEmpresa en la petición' });
      }

      const esquema = 'empresa' + idEmpresa;

      const jornadas = await Jornada.schema(esquema).findAll({
        where: {
          fecha_baja: null
        },
        order: [['id_jornada', 'ASC']],
      });

      return res.status(200).json({ jornadas });
    } catch (error) {
      console.error('Error obteniendo jornadas:', error);
      return res.status(500).json({ error: 'Error obteniendo jornadas de la empresa' });
    }
  };

  const obtenerJornada = async (req, res) => {
    const { idEmpresa } = req.body;

    if (!idEmpresa) {
      return res.status(400).json({ error: 'El idEmpresa es requerido' });
    }

    try {
      const esquema = 'empresa' + idEmpresa;

      const info = await Jornada.schema(esquema).findAll({
        where :{fecha_baja: null},
        order: [
            ['fecha_alta', 'DESC']
          ]
    })

      return res.status(200).json(info);
    } catch (error) {
      console.error('Error al obtener las jornadas :', error);
      return res.status(500).json({ error: 'Error al recuperar la información' });
    }
  };

  const obtenerUsuariosJornada = async (req, res) => {
    const { idEmpresa } = req.body;

    if (!idEmpresa) {
      return res.status(400).json({ error: 'El idEmpresa es requerido' });
    }

    try {
      const esquema = 'empresa' + idEmpresa;

      const info = await UsuarioJornada.schema(esquema).findAll({
        where :{fecha_baja: null},
        order: [
            ['fecha_alta', 'DESC']
          ]
    })

      return res.status(200).json(info);
    } catch (error) {
      console.error('Error al obtener las jornadas :', error);
      return res.status(500).json({ error: 'Error al recuperar la información' });
    }
  };

  const deleteById = async (req, res) => {
      try {
          const { idEmpresa, idJornada, idUsuario } = req.body;

          const idempresa = parseInt(idEmpresa);
          const idjornada = parseInt(idJornada);
          const idusuario = parseInt(idUsuario);
          const esquema = `empresa${idempresa}`;

          const result = await Jornada.schema(esquema).update(
            {
                fecha_baja: new Date(),
                usuario_baja: idusuario
            },
            {
                where: { id_jornada:idjornada }
            }
        );

          return res.status(200).json({ message: 'Jornada dada de baja correctamente' });
      } catch (error) {
          console.error('Error al dar de baja la jornada:', error);
          return res.status(500).json({ error: 'Error al dar de baja la jornada' });
      }
  };

  module.exports = {
    crearJornada,
    obtenerJornadasYRegistros: obtenerJornadaYRegistros,
    obtenerJornadas: obtenerJornada,
    deleteById,
    obtenerJornadasByIdEmpresa: obtenerJornadaByIdEmpresa,
    obtenerUsuariosJornadas: obtenerUsuariosJornada
  };
