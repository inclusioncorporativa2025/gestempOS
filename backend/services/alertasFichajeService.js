const { Op } = require('sequelize');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const MarketplaceEmpresaModulo = require('../models/MarketplaceEmpresaModulo');
const MarketplaceUsuarioModulo = require('../models/MarketplaceUsuarioModulo');
const MarketplaceAlertasFichajeEnvio = require('../models/MarketplaceAlertasFichajeEnvio');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const UsuarioJornada = require('../models/UsuarioJornada');
const Jornada = require('../models/Jornada');
const FestivoEmpresa = require('../models/FestivoEmpresa');
const Fichajes = require('../models/Fichajes');
const Ausencias = require('../models/Ausencias');
const {
  CODIGO_ALERTAS,
  DEFAULT_CONFIG_ALERTAS,
  obtenerModuloPorCodigo,
  puedeEnviarWhatsappAlerta,
  incrementarUsoWhatsapp,
} = require('./marketplaceModuloService');
const { enviarAlertaFichajeEmpleado, enviarAlertaFichajeSupervisor } = require('../utils/mailService');
const { sendText } = require('./whatsappMessaging');
const { ausenciasSoportaAprobacion, whereSoloAprobadas } = require('../utils/ausenciasCompat');
const { expandirRangoDias } = require('./vacacionesConteoService');
const {
  esJornadaFija,
  diaSemanaDesdeNombre,
  minutosJornadaFijaEnFecha,
} = require('../utils/jornadaHoras');

const TZ = 'Europe/Madrid';

/** Festivos del mes por empresa (multitenant). */
const obtenerFestivosSetMes = async (idEmpresa, mesYYYYMM) => {
  const inicio = dayjs.tz(`${mesYYYYMM}-01`, TZ).startOf('month');
  const fin = inicio.endOf('month');
  const festivos = await FestivoEmpresa.findAll({
    where: {
      empresa_id: idEmpresa,
      fecha_baja: null,
      fecha: { [Op.between]: [inicio.toDate(), fin.toDate()] },
    },
  });
  return new Set(
    festivos.map((f) => dayjs(f.fecha).tz(TZ).format('YYYY-MM-DD')),
  );
};

const parseColumn1Jornada = (jornada) => {
  if (!jornada) return null;
  let column1 = jornada.column1;
  if (typeof column1 === 'string') {
    try {
      column1 = JSON.parse(column1);
    } catch {
      column1 = null;
    }
  }
  if (column1 == null || typeof column1 !== 'object') {
    return jornada;
  }
  const base = typeof jornada.get === 'function'
    ? jornada.get({ plain: true })
    : jornada;
  return { ...base, column1 };
};

const normalizarHora = (valor) => {
  if (valor == null || valor === '') return null;
  const str = String(valor).trim();
  const iso = str.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (iso) {
    return `${iso[1].padStart(2, '0')}:${iso[2]}:${(iso[3] || '00').padStart(2, '0')}`;
  }
  const hm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hm) {
    return `${hm[1].padStart(2, '0')}:${hm[2]}:${(hm[3] || '00').padStart(2, '0')}`;
  }
  return null;
};

const parseConfigModulo = (configJson) => ({
  ...DEFAULT_CONFIG_ALERTAS,
  ...(configJson && typeof configJson === 'object' ? configJson : {}),
});

const canalEmailActivo = (row) => {
  if (row.canal_email === false || row.canal_email === 0) return false;
  return true;
};
const canalWhatsappActivo = (row) => row.canal_whatsapp === true || row.canal_whatsapp === 1;

const obtenerHoraEntradaPactada = (jornadaRaw, fecha) => {
  const jornada = parseColumn1Jornada(jornadaRaw);
  if (!jornada || !esJornadaFija(jornada)) return null;
  const diasJornada = jornada.column1?.dias || [];
  const diaSemana = fecha.day();
  const diaConfig = diasJornada.find((d) => diaSemanaDesdeNombre(d?.dia) === diaSemana);
  if (!diaConfig) return null;
  const tramos = Array.isArray(diaConfig.horario) ? diaConfig.horario : [];
  const horaEntrada = tramos[0]?.horaEntrada ?? tramos[0]?.hora_entrada;
  return normalizarHora(horaEntrada);
};

/** Laborable = jornada fija del empleado ese día (lun–dom si está en la jornada), menos festivo empresa. */
const esDiaLaborableJornada = (jornadaRaw, fecha, festivosSet) => {
  const jornada = parseColumn1Jornada(jornadaRaw);
  if (!jornada || !esJornadaFija(jornada)) return false;
  const diasJornada = jornada.column1?.dias || [];
  return minutosJornadaFijaEnFecha(fecha, diasJornada, festivosSet) > 0;
};

