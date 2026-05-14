const { sequelize } = require('../config/db');
const initializeSchema = require('../config/scripts/initializeSchema');
const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const TipoAcceso = require('../models/TipoAcceso');
const generatePassword = require('../utils/generatePass')
const ConfiguracionEsquemaModel = require('../models/ConfiguracionEsquemaModel');
const authController = require('./authController')
const {crearUsuarioRepo} = require('../repositorios/usuarioRepository');

const registerCompany = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { Administrador, CIF, email, nombre_empresa, dni, numLicencias, alias } = req.body.values;
        const idUsuarioAccion = req.body.idUsuario;
        const schemaName = `empresa_${nombre_empresa.toLowerCase().replace(/\s+/g, '_')}`;
        const fecha = new Date();

        const empresa = await Empresa.create({
            nombre: nombre_empresa,
            identificador_fiscal: CIF,
            fecha_alta: fecha,
            usuario_alta: idUsuarioAccion,
            licencias: numLicencias,
            alias : alias
        }, { transaction });

        const configEsquema = await ConfiguracionEsquemaModel.create({
            nombre: schemaName,
            id_empresa: empresa.dataValues.id_empresa,
            fecha_alta: fecha,
            usuario_alta: idUsuarioAccion,
        }, { transaction });

        const usuarioAdmin = await Usuario.create({
            nombre: Administrador,
            email: email,
            fecha_alta: fecha,
            usuario_alta : idUsuarioAccion,
            tipo_usuario : 3,
            dni:dni
        }, { transaction });

        const usuarioEmpresa = await UsuarioEmpresa.create({
            id_usuario: usuarioAdmin.dataValues.id_usuario,
            id_empresa: empresa.dataValues.id_empresa,
            fecha_alta: fecha,
            usuario_alta : idUsuarioAccion,
        }, { transaction });
        const nombreUsuario =usuarioAdmin.dataValues.nombre;
        const nombreEmpresa =empresa.dataValues.nombre

        const password = generatePassword();
        const admin = true
        await authController.crearUsuarioFirebase(JSON.stringify({ email, password , nombreUsuario, admin }));

        (async () => {
          try {
            await initializeSchema(empresa.dataValues.id_empresa);
            console.log('Esquema configurado exitosamente.');
          } catch (err) {
            await transaction.rollback();
            console.error('Fallo al configurar el esquema:', err);
          }
        })();

        await transaction.commit();
        res.status(201).json({ message: 'Empresa registrada con éxito'  });
    } catch (error) {

        await transaction.rollback();
        console.error(`Error proceso creación empresa: ${error.message}`);
        res.status(500).json({ error: 'Error al registrar la empresa' });
    }
};

const getTipoRegistro = async (req, res)=> {

        try {
            const esquema  = req.body.esquema;

            var tiposAcceso = await TipoAcceso.schema(esquema).findAll({
                where: {
                  fecha_baja: null,
                },
                order: [
                    ['id_tipo_acceso', 'ASC']
                  ]
              });

              if(!res){
                return tiposAcceso;
              }else{
                res.status(200).json({ message: 'Datos recuperados correctamente',tiposAcceso });
              }

        } catch (error) {
            console.error('Error al obtener tipos de acceso:', error);
            res.status(500).json({ error: 'Error al obtener tipos de acceso' });
        }

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
                `select e.id_empresa,e.nombre,e.identificador_fiscal,e.fecha_alta,e.licencias,e.activo,e.alias, u.email from empresas e
                inner join usuarios_empresas ue on ue.id_empresa = e.id_empresa
                inner join usuarios u on u.id_usuario = ue.id_usuario and u.tipo_usuario = '3'
                where e.fecha_baja is null order by e.fecha_alta desc;`,
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

const updateTipoRegistro = async (req, res)=> {

    try {
        const {tiposNuevos,tiposModificados,tiposEliminados,esquema, idUsuario}  = req.body;

        if(tiposNuevos.length >0){
            bulkCreateEnEsquema(esquema, tiposNuevos, idUsuario);
        }

        if(tiposModificados.length >0){
        updateTipoRegistroVivo(tiposModificados,esquema,idUsuario);
        }

        if(tiposEliminados.length >0){
        deleteRegistroVivo(esquema,tiposEliminados, idUsuario);
        }

        console.log(tiposNuevos);

        res.status(200).json({ message: 'Datos recuperados correctamente',tiposNuevos });
    } catch (error) {
        console.error('Error al obtener tipos de acceso:', error);
        res.status(500).json({ error: 'Error al obtener tipos de acceso' });
    }

}

async function bulkCreateEnEsquema(esquema, datos, idUsuario) {
    try {

      const query = `
        INSERT INTO ${esquema}.tipo_acceso (nombre, fecha_alta,usuario_alta, activo, tipo)
        VALUES ?
      `;

      const date = new Date();

      const valores = datos.map(dato => [dato.nombre, date, idUsuario, dato.activo,dato.tipoAcceso]);

      await sequelize.query(query, {
        replacements: [valores],
        type: sequelize.QueryTypes.INSERT
      });

      console.log('Registros creados correctamente');
    } catch (error) {
      console.error('Error al crear Registros en el esquema:', error);
    }
  }

  async function updateTipoRegistroVivo(datos, esquema, idUsuario) {
    try {
        const date = new Date();

        for(let i = 0; i<datos.length; i++){
            const {key,nombre,activo,tipoAcceso} = datos[i];
            const query = `
        UPDATE ${esquema}.tipo_acceso set nombre = :nombre , activo = :activo , fecha_modificacion = :date , usuario_modificacion = :idUsuario, tipo = :tipoAcceso
        WHERE id_tipo_acceso = :key
      `;

        await sequelize.query(query, {
            replacements: {  nombre, activo, date,idUsuario,tipoAcceso,key },
            type: sequelize.QueryTypes.UPDATE
          });
        }

    } catch (error) {
      console.error('Error al actualizados Registros en el esquema:', error);
    }
  }

  async function deleteRegistroVivo(esquema, datos, idUsuario) {
    try {

        const date = new Date();

        for(let i = 0; i<datos.length; i++){
            const {id_tipo_acceso} = datos[i];

        const query = `
            UPDATE ${esquema}.tipo_acceso set fecha_baja = :date, usuario_baja = :idUsuario,  fecha_modificacion = :date , usuario_modificacion = :idUsuario
             WHERE id_tipo_acceso = :id_tipo_acceso
        `;

         await sequelize.query(query, {
            replacements: {date, idUsuario ,id_tipo_acceso },
            type: sequelize.QueryTypes.UPDATE
          });
        }

    } catch (error) {
      console.error('Error al crear Registros en el esquema:', error);
    }
  }

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
