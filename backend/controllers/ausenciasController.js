const { Op } = require('sequelize');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const parseFechaAusencia = (valor) =>
  dayjs(valor, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);

/** true si [desde,hasta] solapa con [otroDesde, otroHasta] (por día) */
const rangosSolapan = (desde, hasta, otroDesde, otroHasta) =>
  !desde.isAfter(otroHasta, 'day') && !hasta.isBefore(otroDesde, 'day');

const Ausencias = require('../models/Ausencias');
const Usuario = require('../models/Usuario');
const { createConId } = require('../utils/empresaScope');
const { ROLE_GROUPS } = require('../middleware/authMiddleware');

const expandirRangoDias = (fechaDesde, fechaHasta) => {
  const dias = [];
  let actual = parseFechaAusencia(fechaDesde).startOf('day');
  const fin = parseFechaAusencia(fechaHasta).startOf('day');
  if (!actual.isValid() || !fin.isValid()) return [];
  while (actual.isSame(fin, 'day') || actual.isBefore(fin, 'day')) {
    dias.push(actual.format('YYYY-MM-DD'));
    actual = actual.add(1, 'day');
  }
  return dias;
};

const getAusenciasByIdUsuario = async (req, res) => {
    const { idUsuario, mes, idEmpresa } = req.body;

    try {
        const whereCondition = {
            empresa_id: idEmpresa,
            fecha_baja: null,
            id_usuario: idUsuario,
        };

        if (mes && mes.includes('-')) {
            const [startMonthStr, endMonthStr] = mes.split('-');
            const startDate = dayjs(startMonthStr, 'MM/YYYY').startOf('month').format('YYYY-MM-DD');
            const endDate = dayjs(endMonthStr, 'MM/YYYY').endOf('month').format('YYYY-MM-DD');

            whereCondition[Op.and] = [
                { fecha_desde: { [Op.lte]: endDate } },
                { fecha_hasta: { [Op.gte]: startDate } }
            ];
        }

        const ausencias = await Ausencias.findAll({
            where: whereCondition,
            order: [['fecha_alta', 'DESC']],
        });

        res.status(200).json({ message: 'Datos recuperados correctamente', ausencias });

    } catch (error) {
        console.error('Error al obtener las ausencias:', error);
        res.status(500).json({ error: 'Error al obtener ausencias' });
    }
};

const crearAusencia = async (req, res) => {
    const {
        idUsuario,
        idEmpresa,
        fecha_desde,
        fecha_hasta,
        hora_ausencia_desde,
        hora_ausencia_hasta,
        comentario,
        usuario_alta,
        tipo
    } = req.body;

    if (!idUsuario || !idEmpresa || !fecha_desde || !fecha_hasta || !tipo ) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const desde = parseFechaAusencia(fecha_desde);
    const hasta = parseFechaAusencia(fecha_hasta);

    if (!desde.isValid() || !hasta.isValid()) {
        return res.status(400).json({ error: 'Formato de fecha inválido. Use DD-MM-YYYY' });
    }

    if (hasta.isBefore(desde, 'day')) {
        return res.status(400).json({ error: 'fecha_hasta no puede ser anterior a fecha_desde' });
    }

    const fechaDesdeGuardar = desde.format('DD-MM-YYYY');
    const fechaHastaGuardar = hasta.format('DD-MM-YYYY');

    try {
        const ausenciasActivas = await Ausencias.findAll({
            where: {
                empresa_id: idEmpresa,
                id_usuario: idUsuario,
                fecha_baja: null,
            },
            raw: true,
        });

        const conflicto = ausenciasActivas.find((a) => {
            const otroDesde = parseFechaAusencia(a.fecha_desde);
            const otroHasta = parseFechaAusencia(a.fecha_hasta);
            if (!otroDesde.isValid() || !otroHasta.isValid()) return false;
            return rangosSolapan(desde, hasta, otroDesde, otroHasta);
        });

        if (conflicto) {
            const detalle = `${conflicto.tipo || 'Ausencia'} (${conflicto.fecha_desde} – ${conflicto.fecha_hasta})`;
            return res.status(400).json({
                error: 'La ausencia se superpone con otra existente',
                detalle,
            });
        }

        const nuevaAusencia = await createConId(Ausencias, idEmpresa, 'id_ausencia', {
            id_usuario: idUsuario,
            fecha_desde: fechaDesdeGuardar,
            fecha_hasta: fechaHastaGuardar,
            hora_ausencia_desde: hora_ausencia_desde || null,
            hora_ausencia_hasta: hora_ausencia_hasta || null,
            tipo,
            comentarios: comentario || null,
            usuario_alta: idUsuario,
            fecha_alta: dayjs().toDate()
        });

        res.status(201).json({
            message: 'Ausencia creada correctamente',
            ausencia: nuevaAusencia
        });

    } catch (error) {
        console.error('Error al crear la ausencia:', error);
        res.status(500).json({ error: 'Error al crear la ausencia' });
    }
};

/**
 * Eventos de ausencia para el calendario.
 * Tipos 1,2,3,4: todas las ausencias de la empresa.
 * Tipo 5: solo las propias (forzado desde JWT).
 */
const getAusenciasCalendario = async (req, res) => {
  const tipo = Number(req.user.tipo_usuario);
  const idEmpresa = Number(req.user.id_empresa);
  const idUsuarioToken = Number(req.user.id_usuario);

  if (!idEmpresa) {
    return res.status(403).json({ error: 'Usuario sin empresa asignada' });
  }

  const verTodaLaEmpresa = ROLE_GROUPS.CALENDARIO_AUSENCIAS_EMPRESA.includes(tipo);

  try {
    const where = {
      empresa_id: idEmpresa,
      fecha_baja: null,
    };

    if (!verTodaLaEmpresa) {
      where.id_usuario = idUsuarioToken;
    }

    const ausencias = await Ausencias.findAll({
      where,
      order: [['fecha_desde', 'ASC']],
      raw: true,
    });

    const idsUsuarios = [...new Set(ausencias.map((a) => a.id_usuario))];
    const usuarios =
      idsUsuarios.length > 0
        ? await Usuario.findAll({
            where: { id_usuario: idsUsuarios },
            attributes: ['id_usuario', 'nombre'],
            raw: true,
          })
        : [];
    const nombrePorId = Object.fromEntries(
      usuarios.map((u) => [u.id_usuario, u.nombre]),
    );

    const eventos = [];
    for (const a of ausencias) {
      const dias = expandirRangoDias(a.fecha_desde, a.fecha_hasta);
      for (const fecha of dias) {
        eventos.push({
          fecha,
          id_ausencia: a.id_ausencia,
          id_usuario: a.id_usuario,
          nombre_usuario: nombrePorId[a.id_usuario] || '',
          tipo: a.tipo,
          es_propio: a.id_usuario === idUsuarioToken,
        });
      }
    }

    res.status(200).json({
      eventos,
      ver_toda_empresa: verTodaLaEmpresa,
    });
  } catch (error) {
    console.error('Error al obtener ausencias del calendario:', error);
    res.status(500).json({ error: 'Error al obtener ausencias del calendario' });
  }
};

module.exports = {
  getAusenciasByIdUsuario,
  crearAusencia,
  getAusenciasCalendario,
};
