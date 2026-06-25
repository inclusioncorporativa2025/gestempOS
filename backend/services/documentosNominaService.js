const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const DocumentoNomina = require('../models/DocumentoNomina');
const { createConId } = require('../utils/empresaScope');
const { nominasSoportaDocumentos } = require('../utils/nominasCompat');
const {
  buildRelativePath,
  guardarPdfNomina,
  leerPdfNomina,
  eliminarPdfNomina,
  hashBuffer,
} = require('./nominaStorageService');

const MAX_BYTES = 5 * 1024 * 1024;

const activoWhere = (idEmpresa, extras = {}) => ({
  empresa_id: idEmpresa,
  fecha_baja: null,
  ...extras,
});

const mapDocumento = (row) => {
  if (!row) return null;
  const data = row.toJSON ? row.toJSON() : row;
  return {
    ...data,
    periodo_mes: Number(data.periodo_mes),
    periodo_anio: Number(data.periodo_anio),
    tamano_bytes: data.tamano_bytes != null ? Number(data.tamano_bytes) : null,
  };
};

const normalizarPeriodo = (mes, anio) => {
  const periodoMes = Number(mes);
  const periodoAnio = Number(anio);
  if (!Number.isInteger(periodoMes) || periodoMes < 1 || periodoMes > 12) {
    const error = new Error('El mes del periodo no es válido');
    error.code = 'PERIODO_INVALIDO';
    throw error;
  }
  if (!Number.isInteger(periodoAnio) || periodoAnio < 2000 || periodoAnio > 2100) {
    const error = new Error('El año del periodo no es válido');
    error.code = 'PERIODO_INVALIDO';
    throw error;
  }
  return { periodoMes, periodoAnio };
};

const validarArchivoPdf = (file) => {
  if (!file || !file.buffer?.length) {
    const error = new Error('No se recibió ningún archivo PDF');
    error.code = 'ARCHIVO_REQUERIDO';
    throw error;
  }
  if (file.size > MAX_BYTES) {
    const error = new Error('El PDF supera el tamaño máximo permitido (5 MB)');
    error.code = 'ARCHIVO_DEMASIADO_GRANDE';
    throw error;
  }
  const nombre = String(file.originalname || '').toLowerCase();
  const esPdf = file.mimetype === 'application/pdf' || nombre.endsWith('.pdf');
  if (!esPdf) {
    const error = new Error('Solo se permiten archivos PDF');
    error.code = 'ARCHIVO_NO_PDF';
    throw error;
  }
};

const listarDocumentos = async (idEmpresa, filtros = {}) => {
  const soportado = await nominasSoportaDocumentos();
  if (!soportado) return { soportado: false, documentos: [] };

  const where = activoWhere(idEmpresa);
  if (filtros.idUsuario) where.id_usuario = Number(filtros.idUsuario);
  if (filtros.periodoMes) where.periodo_mes = Number(filtros.periodoMes);
  if (filtros.periodoAnio) where.periodo_anio = Number(filtros.periodoAnio);

  const rows = await DocumentoNomina.findAll({
    where,
    order: [
      ['periodo_anio', 'DESC'],
      ['periodo_mes', 'DESC'],
      ['fecha_publicacion', 'DESC'],
    ],
  });

  return {
    soportado: true,
    documentos: rows.map(mapDocumento),
  };
};

const obtenerDocumento = async (idEmpresa, idDocumento) => {
  const row = await DocumentoNomina.findOne({
    where: activoWhere(idEmpresa, { id_documento: Number(idDocumento) }),
  });
  return mapDocumento(row);
};

