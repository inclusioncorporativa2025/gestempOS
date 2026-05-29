const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const UsuarioJornada = require('../models/UsuarioJornada');
const Jornada = require('../models/Jornada');
const fichajes = require('../models/Fichajes');
const mesesCierre = require('../models/MesesCierre');
const Ausencias = require('../models/Ausencias');
const Descansos = require('../models/Descansos');
const axios = require('axios');
const Empresa = require('../models/Empresa');
const {crearUsuarioRepo,crearUsuarioHorario} = require('../repositorios/usuarioRepository');
const {crearUsuarioEmpresa,validarCrearUsuario} = require('../repositorios/usuariosEmpresasRepository');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
const duration = require('dayjs/plugin/duration');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const FestivoEmpresa = require('../models/FestivoEmpresa');
const isBetween = require('dayjs/plugin/isBetween');
dayjs.extend(isoWeek);
const ExcelJS = require('exceljs');
dayjs.extend(duration);
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const NodeCache = require('node-cache');
const locationCache = new NodeCache({ stdTTL: 86400 });
// const firebaseAdmin = require('firebase-admin');

const ZONA_HORARIA = 'Europe/Madrid';

const getUserData= async (req, res) => {
    try {
        const { email } = req.body;

        const usuario = await Usuario.findOne({
            where: { email },
        });
        if (!usuario) {
            res.status(400).json({ message: 'error', error });
        }
        const id_usuario = usuario.id_usuario;
        const usuarioEmpresa = await UsuarioEmpresa.findOne({
            where:{id_usuario},
        });
        if (!usuarioEmpresa) {
            res.status(400).json({ message: 'error', error });
        }
        const id_empresa = usuarioEmpresa.id_empresa;
        const empresa = await Empresa.findOne({
            where:{id_empresa},
        });
        if (!empresa) {
            res.status(400).json({ message: 'error', error });
        }

        res.status(200).json({ message: 'datosUsuario', usuario,empresa });

    } catch (error) {
        console.error(`Error al recuperar datos del usuario: ${error.message}`);
        res.status(400).json({ message: 'error', error });
    }
};

const getUsuariosEmpresa = async (req, res) => {
    try {
        const { idEmpresa } = req.body;

        const idUsuarios = await UsuarioEmpresa.findAll({
            where: { id_empresa: idEmpresa, fecha_baja: null },
            attributes: ['id_usuario']
        });

        const idUsuariosArray = idUsuarios.map(usuario => usuario.id_usuario);

        const usuarios = await Usuario.findAll({
            where: {
                id_usuario: {
                    [Op.in]: idUsuariosArray
                },
                fecha_baja: null
            }
        });

        const usuarioJornadas = await UsuarioJornada.findAll({
            where: {
                empresa_id: idEmpresa,
                id_usuario: {
                    [Op.in]: idUsuariosArray
                },
                fecha_baja: null
            }
        });

        const usuariosConJornadas = usuarios.map(usuario => {

            const jornadasUsuario = usuarioJornadas.filter(jornada => jornada.id_usuario === usuario.id_usuario);

            return {
                ...usuario.toJSON(),
                jornadas: jornadasUsuario
            };
        });

        res.status(200).json({ message: 'Datos de usuarios con sus jornadas', usuarios: usuariosConJornadas });

    } catch (error) {
        console.error(`Error al recuperar datos de los usuarios: ${error.message}`);
        res.status(400).json({ message: 'error', error });
    }
};

