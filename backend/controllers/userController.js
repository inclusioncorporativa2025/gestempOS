const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const UsuarioJornada = require('../models/UsuarioJornada');
const Jornada = require('../models/Jornada');
const fichajes = require('../models/Fichajes');
const mesesCierre = require('../models/MesesCierre');
const { MESES_CIERRE_ATTRS } = require('../utils/mesesCierreCompat');
const Ausencias = require('../models/Ausencias');
const Descansos = require('../models/Descansos');
const axios = require('axios');
const Empresa = require('../models/Empresa');
const {crearUsuarioRepo,crearUsuarioHorario} = require('../repositorios/usuarioRepository');
const {
  crearUsuarioEmpresa,
  obtenerDisponibilidadLicencias,
} = require('../repositorios/usuariosEmpresasRepository');
const { enviarInvitacionEmpleado } = require('../utils/mailService');
const { obtenerMembresiaActiva, resolverTipoSesion } = require('../services/usuarioEmpresaService');
const { calcularResumenHorasMes, resolverTipoHora } = require('../services/horasResumenService');
const {
  obtenerSaldoBolsa,
  listarMovimientosBolsa,
  registrarAjusteManual,
} = require('../services/bolsaHorasService');
const { empresaTieneFeature } = require('../services/planService');
const { ausenciasSoportaAprobacion, whereSoloAprobadas } = require('../utils/ausenciasCompat');
const { normalizarTipoHoraInput } = require('../utils/tipoHora');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
const duration = require('dayjs/plugin/duration');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const FestivoEmpresa = require('../models/FestivoEmpresa');
const isBetween = require('dayjs/plugin/isBetween');
const { ROLES } = require('../middleware/authMiddleware');
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
const BCRYPT_ROUNDS = 10;

const sanitizePerfil = (usuario) => ({
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    email: usuario.email,
    dni: usuario.dni ?? '',
    tipo_usuario: usuario.tipo_usuario,
    email_verificado: usuario.email_verificado,
});

const getMiPerfil = async (req, res) => {
    try {
        const idUsuario = Number(req.user.id_usuario);
        const usuario = await Usuario.findOne({
            where: { id_usuario: idUsuario, fecha_baja: null },
        });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const perfil = {
            ...sanitizePerfil(usuario),
            fecha_alta: usuario.fecha_alta,
            activo: usuario.activo,
            tipo_hora: null,
            jornadas: [],
        };

        const idEmpresa = Number(req.user.id_empresa);
        if (idEmpresa) {
            const membresia = await obtenerMembresiaActiva(idUsuario, idEmpresa);
            if (membresia) {
                perfil.tipo_usuario = resolverTipoSesion(usuario, membresia);
                perfil.tipo_hora = membresia.tipo_hora ?? null;
            }

            const usuarioJornadas = await UsuarioJornada.findAll({
                where: {
                    empresa_id: idEmpresa,
                    id_usuario: idUsuario,
                    fecha_baja: null,
                },
            });

            perfil.jornadas = usuarioJornadas.map((jornadaUsuario) => ({
                id_jornada: jornadaUsuario.id_jornada,
                empresa_id: jornadaUsuario.empresa_id,
                id_usuario: jornadaUsuario.id_usuario,
            }));
        }

        return res.status(200).json({ perfil });
    } catch (error) {
        console.error('Error en getMiPerfil:', error.message);
        return res.status(500).json({ message: 'Error al cargar el perfil' });
    }
};

