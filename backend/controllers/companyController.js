const { sequelize } = require('../config/db');
const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const ConfiguracionEsquemaModel = require('../models/ConfiguracionEsquemaModel');
const { getNextGlobalId } = require('../utils/empresaScope');

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

        // El administrador se crea sin contraseña (requiere_reset_password = true):
        // deberá establecerla con el flujo "He olvidado mi contraseña".
        res.status(201).json({ message: 'Empresa registrada con éxito'  });
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
                `select e.id_empresa,e.nombre,e.identificador_fiscal,e.fecha_alta,e.licencias,e.activo,e.alias, u.email from m_empresas e
                inner join m_usuarios_empresas ue on ue.id_empresa = e.id_empresa
                inner join m_usuarios u on u.id_usuario = ue.id_usuario and u.tipo_usuario = 3
                where e.fecha_baja is null order by e.fecha_alta desc;`,
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

      const {idEmpresa,idUsuario} = req.body;
      const fecha = new Date();

        var empresas = await Empresa.update(
          {
              fecha_modificacion:fecha,
              usuario_modificacion : idUsuario,
              usuario_baja: idUsuario,
              fecha_baja:fecha
          },
          {
              where: {
              id_empresa: idEmpresa,
            }
          });
          if(!res){
            return empresas;
          }else{
            res.status(200).json({ message: 'Baja empresa correctamente',empresas });
          }

    } catch (error) {
        console.error('Error Baja empresa:', error);
        res.status(500).json({ error: 'Error Baja empresa' });
    }

  };

module.exports = { registerCompany,getTipoRegistro, updateTipoRegistro,updateTipoRegistroVivo, deleteRegistroVivo,getEmpresas,editEmpresa ,eliminarEmpresa,getEmpresasUsuarios};