const crearUsuario= async (req, res) => {
    try{
        const date = new Date()
        const {email,nombreUsuario,dni, idEmpresa, idUsuarioAccion, tipoUsuario, horario} = req.body;
        const validar = await validarCrearUsuario(idEmpresa);

        if(validar){
            const usuario = await crearUsuarioRepo(nombreUsuario,email,date,idUsuarioAccion,dni, tipoUsuario);
            if(usuario.name === 'SequelizeUniqueConstraintError'){
                res.status(500).json({
                    message: 'Correo en uso',
                    error: 'Correo en uso',
                  });

            }else{
            const usuarioEmpresa = await crearUsuarioEmpresa(usuario.dataValues.id_usuario, idEmpresa, idUsuarioAccion, date);
            const usuarioJornada = await crearUsuarioHorario (usuario.dataValues.id_usuario,horario, idUsuarioAccion,idEmpresa);

            // El usuario se crea sin contraseña (requiere_reset_password = true):
            // establecerá su contraseña mediante el flujo de restablecimiento por email.

            res.status(201).json({
            message: 'Usuario creado o actualizado exitosamente',
            creada: true,
            });
            }

        }else{

              res.status(200).json({
                message: 'Número de licencias superado',
                creada: false,

                });
        }

    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Hubo un error al procesar el registro',
        error: error.message,
      });
    }

};

const editUsuario= async (req, res) => {
    try{

        const date = new Date()
        const {idUsuario, values ,idUsuarioAccion, idEmpresa} = req.body;

        const usuarios = await Usuario.update(
            {
                fecha_modificacion: date,
                usuario_modificacion: idUsuarioAccion,
                nombre : values.nombre,
                dni : values.dni,
                activo : values.activo,
                tipo_usuario : values.tipoUsuario
            },
            {
                where: { id_usuario: idUsuario }
            }
        );

        const usuarioJornadaResult =  await UsuarioJornada.findOne({
            where: {
                empresa_id: idEmpresa, id_usuario: idUsuario , fecha_baja: null
            }

        } );

        if(usuarioJornadaResult != null && usuarioJornadaResult){
            const resutHorario =  await UsuarioJornada.update(
                {
                    fecha_modificacion:date ,
                    usuario_modificacion: idUsuarioAccion,
                    id_jornada : values.horario
                },{
                    where : { empresa_id: idEmpresa, id_usuario : idUsuario, fecha_baja: null}
                }

            );
        } else{
            const usuarioJornada = await crearUsuarioHorario (idUsuario,values.horario, idUsuarioAccion,idEmpresa);

        }

            res.status(201).json({
                message: 'Usuario creado o actualizado exitosamente',
                creada: true,
                });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Hubo un error al procesar el registro',
        error: error.message,
      });
    }

};