const editMiPerfil = async (req, res) => {
    const idUsuario = Number(req.user.id_usuario);
    const { nombre, dni, contrasenaActual, contrasenaNueva } = req.body;

    try {
        const usuario = await Usuario.findOne({
            where: { id_usuario: idUsuario, fecha_baja: null },
        });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const updates = {
            fecha_modificacion: new Date(),
            usuario_modificacion: idUsuario,
        };

        if (nombre != null) {
            const nombreTrim = String(nombre).trim();
            if (!nombreTrim) {
                return res.status(400).json({ message: 'El nombre es obligatorio' });
            }
            updates.nombre = nombreTrim;
        }

        if (dni !== undefined) {
            updates.dni = dni ? String(dni).trim() : null;
        }

        if (contrasenaNueva) {
            if (!contrasenaActual) {
                return res.status(400).json({ message: 'Introduce tu contraseña actual' });
            }
            if (String(contrasenaNueva).length < 8) {
                return res.status(400).json({
                    message: 'La nueva contraseña debe tener al menos 8 caracteres',
                });
            }
            if (!usuario.password_hash) {
                return res.status(400).json({
                    message: 'Debes establecer la contraseña mediante el enlace de invitación',
                });
            }
            const passwordValido = await bcrypt.compare(contrasenaActual, usuario.password_hash);
            if (!passwordValido) {
                return res.status(400).json({ message: 'La contraseña actual no es correcta' });
            }
            updates.password_hash = await bcrypt.hash(contrasenaNueva, BCRYPT_ROUNDS);
            updates.requiere_reset_password = false;
        }

        await usuario.update(updates);
        await usuario.reload();

        return res.status(200).json({
            message: 'Perfil actualizado correctamente',
            perfil: sanitizePerfil(usuario),
        });
    } catch (error) {
        console.error('Error en editMiPerfil:', error.message);
        return res.status(500).json({ message: 'Error al guardar el perfil' });
    }
};

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
            attributes: ['id_usuario', 'tipo_usuario', 'tipo_hora']
        });

        const idUsuariosArray = idUsuarios.map(usuario => usuario.id_usuario);
        const membresiaPorUsuario = new Map(
            idUsuarios.map((vinculo) => [vinculo.id_usuario, vinculo]),
        );

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
            const membresia = membresiaPorUsuario.get(usuario.id_usuario);

            return {
                ...usuario.toJSON(),
                tipo_usuario: membresia?.tipo_usuario ?? usuario.tipo_usuario,
                tipo_hora: membresia?.tipo_hora ?? null,
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
        const {email,nombreUsuario,dni, idEmpresa, idUsuarioAccion, tipoUsuario, horario, tipoHora} = req.body;
        const tipoHoraNormalizado = normalizarTipoHoraInput(tipoHora);
        const disponibilidad = await obtenerDisponibilidadLicencias(idEmpresa);

        if(disponibilidad.disponible){
            let usuario = await Usuario.findOne({
                where: { email, fecha_baja: null },
            });
            let usuarioNuevo = false;

            if (usuario) {
                const vinculoActivo = await UsuarioEmpresa.findOne({
                    where: {
                        id_usuario: usuario.id_usuario,
                        id_empresa: idEmpresa,
                        fecha_baja: null,
                    },
                });

                if (vinculoActivo) {
                    return res.status(409).json({
                        message: 'El usuario ya pertenece a esta empresa',
                        error: 'Ya en empresa',
                        codigo: 'YA_EN_EMPRESA',
                    });
                }
            } else {
                usuario = await crearUsuarioRepo(nombreUsuario, email, date, idUsuarioAccion, dni, tipoUsuario);
                if (usuario.name === 'SequelizeUniqueConstraintError') {
                    return res.status(500).json({
                        message: 'Correo en uso',
                        error: 'Correo en uso',
                    });
                }
                usuarioNuevo = true;
            }

            await crearUsuarioEmpresa(
                usuario.dataValues?.id_usuario ?? usuario.id_usuario,
                idEmpresa,
                idUsuarioAccion,
                date,
                tipoUsuario,
                tipoHoraNormalizado,
            );

            const idUsuario = usuario.dataValues?.id_usuario ?? usuario.id_usuario;

            if (horario) {
              await crearUsuarioHorario(idUsuario, horario, idUsuarioAccion, idEmpresa);
            }

            const empresa = await Empresa.findOne({ where: { id_empresa: idEmpresa } });
            const usuarioDb = await Usuario.findByPk(idUsuario);

            let emailInvitacionEnviado = false;
            let devInvitacionUrl = null;

            if (usuarioNuevo || usuarioDb.requiere_reset_password) {
                try {
                  devInvitacionUrl = await enviarInvitacionEmpleado(usuarioDb, {
                    nombreEmpresa: empresa?.nombre,
                  });
                  emailInvitacionEnviado = true;
                } catch (mailError) {
                  console.error('Usuario vinculado pero falló el email de invitación:', mailError.message);
                }
            }

            const respuesta = {
              message: usuarioNuevo
                ? (emailInvitacionEnviado
                    ? 'Usuario creado. Se ha enviado un correo de invitación para crear la contraseña (válido 7 días).'
                    : 'Usuario creado, pero no se pudo enviar el correo de invitación. Use "Olvidé mi contraseña" con su email.')
                : 'Usuario existente vinculado correctamente a la empresa.',
              creada: true,
              vinculado: !usuarioNuevo,
              emailInvitacionEnviado,
            };

            if (process.env.NODE_ENV !== 'production' && devInvitacionUrl) {
              respuesta.devInvitacionUrl = devInvitacionUrl;
            }

            return res.status(201).json(respuesta);

        } else {
            res.status(200).json({
              creada: false,
              codigo: 'LICENCIAS_AGOTADAS',
              message: 'No tiene plazas disponibles. Póngase en contacto con soporte para ampliar las licencias.',
              licencias: disponibilidad.licencias,
              usadas: disponibilidad.usadas,
            });
        }

    } catch (error) {
      if (error.code === 'YA_EN_EMPRESA') {
        return res.status(409).json({
          message: 'El usuario ya pertenece a esta empresa',
          codigo: 'YA_EN_EMPRESA',
        });
      }
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
            },
            {
                where: { id_usuario: idUsuario }
            }
        );

        const updateMembresia = { tipo_usuario: values.tipoUsuario };
        if (Object.prototype.hasOwnProperty.call(values, 'tipoHora')) {
            updateMembresia.tipo_hora = normalizarTipoHoraInput(values.tipoHora);
        }

        await UsuarioEmpresa.update(
            updateMembresia,
            {
                where: {
                    id_usuario: idUsuario,
                    id_empresa: idEmpresa,
                    fecha_baja: null,
                },
            },
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
            message: 'Usuario dado de baja correctamente',
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
    const { idEmpresa, mes, idUsuario } = req.body;
    const tipoUsuario = Number(req.user?.tipo_usuario);

    if (tipoUsuario === ROLES.EMPLEADO && Number(idUsuario) !== Number(req.user?.id_usuario)) {
        return res.status(403).json({ message: 'No autorizado para consultar datos de otro usuario' });
    }

    if (!idEmpresa || !mes || !idUsuario) {
        return res.status(400).json({ message: 'Datos incompletos' });
    }

    try {
        const resumen = await calcularResumenHorasMes(
            idEmpresa,
            idUsuario,
            mes,
            req.user?.id_usuario ?? null,
        );
        return res.status(200).json({
            horasMensuales: resumen.horasMensuales ?? 'No configurada',
            resumen,
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Hubo un error al procesar el registro',
            error: error.message,
        });
    }
};

