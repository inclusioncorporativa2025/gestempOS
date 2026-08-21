const { sequelize } = require('../config/db');
const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const ConfiguracionEsquemaModel = require('../models/ConfiguracionEsquemaModel');
const { getNextGlobalId } = require('../utils/empresaScope');
const { enviarBienvenidaEmpresa } = require('../utils/mailService');

const {
  normalizePlanId,
  getPlanLabel,
  getPlanMinLicencias,
  DEFAULT_PLAN,
} = require('../config/plans');
const {
  resolverPlan,
  camposPlanEmpresa,
  obtenerCodigoPlanEmpresa,
} = require('../services/planCatalogService');
const { isValidRegionCode, resolveRegionCode, provinceByCpPrefix } = require('../config/spanishRegions');
const { calcularFechaFinPrueba, extenderPeriodoPruebaEmpresa, TrialExtensionError } = require('../services/trialService');
const { crearCheckoutTrialPendiente } = require('../services/billingService');
const { purgarEmpresaCompleta } = require('../services/empresaPurgeService');
const {
  buscarInvitacionValida,
  registrarVentaDesdeInvitacion,
  crmTablasDisponibles,
} = require('../services/crmHubService');
const {
  findEmpresaActivaPorCif,
  normalizeEmail,
  isEmailValido,
  resolverUsuarioIdentidad,
  reactivarUsuarioGlobal,
  usuarioEstaActivoGlobal,
} = require('../utils/identityChecks');

const trimOptional = (value) => {
  const text = String(value ?? '').trim();
  return text || null;
};

const buildPlanCliente = async (empresa) => {
  const codigo = await obtenerCodigoPlanEmpresa(empresa);
  return {
    id_plan: empresa.id_plan ?? null,
    plan: codigo,
    plan_label: getPlanLabel(codigo),
  };
};

const pickMiEmpresaParaCliente = async (empresa) => {
  const planInfo = await buildPlanCliente(empresa);
  return {
  nombre: empresa.nombre,
  alias: empresa.alias,
  identificador_fiscal: empresa.identificador_fiscal,
  razon_social: empresa.razon_social,
  nombre_comercial: empresa.nombre_comercial,
  email: empresa.email,
  telefono: empresa.telefono,
  web: empresa.web,
  direccion: empresa.direccion,
  codigo_postal: empresa.codigo_postal,
  ciudad: empresa.ciudad,
  provincia: empresa.provincia,
  codigo_region_festivos: empresa.codigo_region_festivos,
  pais: empresa.pais,
  sector: empresa.sector,
  actividad: empresa.actividad,
  licencias: empresa.licencias,
  logo_url: empresa.logo_url,
  color_principal: empresa.color_principal,
  ...planInfo,
};
};

const pickEmpresaBranding = async (empresa) => {
  const planInfo = await buildPlanCliente(empresa);
  return {
  nombre: empresa.nombre,
  alias: empresa.alias,
  logo_url: empresa.logo_url,
  licencias: empresa.licencias,
  ...planInfo,
};
};