const deleteUsuario= async (req, res) => {
    try{
        const date = new Date()
        const {idUsuario,idUsuarioAccion} = req.body;

        await Usuario.update({
             fecha_baja: date,
                usuario_baja: idUsuarioAccion,
                activo: false,
                email: `${idUsuario}_borrado_${Date.now()}`
      }, {
        where: {id_usuario: idUsuario },
      });

            res.status(201).json({
            message: 'Usuario eliminado exitosamente',
            creada: true,
            });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Hubo un error al procesar el registro',
        error: error.message,
      });
    }
};
const getHorasTotalesMesByIdUsuario = async (req, res) => {
    const { idUsuario_accion, idEmpresa, mes, idUsuario } = req.body;
    var horas = 0;
    var minutos = 0;
    try {
        const info = await UsuarioJornada.findAll({
            where: { empresa_id: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
            order: [['fecha_alta', 'DESC']],
            limit: 1
        });

        if (!info.length) {
            return res.status(404).json({ message: 'No se encontró jornada para este usuario' });
        }

        const tipoJornada = info[0].id_jornada;

        const infoJornada = await Jornada.findAll({
            where: {
                empresa_id: idEmpresa,
                fecha_baja: null,
                id_jornada: tipoJornada
            }
        });

        const festivos = await FestivoEmpresa.findAll({
            where: {
                empresa_id: idEmpresa,
                fecha_baja: null,

                fecha: {
                    [Op.gte]: dayjs(`${mes}-01`).startOf('month').toDate(),
                    [Op.lte]: dayjs(`${mes}-01`).endOf('month').toDate()
                }
            },
            order: [['fecha', 'ASC']]
        });

        if (!infoJornada.length) {
            return res.status(404).json({ message: 'No se encontró información de jornada' });
        }

        let diasJornada = [];
        if (Number(infoJornada[0].dataValues.tipo) === 1) {
            diasJornada = infoJornada[0].column1.dias;

            const diasSemanaMap = {
                'Lunes': 1,
                'Martes': 2,
                'Miércoles': 3,
                'Jueves': 4,
                'Viernes': 5,
                'Sábado': 6,
                'Domingo': 0
            };

            const fechaMes = dayjs(`${mes}-01`);
            const daysInMonth = fechaMes.daysInMonth();
            let totalMinutos = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const fecha = fechaMes.date(day);
                const diaSemana = fecha.day();

                const esFestivo = festivos.some(festivo => dayjs(festivo.fecha).date() === fecha.date());

                if (esFestivo) {
                    continue;
                }

                diasJornada.forEach((dia) => {
                    const diaConfig = diasSemanaMap[dia.dia];
                    if (diaConfig === diaSemana) {
                        dia.horario.forEach(({ horaEntrada, horaSalida }) => {
                            const entrada = dayjs(`2020-01-01T${horaEntrada}`);
                            const salida = dayjs(`2020-01-01T${horaSalida}`);
                            const duracion = salida.diff(entrada, 'minute');
                            totalMinutos += duracion;
                        });
                    }
                });
            }

            horas = Math.floor(totalMinutos / 60);
            minutos = totalMinutos % 60;
        } else {
            horas = infoJornada[0].column1.horasMensuales;
            minutos = 0;
        }

        return res.status(200).json({
            horasMensuales: `${horas}h ${minutos}m`
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Hubo un error al procesar el registro',
            error: error.message,
        });
    }
};

const importarUsuariosEmpresa= async (req, res) => {
    try{
        const date = new Date()
        const {values,id_empresa, id_usuario} = req.body;

    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Hubo un error al importar usuarios',
        error: error.message,
      });
    }
};

function parseCoordenadas(coordenadas) {
    const match = coordenadas.match(/^([0-9\.-]+)--([0-9\.-]+)$/);
    if (!match) return [null, null];
    const lat = parseFloat(match[1]);
    const lon = -Math.abs(parseFloat(match[2]));
    return [lat, lon];
}