const getResumenHorasMes = async (req, res) => {
    const { idEmpresa, mes, idUsuario } = req.body;
    const tipoUsuario = Number(req.user?.tipo_usuario);

    if (tipoUsuario === ROLES.EMPLEADO && Number(idUsuario) !== Number(req.user?.id_usuario)) {
        return res.status(403).json({ message: 'No autorizado para consultar datos de otro usuario' });
    }

    if (!idEmpresa || !mes || !idUsuario) {
        return res.status(400).json({ message: 'Datos incompletos' });
    }

    try {
        const resumen = await calcularResumenHorasMes(
            idEmpresa,
            idUsuario,
            mes,
            req.user?.id_usuario ?? null,
        );
        return res.status(200).json({ resumen });
    } catch (error) {
        return res.status(500).json({
            message: 'Error al calcular el resumen de horas',
            error: error.message,
        });
    }
};

const getTipoHoraUsuario = async (req, res) => {
    const { idEmpresa, idUsuario } = req.body;
    const tipoUsuario = Number(req.user?.tipo_usuario);

    if (tipoUsuario === ROLES.EMPLEADO && Number(idUsuario) !== Number(req.user?.id_usuario)) {
        return res.status(403).json({ message: 'No autorizado' });
    }

    if (!idEmpresa || !idUsuario) {
        return res.status(400).json({ message: 'Datos incompletos' });
    }

    try {
        const info = await resolverTipoHora(idEmpresa, idUsuario);
        return res.status(200).json(info);
    } catch (error) {
        return res.status(500).json({
            message: 'Error al obtener el tipo de hora',
            error: error.message,
        });
    }
};