const registerCompany = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const esRegistroPublico = req.body.idUsuario == null;
        const {
            Administrador,
            CIF,
            email,
            nombre_empresa,
            dni,
            numLicencias,
            alias,
            plan,
            cicloFacturacion,
            direccion,
            codigo_postal,
            ciudad,
            provincia,
        } = req.body.values;
        const idUsuarioAccion = req.body.idUsuario;
        const schemaName = `empresa_${nombre_empresa.toLowerCase().replace(/\s+/g, '_')}`;
        const fecha = new Date();
        const planRow = await resolverPlan({
            plan: plan || (esRegistroPublico ? 'rrhh' : DEFAULT_PLAN),
        });
        const planFields = camposPlanEmpresa(planRow);
        const planId = planFields.plan;
        const minLicencias = getPlanMinLicencias(planId);
        const licenciasSolicitadas = Number(numLicencias);

        if (!Number.isFinite(licenciasSolicitadas) || licenciasSolicitadas < minLicencias) {
            await transaction.rollback();
            return res.status(400).json({
                message: `El plan ${getPlanLabel(planId)} requiere al menos ${minLicencias} licencias`,
            });
        }

        const cifNormalizado = String(CIF ?? '').trim();
        if (!cifNormalizado) {
            await transaction.rollback();
            return res.status(400).json({ message: 'El CIF es obligatorio' });
        }

        const empresaCifExistente = await findEmpresaActivaPorCif(cifNormalizado, { transaction });
        if (empresaCifExistente) {
            await transaction.rollback();
            return res.status(409).json({
                message: 'Ya existe una empresa registrada con este CIF',
                codigo: 'CIF_EN_USO',
            });
        }

        const emailNormalizado = normalizeEmail(email);
        if (!emailNormalizado) {
            await transaction.rollback();
            return res.status(400).json({ message: 'El email de contacto es obligatorio' });
        }
        if (!isEmailValido(emailNormalizado)) {
            await transaction.rollback();
            return res.status(400).json({
                message: 'El email de contacto no es válido',
                codigo: 'EMAIL_INVALIDO',
            });
        }

        const direccionFiscal = String(direccion ?? '').trim();
        const codigoPostal = String(codigo_postal ?? '').replace(/\s/g, '');
        const ciudadFiscal = String(ciudad ?? '').trim();
        const provinciaFiscal = String(provincia ?? '').trim();

        if (esRegistroPublico) {
            if (!direccionFiscal || !codigoPostal || !ciudadFiscal || !provinciaFiscal) {
                await transaction.rollback();
                return res.status(400).json({
                    message: 'La dirección fiscal es obligatoria: dirección, código postal, ciudad y provincia.',
                    codigo: 'DATOS_FISCALES_INCOMPLETOS',
                });
            }
            if (!/^\d{5}$/.test(codigoPostal)) {
                await transaction.rollback();
                return res.status(400).json({ message: 'El código postal debe tener 5 dígitos' });
            }
        }

        const codigoRegionFestivos = resolveRegionCode({
            codigoPostal,
            provincia: provinciaFiscal || provinceByCpPrefix[codigoPostal.slice(0, 2)] || null,
        });

        const identidadAdmin = await resolverUsuarioIdentidad(
            { email: emailNormalizado, dni, respuestaPublica: esRegistroPublico },
            { transaction },
        );
        if (identidadAdmin.conflict) {
            await transaction.rollback();
            return res.status(409).json(identidadAdmin.conflict);
        }

        let usuarioAdmin = identidadAdmin.usuario;
        const adminExistente = !identidadAdmin.esNuevo;

        if (adminExistente && !usuarioEstaActivoGlobal(usuarioAdmin)) {
            usuarioAdmin = await reactivarUsuarioGlobal(usuarioAdmin.id_usuario, {
                nombre: Administrador,
                dni,
                idUsuarioAccion: idUsuarioAccion ?? usuarioAdmin.id_usuario,
                fecha,
                transaction,
            });
        }

        if (!adminExistente) {
            const idUsuarioNuevo = await getNextGlobalId(Usuario, 'id_usuario', transaction);
            usuarioAdmin = await Usuario.create({
                id_usuario: idUsuarioNuevo,
                nombre: Administrador,
                email: emailNormalizado,
                fecha_alta: fecha,
                usuario_alta: idUsuarioAccion ?? idUsuarioNuevo,
                tipo_usuario: 3,
                dni: dni,
                activo: true,
                requiere_reset_password: true,
            }, { transaction });
        }

        const usuarioAlta = idUsuarioAccion ?? usuarioAdmin.id_usuario;

        const idEmpresa = await getNextGlobalId(Empresa, 'id_empresa', transaction);
        const empresa = await Empresa.create({
            id_empresa: idEmpresa,
            nombre: nombre_empresa,
            identificador_fiscal: cifNormalizado,
            razon_social: nombre_empresa,
            email: emailNormalizado,
            direccion: direccionFiscal || null,
            codigo_postal: codigoPostal || null,
            ciudad: ciudadFiscal || null,
            provincia: provinciaFiscal || null,
            codigo_region_festivos: codigoRegionFestivos,
            pais: 'España',
            fecha_alta: fecha,
            usuario_alta: usuarioAlta,
            licencias: licenciasSolicitadas,
            id_plan: planFields.id_plan,
            plan: planFields.plan,
            alias : alias
        }, { transaction });

        const idConfig = await getNextGlobalId(ConfiguracionEsquemaModel, 'id_configuracion_esquema', transaction);
        await ConfiguracionEsquemaModel.create({
            id_configuracion_esquema: idConfig,
            nombre_esquema: schemaName,
            id_empresa: empresa.id_empresa,
            fecha_alta: fecha,
            usuario_alta: usuarioAlta,
        }, { transaction });

        const idUsuarioEmpresa = await getNextGlobalId(UsuarioEmpresa, 'id_usuario_empresa', transaction);
        await UsuarioEmpresa.create({
            id_usuario_empresa: idUsuarioEmpresa,
            id_usuario: usuarioAdmin.id_usuario,
            id_empresa: empresa.id_empresa,
            tipo_usuario: 3,
            fecha_alta: fecha,
            usuario_alta: usuarioAlta,
        }, { transaction });

        const modoFacturacion = esRegistroPublico ? 'trial' : 'legacy';
        const trialEndsAt = esRegistroPublico ? calcularFechaFinPrueba(fecha) : null;
        const estadoSuscripcion = null;

        await sequelize.query(
          `INSERT INTO empresa_facturacion (
             id_empresa, modo_facturacion, id_plan, licencias_facturadas,
             trial_ends_at, estado_suscripcion
           )
           VALUES (:idEmpresa, :modo, :idPlan, :licencias, :trialEndsAt, :estadoSuscripcion)
           ON DUPLICATE KEY UPDATE
             id_plan = VALUES(id_plan),
             licencias_facturadas = VALUES(licencias_facturadas),
             modo_facturacion = VALUES(modo_facturacion),
             trial_ends_at = VALUES(trial_ends_at),
             estado_suscripcion = VALUES(estado_suscripcion)`,
          {
            replacements: {
              idEmpresa: empresa.id_empresa,
              modo: modoFacturacion,
              idPlan: planFields.id_plan,
              licencias: licenciasSolicitadas,
              trialEndsAt,
              estadoSuscripcion,
            },
            transaction,
          },
        );

        let invitacionRegistro = null;
        if (esRegistroPublico && (await crmTablasDisponibles())) {
          const invToken = req.body.invitacionToken || req.body.inv;
          const invCodigo = req.body.invitacionCodigo || req.body.codigoInvitacion;
          if (invToken || invCodigo) {
            invitacionRegistro = await buscarInvitacionValida({
              token: invToken,
              codigoCorto: invCodigo,
            });
            if (!invitacionRegistro) {
              await transaction.rollback();
              return res.status(400).json({
                message: 'La invitación de registro no es válida o ha expirado',
                codigo: 'INVITACION_INVALIDA',
              });
            }
          }
        }

        if (invitacionRegistro) {
          await registrarVentaDesdeInvitacion({
            idEmpresa: empresa.id_empresa,
            invitacion: invitacionRegistro,
            usuarioAlta: invitacionRegistro.id_usuario_comercial,
            transaction,
          });
        }

        await transaction.commit();

        const respuesta = {
          message: adminExistente
            ? 'Empresa registrada con éxito. Se ha vinculado su cuenta como administrador. Revisa el correo para crear tu contraseña.'
            : 'Empresa registrada con éxito. Revisa el correo para crear tu contraseña e iniciar sesión.',
          emailBienvenidaEnviado: null,
          adminExistente,
        };

        res.status(201).json(respuesta);

        enviarBienvenidaEmpresa(usuarioAdmin, {
          nombreEmpresa: nombre_empresa,
          licencias: numLicencias,
          alias,
          identificadorFiscal: CIF,
        })
          .then((devWelcomeUrl) => {
            if (process.env.NODE_ENV !== 'production' && devWelcomeUrl) {
              console.info('[DEV] Enlace de bienvenida:', devWelcomeUrl);
            }
          })
          .catch((mailError) => {
            console.error('Empresa creada pero falló el email de bienvenida:', mailError.message);
          });
    } catch (error) {

        await transaction.rollback();
        console.error(`Error proceso creación empresa: ${error.message}`);

        if (error.name === 'SequelizeUniqueConstraintError') {
            const campo = error.errors?.[0]?.path;
            if (campo === 'email') {
                return res.status(409).json({
                    message: 'Este email ya está registrado en la plataforma',
                    codigo: 'EMAIL_EN_USO',
                });
            }
            if (campo === 'identificador_fiscal') {
                return res.status(409).json({
                    message: 'Ya existe una empresa registrada con este CIF',
                    codigo: 'CIF_EN_USO',
                });
            }
        }

        res.status(500).json({ error: 'Error al registrar la empresa' });
    }
};

