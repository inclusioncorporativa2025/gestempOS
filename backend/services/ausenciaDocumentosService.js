const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const AusenciaDocumento = require('../models/AusenciaDocumento');
const Ausencias = require('../models/Ausencias');
const { createConId } = require('../utils/empresaScope');
const { ROLE_GROUPS } = require('../middleware/authMiddleware');
const { ausenciasSoportaDocumentos } = require('../utils/ausenciasDocumentosCompat');
const { requiereJustificanteParaAprobar } = require('../utils/tiposAusencia');
const {
  buildRelativePath,
  guardarArchivo,
  leerArchivo,
  eliminarArchivo,
  hashBuffer,
} = require('./ausenciaDocumentosStorageService');

const MAX_BYTES = 5 * 1024 * 1024;

const MIME_PERMITIDOS = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

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
    tamano_bytes: data.tamano_bytes != null ? Number(data.tamano_bytes) : null,
  };
};

const validarArchivo = (file) => {
  if (!file || !file.buffer?.length) {
    const error = new Error('No se recibió ningún archivo');
    error.code = 'ARCHIVO_REQUERIDO';
    throw error;
  }
  if (file.size > MAX_BYTES) {
    const error = new Error('El archivo supera el tamaño máximo permitido (5 MB)');
    error.code = 'ARCHIVO_DEMASIADO_GRANDE';
    throw error;
  }
  const nombre = String(file.originalname || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();
  const extensionValida = /\.(pdf|jpe?g|png|webp)$/.test(nombre);
  if (!MIME_PERMITIDOS.has(mime) && !extensionValida) {
    const error = new Error('Solo se permiten PDF o imágenes (JPG, PNG, WEBP)');
    error.code = 'ARCHIVO_NO_PERMITIDO';
    throw error;
  }
};

const inferirMime = (file) => {
  const mime = String(file.mimetype || '').toLowerCase();
  if (MIME_PERMITIDOS.has(mime)) return mime;
  const nombre = String(file.originalname || '').toLowerCase();
  if (nombre.endsWith('.pdf')) return 'application/pdf';
  if (nombre.endsWith('.png')) return 'image/png';
  if (nombre.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const contarDocumentosActivos = async (idEmpresa, idAusencia) => {
  const soportado = await ausenciasSoportaDocumentos();
  if (!soportado) return 0;
  return AusenciaDocumento.count({
    where: activoWhere(idEmpresa, { id_ausencia: idAusencia }),
  });
};

const contarDocumentosActivosPorAusencias = async (idEmpresa, idsAusencia) => {
  const soportado = await ausenciasSoportaDocumentos();
  if (!soportado || !idsAusencia?.length) return {};

  const filas = await AusenciaDocumento.findAll({
    attributes: [
      'id_ausencia',
      [sequelize.fn('COUNT', sequelize.col('id_documento')), 'total'],
    ],
    where: activoWhere(idEmpresa, {
      id_ausencia: { [Op.in]: idsAusencia },
    }),
    group: ['id_ausencia'],
    raw: true,
  });

  return Object.fromEntries(
    filas.map((fila) => [Number(fila.id_ausencia), Number(fila.total) || 0]),
  );
};

const adjuntarInfoJustificantes = async (idEmpresa, ausencias) => {
  const filas = ausencias.map((a) => (a.toJSON ? a.toJSON() : a));
  const soportado = await ausenciasSoportaDocumentos();
  const ids = filas.map((a) => a.id_ausencia);
  const conteos = soportado
    ? await contarDocumentosActivosPorAusencias(idEmpresa, ids)
    : {};

  return filas.map((a) => {
    const num = conteos[a.id_ausencia] || 0;
    const requiere = requiereJustificanteParaAprobar(a.tipo);
    return {
      ...a,
      requiere_justificante: requiere,
      num_justificantes: num,
      tiene_justificante: num > 0,
    };
  });
};

const obtenerAusenciaActiva = async (idEmpresa, idAusencia) => {
  const ausencia = await Ausencias.findOne({
    where: {
      empresa_id: idEmpresa,
      id_ausencia: idAusencia,
      fecha_baja: null,
    },
  });
  if (!ausencia) {
    const error = new Error('Solicitud de ausencia no encontrada');
    error.code = 'AUSENCIA_NO_ENCONTRADA';
    throw error;
  }
  return ausencia.toJSON ? ausencia.toJSON() : ausencia;
};

const usuarioPuedeGestionarAusencia = (tipoUsuario, idUsuarioToken, ausencia) => {
  const tipo = Number(tipoUsuario);
  if (ROLE_GROUPS.COMPANY_STAFF.includes(tipo)) return true;
  return Number(idUsuarioToken) === Number(ausencia.id_usuario);
};

const assertPuedeAprobarConJustificante = async (ausencia) => {
  if (!requiereJustificanteParaAprobar(ausencia.tipo)) return;
  const num = await contarDocumentosActivos(ausencia.empresa_id, ausencia.id_ausencia);
  if (num === 0) {
    const error = new Error('No se puede aprobar sin justificante adjunto');
    error.code = 'JUSTIFICANTE_REQUERIDO';
    throw error;
  }
};

const listarDocumentosAusencia = async (idEmpresa, idAusencia) => {
  const soportado = await ausenciasSoportaDocumentos();
  if (!soportado) return [];

  const rows = await AusenciaDocumento.findAll({
    where: activoWhere(idEmpresa, { id_ausencia: idAusencia }),
    order: [['fecha_alta', 'DESC']],
  });
  return rows.map(mapDocumento);
};

const subirDocumentoAusencia = async (
  idEmpresa,
  idAusencia,
  file,
  idUsuarioAccion,
  tipoJustificante = null,
) => {
  const soportado = await ausenciasSoportaDocumentos();
  if (!soportado) {
    const error = new Error('El módulo de justificantes no está disponible en el servidor');
    error.code = 'MODULO_NO_DISPONIBLE';
    throw error;
  }

  validarArchivo(file);
  const ausencia = await obtenerAusenciaActiva(idEmpresa, idAusencia);

  if (ausencia.fecha_aceptacion || ausencia.fecha_cancelacion) {
    const error = new Error('La solicitud ya fue resuelta');
    error.code = 'AUSENCIA_RESUELTA';
    throw error;
  }

  const mimeType = inferirMime(file);
  const nombreArchivo = String(file.originalname || 'justificante').slice(0, 255);
  const hash = hashBuffer(file.buffer);
  const ahora = new Date();

  return sequelize.transaction(async (transaction) => {
    const creado = await createConId(
      AusenciaDocumento,
      idEmpresa,
      'id_documento',
      {
        id_ausencia: idAusencia,
        id_usuario: ausencia.id_usuario,
        nombre_archivo: nombreArchivo,
        ruta_archivo: '',
        mime_type: mimeType,
        tamano_bytes: file.size,
        hash_sha256: hash,
        tipo_justificante: tipoJustificante ? String(tipoJustificante).trim().slice(0, 50) : null,
        usuario_alta: idUsuarioAccion,
        fecha_alta: ahora,
      },
      transaction,
    );

    const rutaRelativa = buildRelativePath(
      idEmpresa,
      ausencia.id_usuario,
      idAusencia,
      creado.id_documento,
      mimeType,
    );

    await guardarArchivo(file.buffer, rutaRelativa);
    await creado.update({ ruta_archivo: rutaRelativa }, { transaction });

    return mapDocumento(creado);
  });
};

const obtenerDocumento = async (idEmpresa, idDocumento) => {
  const doc = await AusenciaDocumento.findOne({
    where: activoWhere(idEmpresa, { id_documento: Number(idDocumento) }),
  });
  if (!doc) {
    const error = new Error('Justificante no encontrado');
    error.code = 'DOCUMENTO_NO_ENCONTRADO';
    throw error;
  }
  return mapDocumento(doc);
};

const leerContenidoDocumento = async (doc) => {
  if (!doc?.ruta_archivo) {
    const error = new Error('El archivo no está disponible');
    error.code = 'ARCHIVO_NO_ENCONTRADO';
    throw error;
  }
  return leerArchivo(doc.ruta_archivo);
};

const eliminarDocumentoAusencia = async (idEmpresa, idDocumento, idUsuarioAccion) => {
  const doc = await obtenerDocumento(idEmpresa, idDocumento);
  const ahora = new Date();

  await AusenciaDocumento.update(
    { fecha_baja: ahora, usuario_baja: idUsuarioAccion },
    { where: { empresa_id: idEmpresa, id_documento: doc.id_documento } },
  );
  await eliminarArchivo(doc.ruta_archivo);
  return doc;
};

module.exports = {
  contarDocumentosActivos,
  contarDocumentosActivosPorAusencias,
  adjuntarInfoJustificantes,
  obtenerAusenciaActiva,
  usuarioPuedeGestionarAusencia,
  assertPuedeAprobarConJustificante,
  listarDocumentosAusencia,
  subirDocumentoAusencia,
  obtenerDocumento,
  leerContenidoDocumento,
  eliminarDocumentoAusencia,
};
