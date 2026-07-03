const { assertEmpresaTieneFeature } = require('../services/planService');
const {
  obtenerResumenRetribucion,
  guardarRetribucion,
} = require('../services/retribucionService');
const {
  listarDocumentos,
  obtenerDocumento,
  subirDocumento,
  eliminarDocumento,
  leerContenidoDocumento,
  marcarDocumentoVisto,
  usuarioPuedeAccederDocumento,
} = require('../services/documentosNominaService');
const {
  generarPrenomina,
  listarPrenominas,
  obtenerDetallePrenomina,
  cerrarPrenomina,
} = require('../services/prenominaService');
const {
  nominasSoportaRetribucion,
  nominasSoportaDocumentos,
  nominasSoportaPrenomina,
} = require('../utils/nominasCompat');
const { usuarioTieneAccesoEmpresa } = require('../services/usuarioEmpresaService');
const { ROLES } = require('../middleware/authMiddleware');

const asegurarFeatureNominas = async (idEmpresa) => {
  await assertEmpresaTieneFeature(idEmpresa, 'nominas');
};

const asegurarUsuarioEnEmpresa = async (idEmpresa, idUsuario) => {
  const pertenece = await usuarioTieneAccesoEmpresa(idUsuario, idEmpresa);
  if (!pertenece) {
    const error = new Error('El usuario no pertenece a esta empresa');
    error.code = 'USUARIO_NO_EMPRESA';
    throw error;
  }
};

const mapError = (res, error, fallback) => {
  if (error.code === 'PLAN_FEATURE_REQUIRED') {
    return res.status(403).json({
      message: error.message,
      code: error.code,
      feature: error.feature,
      plan: error.plan,
    });
  }
  if (error.code === 'USUARIO_NO_EMPRESA') {
    return res.status(404).json({ message: error.message, code: error.code });
  }
  if (['SALARIO_INVALIDO', 'FECHA_INVALIDA', 'FECHA_ANTERIOR_VIGENTE', 'PAGAS_INVALIDAS', 'MODULO_ANUAL_NO_DISPONIBLE'].includes(error.code)) {
    return res.status(400).json({ message: error.message, code: error.code });
  }
  if ([
    'PERIODO_INVALIDO',
    'ARCHIVO_REQUERIDO',
    'ARCHIVO_NO_PDF',
    'ARCHIVO_DEMASIADO_GRANDE',
    'DOCUMENTO_NO_ENCONTRADO',
    'ARCHIVO_NO_ENCONTRADO',
    'ACCESO_DENEGADO',
    'PRENOMINA_CERRADA',
    'PRENOMINA_NO_ENCONTRADA',
    'MODULO_NO_DISPONIBLE',
  ].includes(error.code)) {
    return res.status(400).json({ message: error.message, code: error.code });
  }
  console.error(fallback, error);
  return res.status(500).json({ message: fallback, error: error.message });
};

const getRetribucion = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idUsuario = Number(req.body?.idUsuario);
  const idSesion = Number(req.user?.id_usuario);
  const tipoUsuario = Number(req.user?.tipo_usuario);

  if (!idEmpresa || !idUsuario) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  if (tipoUsuario === ROLES.EMPLEADO && idUsuario !== idSesion) {
    return res.status(403).json({ message: 'No autorizado para consultar esta retribución' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);
    await asegurarUsuarioEnEmpresa(idEmpresa, idUsuario);

    const soporta = await nominasSoportaRetribucion();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de retribución no está disponible en el servidor',
        soportado: false,
      });
    }

    const resumen = await obtenerResumenRetribucion(idEmpresa, idUsuario);
    return res.status(200).json(resumen);
  } catch (error) {
    return mapError(res, error, 'Error al obtener la retribución');
  }
};

const guardarRetribucionUsuario = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idUsuario = Number(req.body?.idUsuario);
  const idUsuarioAccion = req.user?.id_usuario;

  if (!idEmpresa || !idUsuario) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);
    await asegurarUsuarioEnEmpresa(idEmpresa, idUsuario);

    const soporta = await nominasSoportaRetribucion();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de retribución no está disponible en el servidor',
      });
    }

    const retribucion = await guardarRetribucion(
      idEmpresa,
      idUsuario,
      req.body,
      idUsuarioAccion,
    );

    const resumen = await obtenerResumenRetribucion(idEmpresa, idUsuario);
    return res.status(200).json({
      message: 'Retribución guardada',
      retribucion,
      ...resumen,
    });
  } catch (error) {
    return mapError(res, error, 'Error al guardar la retribución');
  }
};

const listarNominas = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idUsuario = req.body?.idUsuario != null ? Number(req.body.idUsuario) : null;
  const periodoMes = req.body?.periodoMes != null ? Number(req.body.periodoMes) : null;
  const periodoAnio = req.body?.periodoAnio != null ? Number(req.body.periodoAnio) : null;

  if (!idEmpresa) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);

    const soporta = await nominasSoportaDocumentos();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de nóminas no está disponible en el servidor',
        soportado: false,
      });
    }

    if (idUsuario) {
      await asegurarUsuarioEnEmpresa(idEmpresa, idUsuario);
    }

    const resultado = await listarDocumentos(idEmpresa, {
      idUsuario,
      periodoMes,
      periodoAnio,
    });

    return res.status(200).json(resultado);
  } catch (error) {
    return mapError(res, error, 'Error al listar las nóminas');
  }
};