// La tabla `tipo_acceso` no existe en el modelo MySQL multi-empresa
// (no estaba en PostgreSQL ni se migró). Se mantiene la firma para no
// romper las llamadas existentes, devolviendo una lista vacía.
const getTipoRegistro = async (req, res)=> {
        const tiposAcceso = [];
        if (!res) {
            return tiposAcceso;
        }
        return res.status(200).json({ message: 'Datos recuperados correctamente', tiposAcceso });
};

const getEmpresas = async (req, res)=> {

  try {
      var empresas = await Empresa.findAll({
          where: {
            fecha_baja: null,
          },
          order: [
              ['fecha_alta', 'DESC']
            ]
        });
        if(!res){
          return empresas;
        }else{
          res.status(200).json({ message: 'Datos recuperados correctamente',empresas });
        }

  } catch (error) {
      console.error('Error al obtener tipos de acceso:', error);
      res.status(500).json({ error: 'Error al obtener tipos de acceso' });
  }

};

const getEmpresasUsuarios = async (req, res)=> {

  try {

         const result = await sequelize.query(
                `SELECT e.id_empresa, e.nombre, e.identificador_fiscal, e.fecha_alta, e.licencias,
                        e.id_plan, e.plan, e.activo, e.alias, e.fecha_baja,
                        ef.modo_facturacion,
                        ef.estado_suscripcion,
                        ef.trial_ends_at,
                        ef.stripe_subscription_id,
                        ef.cancel_at_period_end,
                        (
                          CASE
                            WHEN LOWER(IFNULL(ef.modo_facturacion, '')) = 'trial'
                              AND ef.stripe_subscription_id IS NULL
                              AND ef.trial_ends_at IS NOT NULL
                              AND ef.trial_ends_at <= UTC_TIMESTAMP() THEN 1
                            ELSE 0
                          END
                        ) AS requiere_enlace_pago,
                        (
                          SELECT u.email
                          FROM m_usuarios_empresas ue
                          INNER JOIN m_usuarios u ON u.id_usuario = ue.id_usuario AND u.tipo_usuario = 3
                          WHERE ue.id_empresa = e.id_empresa
                          ORDER BY ue.fecha_baja IS NULL DESC, ue.fecha_alta DESC
                          LIMIT 1
                        ) AS email
                FROM m_empresas e
                LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
                ORDER BY e.fecha_alta DESC`,
                { type: sequelize.QueryTypes.SELECT }
              );
        if(!res){
          return result;
        }else{
          res.status(200).json({ message: 'Datos recuperados correctamente',result });
        }

  } catch (error) {
      console.error('Error al obtener tipos de acceso:', error);
      res.status(500).json({ error: 'Error al obtener tipos de acceso' });
  }

};