const tieneAusenciaAprobadaEnDia = async (idEmpresa, idUsuario, fecha) => {
  const soportaAprobacion = await ausenciasSoportaAprobacion();
  const inicio = fecha.startOf('day').toDate();
  const fin = fecha.endOf('day').toDate();

  const ausencias = await Ausencias.findAll({
    where: {
      empresa_id: idEmpresa,
      id_usuario: idUsuario,
      fecha_baja: null,
      ...whereSoloAprobadas(soportaAprobacion),
      fecha_desde: { [Op.lte]: fin },
      fecha_hasta: { [Op.gte]: inicio },
    },
  });

  const clave = fecha.format('YYYY-MM-DD');
  return ausencias.some((ausencia) => (
    expandirRangoDias(ausencia.fecha_desde, ausencia.fecha_hasta).some(
      (d) => d.format('YYYY-MM-DD') === clave,
    )
  ));
};

const tieneFichajeEntradaEnDia = async (idEmpresa, idUsuario, fecha) => {
  const inicio = fecha.tz(TZ).startOf('day').toDate();
  const fin = fecha.tz(TZ).endOf('day').toDate();
  const fichaje = await Fichajes.findOne({
    where: {
      empresa_id: idEmpresa,
      id_usuario: idUsuario,
      fecha_baja: null,
      fecha_entrada: { [Op.between]: [inicio, fin] },
    },
  });
  return Boolean(fichaje);
};

const envioYaRegistrado = async ({
  idEmpresa,
  idUsuario,
  fechaDia,
  tipoEnvio,
  canal,
}) => {
  const row = await MarketplaceAlertasFichajeEnvio.findOne({
    where: {
      id_empresa: idEmpresa,
      id_usuario: idUsuario,
      fecha_dia: fechaDia,
      tipo_envio: tipoEnvio,
      canal,
    },
  });
  return Boolean(row);
};

const registrarEnvio = async ({
  idEmpresa,
  idUsuario,
  fechaDia,
  tipoEnvio,
  canal,
  idUsuarioModulo,
}) => {
  await MarketplaceAlertasFichajeEnvio.create({
    id_empresa: idEmpresa,
    id_usuario: idUsuario,
    fecha_dia: fechaDia,
    tipo_envio: tipoEnvio,
    canal,
    enviado_at: new Date(),
    id_usuario_modulo: idUsuarioModulo ?? null,
  });
};

const obtenerEmailsSupervisoresEmpresa = async (idEmpresa) => {
  const membresias = await UsuarioEmpresa.findAll({
    where: {
      id_empresa: idEmpresa,
      fecha_baja: null,
      activo: true,
      tipo_usuario: { [Op.in]: [3, 4] },
    },
  });
  if (!membresias.length) return [];

  const usuarios = await Usuario.findAll({
    where: {
      id_usuario: { [Op.in]: membresias.map((m) => m.id_usuario) },
      fecha_baja: null,
    },
    attributes: ['email'],
  });

  return usuarios
    .map((u) => String(u.email || '').trim())
    .filter((email) => email.includes('@'));
};

const evaluarVentanasEnvio = (ahora, horaEntradaStr, minutosGracia, recordatorioMinutos) => {
  const fechaDia = ahora.format('YYYY-MM-DD');
  const limiteAlerta = dayjs.tz(`${fechaDia}T${horaEntradaStr}`, TZ).add(minutosGracia, 'minute');
  const ventanas = [];

  if (ahora.isSame(limiteAlerta) || ahora.isAfter(limiteAlerta)) {
    ventanas.push({ tipo: 'alerta', desde: limiteAlerta });
  }

  if (recordatorioMinutos != null && Number(recordatorioMinutos) > 0) {
    const limiteRecordatorio = limiteAlerta.add(Number(recordatorioMinutos), 'minute');
    if (ahora.isSame(limiteRecordatorio) || ahora.isAfter(limiteRecordatorio)) {
      ventanas.push({ tipo: 'recordatorio', desde: limiteRecordatorio });
    }
  }

  return ventanas;
};