const misNominas = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idUsuario = Number(req.user?.id_usuario);

  if (!idEmpresa || !idUsuario) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);

    const soporta = await nominasSoportaDocumentos();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de nóminas no está disponible en el servidor',
        soportado: false,
      });
    }

    const resultado = await listarDocumentos(idEmpresa, { idUsuario });
    return res.status(200).json(resultado);
  } catch (error) {
    return mapError(res, error, 'Error al cargar tus nóminas');
  }
};

const subirNomina = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idUsuario = Number(req.body?.idUsuario);
  const periodoMes = Number(req.body?.periodoMes);
  const periodoAnio = Number(req.body?.periodoAnio);
  const idUsuarioAccion = req.user?.id_usuario;

  if (!idEmpresa || !idUsuario || !periodoMes || !periodoAnio) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);
    await asegurarUsuarioEnEmpresa(idEmpresa, idUsuario);

    const documento = await subirDocumento(
      idEmpresa,
      idUsuario,
      periodoMes,
      periodoAnio,
      req.file,
      idUsuarioAccion,
      {
        importe_bruto: req.body?.importe_bruto,
        importe_deducciones: req.body?.importe_deducciones,
        importe_liquido: req.body?.importe_liquido,
      },
    );

    return res.status(200).json({
      message: 'Nómina subida correctamente',
      documento,
    });
  } catch (error) {
    if (error.code === 'MODULO_NO_DISPONIBLE') {
      return res.status(503).json({ message: error.message });
    }
    return mapError(res, error, 'Error al subir la nómina');
  }
};

const descargarNomina = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idDocumento = Number(req.body?.idDocumento);
  const idUsuario = Number(req.user?.id_usuario);
  const tipoUsuario = Number(req.user?.tipo_usuario);

  if (!idEmpresa || !idDocumento) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);

    const doc = await obtenerDocumento(idEmpresa, idDocumento);
    if (!doc) {
      return res.status(404).json({ message: 'Documento de nómina no encontrado' });
    }

    if (!usuarioPuedeAccederDocumento(req.user, doc)) {
      return res.status(403).json({ message: 'No tienes permiso para descargar esta nómina' });
    }

    const buffer = await leerContenidoDocumento(doc);

    if (tipoUsuario === ROLES.EMPLEADO) {
      await marcarDocumentoVisto(idEmpresa, idDocumento, idUsuario);
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.nombre_archivo || 'nomina.pdf')}"`,
    );
    return res.send(buffer);
  } catch (error) {
    return mapError(res, error, 'Error al descargar la nómina');
  }
};

const eliminarNomina = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idDocumento = Number(req.body?.idDocumento);
  const idUsuarioAccion = req.user?.id_usuario;

  if (!idEmpresa || !idDocumento) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);

    const documento = await eliminarDocumento(idEmpresa, idDocumento, idUsuarioAccion);
    return res.status(200).json({
      message: 'Nómina eliminada',
      documento,
    });
  } catch (error) {
    return mapError(res, error, 'Error al eliminar la nómina');
  }
};

const generarPrenominaMes = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const periodoMes = Number(req.body?.periodoMes);
  const periodoAnio = Number(req.body?.periodoAnio);
  const idUsuarioAccion = req.user?.id_usuario;

  if (!idEmpresa || !periodoMes || !periodoAnio) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);

    const soporta = await nominasSoportaPrenomina();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de prenómina no está disponible en el servidor',
        soportado: false,
      });
    }

    const resultado = await generarPrenomina(
      idEmpresa,
      periodoMes,
      periodoAnio,
      idUsuarioAccion,
    );

    return res.status(200).json({
      message: 'Prenómina generada',
      ...resultado,
    });
  } catch (error) {
    return mapError(res, error, 'Error al generar la prenómina');
  }
};

const listarPrenominasEmpresa = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);

  if (!idEmpresa) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);

    const soporta = await nominasSoportaPrenomina();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de prenómina no está disponible en el servidor',
        soportado: false,
      });
    }

    const resultado = await listarPrenominas(idEmpresa);
    return res.status(200).json(resultado);
  } catch (error) {
    return mapError(res, error, 'Error al listar las prenóminas');
  }
};

const detallePrenomina = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idPrenomina = Number(req.body?.idPrenomina);

  if (!idEmpresa || !idPrenomina) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);

    const soporta = await nominasSoportaPrenomina();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de prenómina no está disponible en el servidor',
        soportado: false,
      });
    }

    const resultado = await obtenerDetallePrenomina(idEmpresa, idPrenomina);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.code === 'PRENOMINA_NO_ENCONTRADA') {
      return res.status(404).json({ message: error.message, code: error.code });
    }
    return mapError(res, error, 'Error al obtener el detalle de la prenómina');
  }
};

const cerrarPrenominaMes = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idPrenomina = Number(req.body?.idPrenomina);
  const idUsuarioAccion = req.user?.id_usuario;

  if (!idEmpresa || !idPrenomina) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureNominas(idEmpresa);

    const soporta = await nominasSoportaPrenomina();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de prenómina no está disponible en el servidor',
        soportado: false,
      });
    }

    const resultado = await cerrarPrenomina(idEmpresa, idPrenomina, idUsuarioAccion);
    return res.status(200).json({
      message: 'Prenómina cerrada',
      ...resultado,
    });
  } catch (error) {
    return mapError(res, error, 'Error al cerrar la prenómina');
  }
};

module.exports = {
  getRetribucion,
  guardarRetribucionUsuario,
  listarNominas,
  misNominas,
  subirNomina,
  descargarNomina,
  eliminarNomina,
  generarPrenominaMes,
  listarPrenominasEmpresa,
  detallePrenomina,
  cerrarPrenominaMes,
};