const editEmpresa = async (req, res)=> {

  try {

    const { idEmpresa,datos ,idUsuario} = req.body;
    const fecha = new Date();
    const idEmpresaNum = Number(idEmpresa);

    const empresa = await Empresa.findByPk(idEmpresaNum);
    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    const planRow = await resolverPlan({
      id_plan: datos.id_plan,
      plan: datos.plan ?? empresa.plan,
    });
    const planFields = camposPlanEmpresa(planRow);
    const planId = planFields.plan;
    const licencias = Number(datos.licencias ?? empresa.licencias);
    const minLicencias = getPlanMinLicencias(planId);

    if (!Number.isFinite(licencias) || licencias < minLicencias) {
      return res.status(400).json({
        message: `El plan ${getPlanLabel(planId)} requiere al menos ${minLicencias} licencias`,
      });
    }

      await Empresa.update(
        {
            identificador_fiscal: datos.identificador_fiscal,
            licencias,
            nombre: datos.nombre,
            fecha_modificacion:fecha,
            usuario_modificacion : idUsuario,
            activo: datos.activo,
            alias: datos.alias,
            id_plan: planFields.id_plan,
            plan: planFields.plan,
        },
        {
            where: {
            id_empresa: idEmpresaNum,
          }
        });

      await sequelize.query(
        `UPDATE empresa_facturacion ef
         SET ef.id_plan = :idPlan,
             ef.licencias_facturadas = :licencias
         WHERE ef.id_empresa = :idEmpresa`,
        {
          replacements: {
            idPlan: planFields.id_plan,
            licencias,
            idEmpresa: idEmpresaNum,
          },
        },
      );

      const activarSuscripcion =
        datos.suscripcion_activa === true ||
        datos.suscripcion_activa === 1 ||
        datos.estado_suscripcion === 'active';

      if (activarSuscripcion || datos.estado_suscripcion != null) {
        await sequelize.query(
          `UPDATE empresa_facturacion
           SET estado_suscripcion = :estadoSuscripcion,
               modo_facturacion = CASE
                 WHEN :estadoSuscripcion = 'active' THEN 'stripe'
                 ELSE modo_facturacion
               END
           WHERE id_empresa = :idEmpresa`,
          {
            replacements: {
              estadoSuscripcion: activarSuscripcion ? 'active' : datos.estado_suscripcion,
              idEmpresa: idEmpresaNum,
            },
          },
        );
      }

        if(!res){
          return true;
        }else{
          res.status(200).json({ message: 'Empresa actualizada correctamente' });
        }

  } catch (error) {
      console.error('Error al editar empresa:', error);
      res.status(500).json({ error: 'Error al actualizar la empresa' });
  }

};