const procesarEmpresa = async ({
  idEmpresa,
  idModulo,
  configJson,
  ahora,
  fechaDia,
  dryRun,
  ignorarEnviosPrevios,
  resumen,
}) => {
  const config = parseConfigModulo(configJson);
  const minutosGracia = Number(config.minutos_gracia) || 15;
  const recordatorioMinutos = config.recordatorio_minutos;
  const festivosSet = await obtenerFestivosSetMes(idEmpresa, ahora.format('YYYY-MM'));

  const asignaciones = await MarketplaceUsuarioModulo.findAll({
    where: {
      id_empresa: idEmpresa,
      id_modulo: idModulo,
      activo: true,
      fecha_baja: null,
    },
  });

  if (!asignaciones.length) return;

  const ids = asignaciones.map((a) => a.id_usuario);
  const usuarios = await Usuario.findAll({
    where: { id_usuario: { [Op.in]: ids }, fecha_baja: null },
  });
  const usuarioPorId = new Map(usuarios.map((u) => [u.id_usuario, u]));

  const usuarioJornadas = await UsuarioJornada.findAll({
    where: {
      empresa_id: idEmpresa,
      id_usuario: { [Op.in]: ids },
      fecha_baja: null,
    },
  });
  const jornadaIds = [...new Set(usuarioJornadas.map((uj) => uj.id_jornada))];
  const jornadas = jornadaIds.length
    ? await Jornada.findAll({
      where: {
        empresa_id: idEmpresa,
        id_jornada: { [Op.in]: jornadaIds },
        fecha_baja: null,
      },
    })
    : [];
  const jornadaPorId = new Map(jornadas.map((j) => [j.id_jornada, j]));

  for (const asignacion of asignaciones) {
    resumen.evaluados += 1;
    const usuario = usuarioPorId.get(asignacion.id_usuario);
    if (!usuario) {
      resumen.omitidos.push({ id_usuario: asignacion.id_usuario, motivo: 'usuario_no_encontrado' });
      continue;
    }

    const uj = usuarioJornadas.find((row) => row.id_usuario === asignacion.id_usuario);
    const jornada = uj ? jornadaPorId.get(uj.id_jornada) : null;

    if (!esDiaLaborableJornada(jornada, ahora, festivosSet)) {
      resumen.omitidos.push({ id_usuario: usuario.id_usuario, motivo: 'no_laborable' });
      continue;
    }

    if (await tieneAusenciaAprobadaEnDia(idEmpresa, usuario.id_usuario, ahora)) {
      resumen.omitidos.push({ id_usuario: usuario.id_usuario, motivo: 'ausencia' });
      continue;
    }

    const horaEntrada = obtenerHoraEntradaPactada(jornada, ahora);
    if (!horaEntrada) {
      resumen.omitidos.push({ id_usuario: usuario.id_usuario, motivo: 'sin_hora_entrada' });
      continue;
    }

    if (await tieneFichajeEntradaEnDia(idEmpresa, usuario.id_usuario, ahora)) {
      resumen.omitidos.push({ id_usuario: usuario.id_usuario, motivo: 'ya_ficho' });
      continue;
    }

    const ventanas = evaluarVentanasEnvio(
      ahora,
      horaEntrada,
      minutosGracia,
      recordatorioMinutos,
    );

    if (!ventanas.length) {
      resumen.omitidos.push({ id_usuario: usuario.id_usuario, motivo: 'antes_de_gracia' });
      continue;
    }

    const horaEntradaLabel = horaEntrada.slice(0, 5);

    for (const ventana of ventanas) {
      const payloadBase = {
        nombreEmpleado: usuario.nombre,
        fechaDia,
        horaEntrada: horaEntradaLabel,
        tipoEnvio: ventana.tipo,
      };

      if (canalEmailActivo(asignacion)) {
        const ya = ignorarEnviosPrevios ? false : await envioYaRegistrado({
          idEmpresa,
          idUsuario: usuario.id_usuario,
          fechaDia,
          tipoEnvio: ventana.tipo,
          canal: 'email',
        });
        if (ya) {
          resumen.omitidos.push({
            id_usuario: usuario.id_usuario,
            motivo: 'ya_enviado',
            canal: 'email',
            tipo: ventana.tipo,
          });
        } else if (dryRun) {
          resumen.simulados.push({
            id_usuario: usuario.id_usuario,
            canal: 'email',
            tipo: ventana.tipo,
            email: usuario.email,
          });
        } else {
          try {
            await enviarAlertaFichajeEmpleado({
              email: usuario.email,
              ...payloadBase,
            });
            await registrarEnvio({
              idEmpresa,
              idUsuario: usuario.id_usuario,
              fechaDia,
              tipoEnvio: ventana.tipo,
              canal: 'email',
              idUsuarioModulo: asignacion.id_usuario_modulo,
            });
            resumen.enviados.push({
              id_usuario: usuario.id_usuario,
              canal: 'email',
              tipo: ventana.tipo,
            });

            if (config.notificar_supervisor && ventana.tipo === 'alerta') {
              const supervisores = await obtenerEmailsSupervisoresEmpresa(idEmpresa);
              if (supervisores.length) {
                await enviarAlertaFichajeSupervisor({
                  destinatarios: supervisores,
                  nombreEmpleado: usuario.nombre,
                  fechaDia,
                  horaEntrada: horaEntradaLabel,
                });
              }
            }
          } catch (error) {
            resumen.errores.push({
              id_usuario: usuario.id_usuario,
              canal: 'email',
              tipo: ventana.tipo,
              error: error.message,
            });
          }
        }
      } else {
        resumen.omitidos.push({
          id_usuario: usuario.id_usuario,
          motivo: 'canal_email_desactivado',
          tipo: ventana.tipo,
        });
      }

      if (canalWhatsappActivo(asignacion) && usuario.telefono_whatsapp) {
        const ya = ignorarEnviosPrevios ? false : await envioYaRegistrado({
          idEmpresa,
          idUsuario: usuario.id_usuario,
          fechaDia,
          tipoEnvio: ventana.tipo,
          canal: 'whatsapp',
        });
        if (ya) {
          resumen.omitidos.push({
            id_usuario: usuario.id_usuario,
            motivo: 'ya_enviado',
            canal: 'whatsapp',
            tipo: ventana.tipo,
          });
        } else {
          const puedeWa = await puedeEnviarWhatsappAlerta(idEmpresa, idModulo);
          if (!puedeWa) {
            resumen.omitidos.push({
              id_usuario: usuario.id_usuario,
              motivo: 'cupo_whatsapp_agotado',
            });
          } else if (dryRun) {
            resumen.simulados.push({
              id_usuario: usuario.id_usuario,
              canal: 'whatsapp',
              tipo: ventana.tipo,
            });
          } else {
            try {
              const texto = ventana.tipo === 'recordatorio'
                ? `${usuario.nombre}, recordatorio: aún no consta tu fichaje de entrada previsto a las ${horaEntradaLabel} (${fechaDia}).`
                : `${usuario.nombre}, no consta tu fichaje de entrada previsto a las ${horaEntradaLabel} (${fechaDia}). Regístralo en TimeCor.`;
              await sendText(usuario.telefono_whatsapp, texto);
              await incrementarUsoWhatsapp(idEmpresa, idModulo, 1);
              await registrarEnvio({
                idEmpresa,
                idUsuario: usuario.id_usuario,
                fechaDia,
                tipoEnvio: ventana.tipo,
                canal: 'whatsapp',
                idUsuarioModulo: asignacion.id_usuario_modulo,
              });
              resumen.enviados.push({
                id_usuario: usuario.id_usuario,
                canal: 'whatsapp',
                tipo: ventana.tipo,
              });
            } catch (error) {
              resumen.errores.push({
                id_usuario: usuario.id_usuario,
                canal: 'whatsapp',
                tipo: ventana.tipo,
                error: error.message,
              });
            }
          }
        }
      } else if (canalWhatsappActivo(asignacion) && !usuario.telefono_whatsapp) {
        resumen.omitidos.push({
          id_usuario: usuario.id_usuario,
          motivo: 'sin_telefono_whatsapp',
          tipo: ventana.tipo,
        });
      }
    }
  }
};