const subirDocumento = async (
  idEmpresa,
  idUsuario,
  periodoMes,
  periodoAnio,
  file,
  idUsuarioAccion,
) => {
  const soportado = await nominasSoportaDocumentos();
  if (!soportado) {
    const error = new Error('El módulo de nóminas no está disponible en el servidor');
    error.code = 'MODULO_NO_DISPONIBLE';
    throw error;
  }

  validarArchivoPdf(file);
  const { periodoMes: mes, periodoAnio: anio } = normalizarPeriodo(periodoMes, periodoAnio);
  const ahora = new Date();
  const nombreArchivo = String(file.originalname || 'nomina.pdf').slice(0, 255);
  const hash = hashBuffer(file.buffer);

  return sequelize.transaction(async (transaction) => {
    const existente = await DocumentoNomina.findOne({
      where: activoWhere(idEmpresa, {
        id_usuario: idUsuario,
        periodo_mes: mes,
        periodo_anio: anio,
      }),
      transaction,
      lock: true,
    });

    if (existente) {
      await existente.update({
        fecha_baja: ahora,
        usuario_baja: idUsuarioAccion,
      }, { transaction });
      await eliminarPdfNomina(existente.ruta_archivo);
    }

    const creado = await createConId(
      DocumentoNomina,
      idEmpresa,
      'id_documento',
      {
        id_usuario: idUsuario,
        periodo_mes: mes,
        periodo_anio: anio,
        nombre_archivo: nombreArchivo,
        ruta_archivo: '',
        mime_type: 'application/pdf',
        tamano_bytes: file.size,
        hash_sha256: hash,
        fecha_publicacion: ahora,
        visto_en: null,
        usuario_alta: idUsuarioAccion,
        fecha_alta: ahora,
      },
      transaction,
    );

    const rutaRelativa = buildRelativePath(
      idEmpresa,
      anio,
      mes,
      idUsuario,
      creado.id_documento,
    );

    await guardarPdfNomina(file.buffer, rutaRelativa);

    await creado.update({ ruta_archivo: rutaRelativa }, { transaction });

    return mapDocumento(creado);
  });
};

const eliminarDocumento = async (idEmpresa, idDocumento, idUsuarioAccion) => {
  const doc = await DocumentoNomina.findOne({
    where: activoWhere(idEmpresa, { id_documento: Number(idDocumento) }),
  });

  if (!doc) {
    const error = new Error('Documento de nómina no encontrado');
    error.code = 'DOCUMENTO_NO_ENCONTRADO';
    throw error;
  }

  const ahora = new Date();
  await doc.update({
    fecha_baja: ahora,
    usuario_baja: idUsuarioAccion,
  });

  await eliminarPdfNomina(doc.ruta_archivo);
  return mapDocumento(doc);
};

const leerContenidoDocumento = async (doc) => {
  if (!doc?.ruta_archivo) {
    const error = new Error('El documento no tiene archivo asociado');
    error.code = 'ARCHIVO_NO_ENCONTRADO';
    throw error;
  }
  return leerPdfNomina(doc.ruta_archivo);
};

const marcarDocumentoVisto = async (idEmpresa, idDocumento, idUsuario) => {
  const doc = await DocumentoNomina.findOne({
    where: activoWhere(idEmpresa, {
      id_documento: Number(idDocumento),
      id_usuario: idUsuario,
    }),
  });

  if (!doc) {
    const error = new Error('Documento de nómina no encontrado');
    error.code = 'DOCUMENTO_NO_ENCONTRADO';
    throw error;
  }

  if (!doc.visto_en) {
    await doc.update({ visto_en: new Date() });
  }

  return mapDocumento(doc);
};

const usuarioPuedeAccederDocumento = (usuario, doc) => {
  if (!usuario || !doc) return false;
  const tipo = Number(usuario.tipo_usuario);
  if ([1, 2, 3, 4].includes(tipo)) return true;
  if (tipo === 5) return Number(usuario.id_usuario) === Number(doc.id_usuario);
  return false;
};

module.exports = {
  listarDocumentos,
  obtenerDocumento,
  subirDocumento,
  eliminarDocumento,
  leerContenidoDocumento,
  marcarDocumentoVisto,
  usuarioPuedeAccederDocumento,
};