// Gestión de tipos de acceso deshabilitada: la tabla `tipo_acceso` no existe
// en el modelo MySQL multi-empresa. Se mantienen las firmas para no romper
// rutas/importaciones existentes.
const updateTipoRegistro = async (req, res)=> {
    return res.status(200).json({ message: 'Funcionalidad de tipos de acceso no disponible', tiposNuevos: [] });
}

async function bulkCreateEnEsquema() {}

async function updateTipoRegistroVivo() {}

async function deleteRegistroVivo() {}

  const eliminarEmpresa = async (req, res)=> {

    try {

      const { idEmpresa, idUsuario } = req.body;
      const idEmpresaNum = Number(idEmpresa);

      if (!idEmpresaNum) {
        return res.status(400).json({ error: 'idEmpresa obligatorio' });
      }

      const fecha = new Date();

      const [filasEmpresa] = await Empresa.update(
        {
          fecha_modificacion: fecha,
          usuario_modificacion: idUsuario,
          usuario_baja: idUsuario,
          fecha_baja: fecha,
          activo: 0,
        },
        {
          where: {
            id_empresa: idEmpresaNum,
            fecha_baja: null,
          },
        },
      );

      if (!filasEmpresa) {
        const existe = await Empresa.findByPk(idEmpresaNum);
        if (!existe) {
          return res.status(404).json({ error: 'Empresa no encontrada' });
        }
        return res.status(400).json({
          error: 'La empresa ya estaba dada de baja',
        });
      }

      await UsuarioEmpresa.update(
        {
          fecha_baja: fecha,
          usuario_baja: idUsuario,
        },
        {
          where: { id_empresa: idEmpresaNum, fecha_baja: null },
        },
      );

      if (!res) {
        return filasEmpresa;
      }

      return res.status(200).json({
        message: 'Baja empresa correctamente',
        filasActualizadas: filasEmpresa,
      });

    } catch (error) {
        console.error('Error Baja empresa:', error);
        res.status(500).json({ error: 'Error Baja empresa' });
    }

  };

  const reactivarEmpresa = async (req, res) => {
    try {
      const { idEmpresa, idUsuario } = req.body;
      const idEmpresaNum = Number(idEmpresa);
      const fecha = new Date();

      const [filas] = await Empresa.update(
        {
          fecha_baja: null,
          usuario_baja: null,
          activo: 1,
          fecha_modificacion: fecha,
          usuario_modificacion: idUsuario,
        },
        {
          where: { id_empresa: idEmpresaNum },
        },
      );

      if (!filas) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      await UsuarioEmpresa.update(
        {
          fecha_baja: null,
          usuario_baja: null,
        },
        {
          where: { id_empresa: idEmpresaNum },
        },
      );

      res.status(200).json({ message: 'Empresa reactivada correctamente' });
    } catch (error) {
      console.error('Error reactivar empresa:', error);
      res.status(500).json({ error: 'Error al reactivar la empresa' });
    }
  };

