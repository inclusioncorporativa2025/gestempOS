const { Op } = require('sequelize');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
dayjs.extend(timezone);

const Ausencias = require('../models/Ausencias');
const { createConId } = require('../utils/empresaScope');

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

    const desde = dayjs(fecha_desde, 'DD-MM-YYYY');
    const hasta = dayjs(fecha_hasta, 'DD-MM-YYYY');

    if (!desde.isValid() || !hasta.isValid()) {
        return res.status(400).json({ error: 'Formato de fecha inválido. Use DD-MM-YYYY' });
    }

    if (hasta.isBefore(desde)) {
        return res.status(400).json({ error: 'fecha_hasta no puede ser anterior a fecha_desde' });
    }

    try {

        const existeSuperposicion = await Ausencias.findOne({
            where: {
                empresa_id: idEmpresa,
                id_usuario: idUsuario,
                fecha_baja: null,
                [Op.or]: [
                    { fecha_desde: { [Op.between]: [fecha_desde, fecha_hasta] } },
                    { fecha_hasta: { [Op.between]: [fecha_desde, fecha_hasta] } },
                    { [Op.and]: [
                        { fecha_desde: { [Op.lte]: fecha_desde } },
                        { fecha_hasta: { [Op.gte]: fecha_hasta } }
                    ]}
                ]
            }
        });

        if (existeSuperposicion) {
            return res.status(400).json({ error: 'La ausencia se superpone con otra existente' });
        }

        const nuevaAusencia = await createConId(Ausencias, idEmpresa, 'id_ausencia', {
            id_usuario: idUsuario,
            fecha_desde,
            fecha_hasta,
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

module.exports = { getAusenciasByIdUsuario, crearAusencia };