const exportarDatosExcel = async (req, res) => {
    try {
        const { id_usuario, startDate, endDate, idEmpresa } = req.body;

        if (!id_usuario || !startDate || !endDate || !idEmpresa) {
            return res.status(400).json({ message: 'Faltan parámetros necesarios' });
        }

        const start = dayjs(startDate).startOf('day');
        const end = dayjs(endDate).endOf('day');

        const usuario = await Usuario.findOne({ where: { id_usuario } });
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const [fichajesData, ausenciasData, descansosData] = await Promise.all([
            fichajes.findAll({
                where: {
                    empresa_id: idEmpresa,
                    id_usuario,
                    fecha_baja: null,
                    fecha_entrada: {
                        [Op.gte]: start.toDate(),
                        [Op.lte]: end.toDate(),
                    },
                },
            }),
            Ausencias.findAll({
                where: {
                    empresa_id: idEmpresa,
                    id_usuario,
                    fecha_baja: null,
                    fecha_desde: {
                        [Op.lte]: end.toDate(),
                    },
                    fecha_hasta: {
                        [Op.gte]: start.toDate(),
                    },
                },
            }),
            Descansos.findAll({
                where: {
                    empresa_id: idEmpresa,
                    id_usuario,
                    fecha_baja: null,
                    fecha_entrada: {
                        [Op.gte]: start.toDate(),
                        [Op.lte]: end.toDate(),
                    },
                },
            })
        ]);

        const expandirRangoDias = (fechaDesde, fechaHasta) => {
            const dias = [];
            let actual = dayjs(fechaDesde).startOf('day');
            const fin = dayjs(fechaHasta).startOf('day');

            while (actual.isSame(fin) || actual.isBefore(fin)) {
                dias.push(actual.format('YYYY-MM-DD'));
                actual = actual.add(1, 'day');
            }

            return dias;
        };

        const combinarFechaHora = (fecha, hora) => {
            if (!fecha) return null;

            const fechaBase = dayjs(fecha).format('YYYY-MM-DD');

            if (!hora) {
                return `${fechaBase}T00:00:00`;
            }

            return `${fechaBase}T${hora}`;
        };

        const estaDentroDeRango = (fecha) => {
            const f = dayjs(fecha).startOf('day');
            return f.isSame(start, 'day') || f.isSame(end, 'day') || (f.isAfter(start, 'day') && f.isBefore(end, 'day'));
        };

        const registrosData = [
            ...fichajesData.map(f => ({
                ...f.toJSON(),
                tipo: 'fichaje'
            })),

            ...ausenciasData.flatMap(a => {
                const raw = a.toJSON();
                const dias = expandirRangoDias(raw.fecha_desde, raw.fecha_hasta);

                return dias
                    .filter(dia => estaDentroDeRango(dia))
                    .map(dia => ({
                        ...raw,
                        tipo: 'ausencia',
                        fecha_original: dia,
                        fecha_entrada: combinarFechaHora(dia, raw.hora_ausencia_desde),
                        fecha_salida: raw.hora_ausencia_hasta
                            ? combinarFechaHora(dia, raw.hora_ausencia_hasta)
                            : null,
                        sin_hora: !raw.hora_ausencia_desde && !raw.hora_ausencia_hasta
                    }));
            }),

            ...descansosData.map(d => ({
                ...d.toJSON(),
                tipo: 'descanso'
            })),
        ].sort((a, b) => new Date(a.fecha_entrada) - new Date(b.fecha_entrada));

        if (registrosData.length === 0) {
            return res.status(404).json({ message: 'No se encontraron registros para este usuario en el rango de fechas' });
        }

        const getDireccionDesdeCoordenadas = async (coordenadas) => {
            if (!coordenadas) return '-';
            const cached = locationCache.get(coordenadas);
            if (cached) return cached;

            const [lat, lon] = parseCoordenadas(coordenadas);
            if (!lat || !lon) return '-';

            try {
                const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                    params: {
                        format: 'json',
                        lat,
                        lon,
                    },
                    headers: {
                        'User-Agent': 'GeoApp/1.0 (tucorreo@ejemplo.com)'
                    }
                });

                const direccion = response.data.display_name || `${lat}, ${lon}`;
                locationCache.set(coordenadas, direccion);
                return direccion;
            } catch (err) {
                console.error(`Error al obtener dirección para ${coordenadas}:`, err.message);
                return `${lat}, ${lon}`;
            }
        };

        const fichajesPorMes = {};
        for (const registro of registrosData) {
            const mes = dayjs(registro.fecha_entrada).format('YYYY-MM');
            if (!fichajesPorMes[mes]) fichajesPorMes[mes] = [];
            fichajesPorMes[mes].push(registro);
        }

        const meses = Object.keys(fichajesPorMes);

        const cierres = await mesesCierre.findAll({
            where: {
                empresa_id: idEmpresa,
                usuario_alta: id_usuario,
                mes: { [Op.in]: meses },
                usuario_aceptacion: { [Op.not]: null }
            },
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Fichajes Usuario');

        const datosUser = worksheet.addRow(['Nombre', 'DNI']);
        const contenidoUser = worksheet.addRow([usuario.nombre || 'Sin nombre', usuario.dni || 'Sin DNI']);
        worksheet.addRow([]);

        datosUser.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
            cell.font = { color: { argb: 'FFFFFF' }, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        contenidoUser.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F0FA' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        for (const mes in fichajesPorMes) {
            const tieneCierre = cierres.some(c => c.mes === mes);

            worksheet.addRow([]);
            const cabeceraMes = worksheet.addRow([
                `Fichajes del mes: ${mes}`,
                `Firmado: ${tieneCierre ? '✔' : '✘'}`
            ]);

            cabeceraMes.eachCell((cell, colNumber) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };

                if (colNumber === 2) {
                    cell.font = { color: { argb: tieneCierre ? '00FF00' : 'FF0000' }, bold: true };
                } else {
                    cell.font = { color: { argb: 'FFFFFF' }, bold: true };
                }

                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            const headerRow = worksheet.addRow([
                'Fecha Entrada',
                'Hora Entrada',
                'Hora Salida',
                'Ubicación Entrada',
                'Ubicación Salida',
                'Tipo',
                'Descanso',
                'Diferencia Tiempo',
            ]);

            headerRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
                cell.font = { color: { argb: 'FFFFFF' }, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            let totalMinutes = 0;

            for (const fichaje of fichajesPorMes[mes]) {
                const entrada = fichaje.fecha_entrada ? dayjs(fichaje.fecha_entrada).tz(ZONA_HORARIA) : null;
                const salida = fichaje.fecha_salida ? dayjs(fichaje.fecha_salida).tz(ZONA_HORARIA) : null;

                let diferencia = '-';

                if (
                    fichaje.tipo === 'fichaje' &&
                    entrada &&
                    entrada.isValid() &&
                    salida &&
                    salida.isValid()
                ) {
                    const diffMs = salida.diff(entrada);
                    const diff = dayjs.duration(diffMs);
                    diferencia = `${String(diff.hours()).padStart(2, '0')}:${String(diff.minutes()).padStart(2, '0')}`;
                    totalMinutes += Math.floor(salida.diff(entrada, 'minute'));
                }

                const ubicacionEntrada = await getDireccionDesdeCoordenadas(fichaje.ubicacion_entrada);
                const ubicacionSalida = await getDireccionDesdeCoordenadas(fichaje.ubicacion_salida);

                const tipoLabel = {
                    fichaje: 'Fichaje',
                    ausencia: 'Ausencia',
                    descanso: 'Descanso',
                }[fichaje.tipo] || '-';

                const row = worksheet.addRow([
                    entrada && entrada.isValid() ? entrada.format('DD/MM/YYYY') : '-',
                    fichaje.sin_hora ? '-' : (entrada && entrada.isValid() ? entrada.format('HH:mm') : '-'),
                    fichaje.sin_hora ? '-' : (salida && salida.isValid() ? salida.format('HH:mm') : '-'),
                    ubicacionEntrada,
                    ubicacionSalida,
                    tipoLabel,
                    fichaje.descanso || '-',
                    diferencia,
                ]);

                row.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'E6F0FA' },
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });
            }

            const totalHoras = Math.floor(totalMinutes / 60);
            const totalRestoMin = totalMinutes % 60;
            const totalStr = `${String(totalHoras).padStart(2, '0')}:${String(totalRestoMin).padStart(2, '0')}`;

            worksheet.addRow([]);
            const totalRow = worksheet.addRow(['Total horas trabajadas', totalStr]);
            totalRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
                cell.font = { color: { argb: 'FFFFFF' }, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            worksheet.addRow([]);
        }

        res.setHeader(
            'Content-Disposition',
            `attachment; filename=fichajes_usuario_${id_usuario}_${start.format('YYYYMMDD')}_${end.format('YYYYMMDD')}.xlsx`
        );
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error al generar el Excel:', error);
        res.status(500).json({ message: 'Error al generar el archivo', error: error.message });
    }
};

module.exports = {
    exportarDatosExcel,
    getUserData,
    crearUsuario,
    getUsuariosEmpresa,
    editUsuario,
    deleteUsuario,
    getHorasTotalesMesByIdUsuario,
    importarUsuariosEmpresa
};