const getMiEmpresa = async (req, res) => {
  try {
    const idEmpresa = Number(req.user?.id_empresa);
    if (!idEmpresa) {
      return res.status(400).json({ error: 'No hay empresa asociada a la sesión' });
    }

    const empresa = await Empresa.findByPk(idEmpresa);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    return res.status(200).json({
      message: 'Datos recuperados correctamente',
      empresa: await pickMiEmpresaParaCliente(empresa),
    });
  } catch (error) {
    console.error('Error al obtener empresa del usuario:', error);
    return res.status(500).json({ error: 'Error al obtener los datos de la empresa' });
  }
};

const getEmpresaBranding = async (req, res) => {
  try {
    const idEmpresa = Number(req.user?.id_empresa);
    if (!idEmpresa) {
      return res.status(200).json({
        branding: { nombre: null, alias: null, logo_url: null },
        trial: null,
      });
    }

    const empresa = await Empresa.findByPk(idEmpresa);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const { obtenerEstadoTrialEmpresa } = require('../services/trialService');
    const trial = await obtenerEstadoTrialEmpresa(idEmpresa);

    return res.status(200).json({
      branding: await pickEmpresaBranding(empresa),
      trial,
    });
  } catch (error) {
    console.error('Error al obtener branding de empresa:', error);
    return res.status(500).json({ error: 'Error al obtener el branding de la empresa' });
  }
};

const editMiEmpresa = async (req, res) => {
  try {
    const idEmpresa = Number(req.user?.id_empresa);
    const idUsuario = Number(req.user?.id_usuario);
    const { datos } = req.body;

    if (!idEmpresa) {
      return res.status(400).json({ error: 'No hay empresa asociada a la sesión' });
    }

    if (!datos?.nombre?.trim() || !datos?.alias?.trim()) {
      return res.status(400).json({ error: 'El nombre y el alias de la empresa son obligatorios' });
    }

    const codigoRegion = trimOptional(datos.codigo_region_festivos);
    if (codigoRegion && !isValidRegionCode(codigoRegion)) {
      return res.status(400).json({ error: 'Comunidad autónoma para festivos no válida' });
    }

    const [filas] = await Empresa.update(
      {
        nombre: datos.nombre.trim(),
        alias: datos.alias.trim(),
        identificador_fiscal: trimOptional(datos.identificador_fiscal),
        razon_social: trimOptional(datos.razon_social),
        nombre_comercial: trimOptional(datos.nombre_comercial),
        email: trimOptional(datos.email),
        telefono: trimOptional(datos.telefono),
        web: trimOptional(datos.web),
        direccion: trimOptional(datos.direccion),
        codigo_postal: trimOptional(datos.codigo_postal),
        ciudad: trimOptional(datos.ciudad),
        provincia: trimOptional(datos.provincia),
        codigo_region_festivos: codigoRegion,
        pais: trimOptional(datos.pais) || 'España',
        sector: trimOptional(datos.sector),
        actividad: trimOptional(datos.actividad),
        logo_url: trimOptional(datos.logo_url),
        color_principal: trimOptional(datos.color_principal),
        fecha_modificacion: new Date(),
        usuario_modificacion: idUsuario,
      },
      { where: { id_empresa: idEmpresa } },
    );

    if (!filas) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const empresa = await Empresa.findByPk(idEmpresa);
    return res.status(200).json({
      message: 'Empresa actualizada correctamente',
      empresa: await pickMiEmpresaParaCliente(empresa),
    });
  } catch (error) {
    console.error('Error al editar empresa del usuario:', error);
    return res.status(500).json({ error: 'Error al guardar los datos de la empresa' });
  }
};

/** Alta de empresa desde la landing (sin sesión). */
const registerCompanyPublic = async (req, res) => {
  req.body.idUsuario = null;
  return registerCompany(req, res);
};