/**
 * Evalúa y envía alertas de fichaje (módulo alertas_fichaje).
 */
const ejecutarAlertasFichaje = async ({
  idEmpresa = null,
  fecha = null,
  dryRun = false,
  horaReferencia = null,
  ignorarEnviosPrevios = false,
} = {}) => {
  const modulo = await obtenerModuloPorCodigo(CODIGO_ALERTAS);
  if (!modulo) {
    return { ok: false, message: 'Módulo alertas_fichaje no encontrado' };
  }

  const ahoraReal = dayjs().tz(TZ);
  let ahora = fecha
    ? dayjs.tz(fecha, TZ)
        .hour(ahoraReal.hour())
        .minute(ahoraReal.minute())
        .second(0)
        .millisecond(0)
    : ahoraReal;

  if (horaReferencia) {
    const hm = String(horaReferencia).match(/^(\d{1,2}):(\d{2})/);
    if (hm) {
      ahora = ahora
        .hour(Number(hm[1]))
        .minute(Number(hm[2]))
        .second(0)
        .millisecond(0);
    }
  }

  const fechaDia = ahora.format('YYYY-MM-DD');

  const whereContrato = {
    id_modulo: modulo.id_modulo,
    estado: 'active',
    fecha_baja: null,
  };
  if (idEmpresa) {
    whereContrato.id_empresa = idEmpresa;
  }

  const contratos = await MarketplaceEmpresaModulo.findAll({ where: whereContrato });

  const resumen = {
    ok: true,
    dry_run: dryRun,
    fecha_dia: fechaDia,
    hora_referencia: ahora.format('HH:mm'),
    empresas: contratos.length,
    evaluados: 0,
    enviados: [],
    simulados: [],
    omitidos: [],
    errores: [],
  };

  for (const contrato of contratos) {
    await procesarEmpresa({
      idEmpresa: contrato.id_empresa,
      idModulo: modulo.id_modulo,
      configJson: contrato.config_json,
      ahora,
      fechaDia,
      dryRun,
      ignorarEnviosPrevios,
      resumen,
    });
  }

  return resumen;
};

module.exports = {
  ejecutarAlertasFichaje,
};