const getBolsaHoras = async (req, res) => {
    const { idEmpresa, idUsuario, mes } = req.body;
    const tipoUsuario = Number(req.user?.tipo_usuario);

    if (tipoUsuario === ROLES.EMPLEADO && Number(idUsuario) !== Number(req.user?.id_usuario)) {
        return res.status(403).json({ message: 'No autorizado' });
    }

    if (!idEmpresa || !idUsuario) {
        return res.status(400).json({ message: 'Datos incompletos' });
    }

    try {
        if (mes) {
            await calcularResumenHorasMes(
                idEmpresa,
                idUsuario,
                mes,
                req.user?.id_usuario ?? null,
            );
        }

        const [saldo, movimientos] = await Promise.all([
            obtenerSaldoBolsa(idEmpresa, idUsuario),
            listarMovimientosBolsa(idEmpresa, idUsuario),
        ]);

        return res.status(200).json({ saldo, movimientos });
    } catch (error) {
        return res.status(500).json({
            message: 'Error al obtener la bolsa de horas',
            error: error.message,
        });
    }
};

const ajustarBolsaHoras = async (req, res) => {
    const { idEmpresa, idUsuario, minutos, motivo } = req.body;
    const idUsuarioAccion = req.user?.id_usuario;

    if (!idEmpresa || !idUsuario || minutos == null) {
        return res.status(400).json({ message: 'Datos incompletos' });
    }

    try {
        await registrarAjusteManual(
            idEmpresa,
            idUsuario,
            minutos,
            motivo,
            idUsuarioAccion,
        );

        const saldo = await obtenerSaldoBolsa(idEmpresa, idUsuario);
        const movimientos = await listarMovimientosBolsa(idEmpresa, idUsuario);

        return res.status(201).json({
            message: 'Ajuste registrado correctamente',
            saldo,
            movimientos,
        });
    } catch (error) {
        if (error.code === 'AJUSTE_CERO' || error.code === 'MOTIVO_REQUERIDO') {
            return res.status(400).json({ message: error.message, code: error.code });
        }
        return res.status(500).json({
            message: 'Error al registrar el ajuste',
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

        const incluirAusencias = await empresaTieneFeature(idEmpresa, 'ausencias_basicas');
        const soportaAprobacionAusencias = incluirAusencias
            ? await ausenciasSoportaAprobacion()
            : false;

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
            incluirAusencias
                ? Ausencias.findAll({
                    where: {
                        empresa_id: idEmpresa,
                        id_usuario,
                        fecha_baja: null,
                        ...whereSoloAprobadas(soportaAprobacionAusencias),
                        fecha_desde: {
                            [Op.lte]: end.toDate(),
                        },
                        fecha_hasta: {
                            [Op.gte]: start.toDate(),
                        },
                    },
                })
                : Promise.resolve([]),
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
            attributes: MESES_CIERRE_ATTRS,
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
    getMiPerfil,
    editMiPerfil,
    crearUsuario,
    getUsuariosEmpresa,
    editUsuario,
    deleteUsuario,
    getHorasTotalesMesByIdUsuario,
    getResumenHorasMes,
    getTipoHoraUsuario,
    getBolsaHoras,
    ajustarBolsaHoras,
    importarUsuariosEmpresa
};