const obtenerAdminEmpresa = async (idEmpresa) => {
  const rows = await sequelize.query(
    `SELECT u.id_usuario, u.email, u.nombre
     FROM m_usuarios u
     INNER JOIN m_usuarios_empresas ue ON ue.id_usuario = u.id_usuario
     WHERE ue.id_empresa = :idEmpresa
       AND ue.tipo_usuario = 3
       AND ue.fecha_baja IS NULL
       AND IFNULL(ue.activo, 1) = 1
       AND IFNULL(u.activo, 1) = 1
     ORDER BY ue.fecha_alta ASC
     LIMIT 1`,
    {
      replacements: { idEmpresa },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return rows[0] ?? null;
};

const generarEnlacePagoEmpresa = async (req, res) => {
  try {
    const idEmpresa = Number(req.body?.idEmpresa);
    if (!idEmpresa) {
      return res.status(400).json({ message: 'idEmpresa es obligatorio' });
    }

    const admin = await obtenerAdminEmpresa(idEmpresa);
    if (!admin?.email) {
      return res.status(400).json({
        message: 'No se encontró el administrador de la empresa',
        code: 'ADMIN_NOT_FOUND',
      });
    }

    const checkout = await crearCheckoutTrialPendiente(idEmpresa, {
      email: admin.email,
      nombre: admin.nombre,
    });

    return res.status(200).json({
      url: checkout.url,
      sessionId: checkout.sessionId,
      email: admin.email,
    });
  } catch (error) {
    console.error('Error al generar enlace de pago:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al generar el enlace de pago',
      code: error.code,
      campos_faltantes: error.campos_faltantes,
    });
  }
};

const purgaEmpresaPermanente = async (req, res) => {
  try {
    const idEmpresa = Number(req.body?.idEmpresa);
    const confirmacion = String(req.body?.confirmacion || '').trim().toUpperCase();
    const cifConfirmacion = String(req.body?.identificador_fiscal || '')
      .trim()
      .toUpperCase();

    if (!idEmpresa) {
      return res.status(400).json({ error: 'idEmpresa es obligatorio' });
    }

    if (confirmacion !== 'ELIMINAR') {
      return res.status(400).json({
        error: 'Debes enviar confirmacion: "ELIMINAR" para borrar permanentemente',
      });
    }

    const empresa = await Empresa.findByPk(idEmpresa);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const cifEmpresa = String(empresa.identificador_fiscal || '').trim().toUpperCase();
    if (!cifConfirmacion || cifConfirmacion !== cifEmpresa) {
      return res.status(400).json({
        error: 'El identificador fiscal no coincide con la empresa a eliminar',
      });
    }

    const resultado = await purgarEmpresaCompleta(idEmpresa);
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error en purga permanente de empresa:', error);
    return res.status(error.status || 500).json({
      error: error.message || 'Error al eliminar la empresa permanentemente',
    });
  }
};

const extenderPeriodoPrueba = async (req, res) => {
  try {
    const { idEmpresa, trialEndsAt } = req.body;

    if (!idEmpresa || !trialEndsAt) {
      return res.status(400).json({ message: 'Faltan datos para ampliar la prueba' });
    }

    const resultado = await extenderPeriodoPruebaEmpresa(idEmpresa, trialEndsAt);

    return res.status(200).json({
      message: 'Periodo de prueba ampliado correctamente',
      ...resultado,
    });
  } catch (error) {
    if (error instanceof TrialExtensionError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error('Error al ampliar periodo de prueba:', error);
    return res.status(500).json({ message: 'No se pudo ampliar el periodo de prueba' });
  }
};

module.exports = {
  registerCompany,
  registerCompanyPublic,
  getTipoRegistro,
  updateTipoRegistro,
  updateTipoRegistroVivo,
  deleteRegistroVivo,
  getEmpresas,
  editEmpresa,
  eliminarEmpresa,
  reactivarEmpresa,
  getEmpresasUsuarios,
  getMiEmpresa,
  editMiEmpresa,
  getEmpresaBranding,
  purgaEmpresaPermanente,
  generarEnlacePagoEmpresa,
  extenderPeriodoPrueba,
};
