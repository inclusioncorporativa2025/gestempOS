const { sequelize } = require('../config/db');
const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const ConfiguracionEsquemaModel = require('../models/ConfiguracionEsquemaModel');
const { getNextGlobalId } = require('../utils/empresaScope');
const { enviarBienvenidaEmpresa } = require('../utils/mailService');

const registerCompany = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { Administrador, CIF, email, nombre_empresa, dni, numLicencias, alias } = req.body.values;
        const idUsuarioAccion = req.body.idUsuario;
        const schemaName = `empresa_${nombre_empresa.toLowerCase().replace(/\s+/g, '_')}`;
        const fecha = new Date();

        const idEmpresa = await getNextGlobalId(Empresa, 'id_empresa', transaction);
        const empresa = await Empresa.create({
            id_empresa: idEmpresa,
            nombre: nombre_empresa,
            identificador_fiscal: CIF,
            fecha_alta: fecha,
            usuario_alta: idUsuarioAccion,
            licencias: numLicencias,
            alias : alias
        }, { transaction });

        const idConfig = await getNextGlobalId(ConfiguracionEsquemaModel, 'id_configuracion_esquema', transaction);
        await ConfiguracionEsquemaModel.create({
            id_configuracion_esquema: idConfig,
            nombre_esquema: schemaName,
            id_empresa: empresa.id_empresa,
            fecha_alta: fecha,
            usuario_alta: idUsuarioAccion,
        }, { transaction });

        const idUsuarioNuevo = await getNextGlobalId(Usuario, 'id_usuario', transaction);
        const usuarioAdmin = await Usuario.create({
            id_usuario: idUsuarioNuevo,
            nombre: Administrador,
            email: email,
            fecha_alta: fecha,
            usuario_alta : idUsuarioAccion,
            tipo_usuario : 3,
            dni: dni,
            activo: true,
            requiere_reset_password: true,
        }, { transaction });

        const idUsuarioEmpresa = await getNextGlobalId(UsuarioEmpresa, 'id_usuario_empresa', transaction);
        await UsuarioEmpresa.create({
            id_usuario_empresa: idUsuarioEmpresa,
            id_usuario: usuarioAdmin.id_usuario,
            id_empresa: empresa.id_empresa,
            fecha_alta: fecha,
            usuario_alta : idUsuarioAccion,
        }, { transaction });

        await transaction.commit();

        let emailBienvenidaEnviado = true;
        let devWelcomeUrl = null;

        try {
          devWelcomeUrl = await enviarBienvenidaEmpresa(usuarioAdmin, {
            nombreEmpresa: nombre_empresa,
            licencias: numLicencias,
            alias,
            identificadorFiscal: CIF,
          });
        } catch (mailError) {
          emailBienvenidaEnviado = false;
          console.error('Empresa creada pero falló el email de bienvenida:', mailError.message);
        }

        const respuesta = {
          message: emailBienvenidaEnviado
            ? 'Empresa registrada con éxito. Se ha enviado un correo de bienvenida al administrador.'
            : 'Empresa registrada con éxito, pero no se pudo enviar el correo de bienvenida. Use "Olvidé mi contraseña" con el email del administrador.',
          emailBienvenidaEnviado,
        };

        if (process.env.NODE_ENV !== 'production' && devWelcomeUrl) {
          respuesta.devWelcomeUrl = devWelcomeUrl;
        }

        res.status(201).json(respuesta);
    } catch (error) {

        await transaction.rollback();
        console.error(`Error proceso creación empresa: ${error.message}`);
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
                        e.activo, e.alias, e.fecha_baja,
                        (
                          SELECT u.email
                          FROM m_usuarios_empresas ue
                          INNER JOIN m_usuarios u ON u.id_usuario = ue.id_usuario AND u.tipo_usuario = 3
                          WHERE ue.id_empresa = e.id_empresa
                          ORDER BY ue.fecha_baja IS NULL DESC, ue.fecha_alta DESC
                          LIMIT 1
                        ) AS email
                FROM m_empresas e
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

      var empresas = await Empresa.update(
        {
            identificador_fiscal: datos.identificador_fiscal,
            licencias: datos.licencias,
            nombre: datos.nombre,
            fecha_modificacion:fecha,
            usuario_modificacion : idUsuario,
            activo: datos.activo,
            alias: datos.alias
        },
        {
            where: {
            id_empresa: idEmpresa,
          }
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

module.exports = {
  registerCompany,
  getTipoRegistro,
  updateTipoRegistro,
  updateTipoRegistroVivo,
  deleteRegistroVivo,
  getEmpresas,
  editEmpresa,
  eliminarEmpresa,
  reactivarEmpresa,
  getEmpresasUsuarios,
};
