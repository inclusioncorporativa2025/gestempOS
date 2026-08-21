const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { emitirJwtSesion, TIPOS_PLATAFORMA } = require('./usuarioEmpresaService');

const ROLES_ROOT = 1;

const PERMISOS_ROOT = [
  'ver_propias',
  'ver_equipo',
  'ver_todas',
  'ver_importes',
  'crear_invitacion',
  'asignar_comercial',
];

let crmTablasCache = null;

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

const generarTokenInvitacion = () => crypto.randomBytes(32).toString('hex');

const generarCodigoCorto = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TC-';
  for (let i = 0; i < 6; i += 1) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
};

const crmTablasDisponibles = async () => {
  if (crmTablasCache != null) return crmTablasCache;
  try {
    await sequelize.query('SELECT 1 FROM crm_puesto_interno LIMIT 1', {
      type: QueryTypes.SELECT,
    });
    crmTablasCache = true;
  } catch {
    crmTablasCache = false;
  }
  return crmTablasCache;
};

const obtenerClaimsHub = async (usuario) => {
  const tipo = Number(usuario?.tipo_usuario);
  const idUsuario = Number(usuario?.id_usuario);

  if (tipo === ROLES_ROOT) {
    return {
      hub_acceso: true,
      hub_puestos: ['root'],
      hub_permisos: PERMISOS_ROOT,
    };
  }

  if (!TIPOS_PLATAFORMA.includes(tipo) || !idUsuario) {
    return { hub_acceso: false, hub_puestos: [], hub_permisos: [] };
  }

  if (!(await crmTablasDisponibles())) {
    return { hub_acceso: false, hub_puestos: [], hub_permisos: [] };
  }

  try {
    const filas = await sequelize.query(
      `SELECT DISTINCT p.codigo AS puesto, ph.codigo AS permiso
       FROM crm_usuario_puesto_interno upi
       INNER JOIN crm_puesto_interno p
         ON p.id_puesto = upi.id_puesto AND p.activo = 1
       INNER JOIN crm_puesto_permiso_hub pph ON pph.id_puesto = p.id_puesto
       INNER JOIN crm_permiso_hub ph ON ph.id_permiso = pph.id_permiso
       WHERE upi.id_usuario = :idUsuario
         AND upi.fecha_baja IS NULL`,
      {
        replacements: { idUsuario },
        type: QueryTypes.SELECT,
      },
    );

    if (!filas.length) {
      return { hub_acceso: false, hub_puestos: [], hub_permisos: [] };
    }

    const puestos = [...new Set(filas.map((f) => f.puesto))];
    const permisos = [...new Set(filas.map((f) => f.permiso))];

    return {
      hub_acceso: true,
      hub_puestos: puestos,
      hub_permisos: permisos,
    };
  } catch (error) {
    console.error('[crmHub] Error cargando permisos hub:', error.message);
    return { hub_acceso: false, hub_puestos: [], hub_permisos: [] };
  }
};

const emitirJwtSesionConHub = async (usuario, empresa, membresia, extras = {}) => {
  const hubClaims = await obtenerClaimsHub(usuario);
  return emitirJwtSesion(usuario, empresa, membresia, { ...hubClaims, ...extras });
};

const usuarioTienePermisoHub = (user, ...codigos) => {
  if (Number(user?.tipo_usuario) === ROLES_ROOT) return true;
  const permisos = user?.hub_permisos || [];
  return codigos.some((codigo) => permisos.includes(codigo));
};

const resolverScopeVentas = (user) => {
  if (Number(user?.tipo_usuario) === ROLES_ROOT || usuarioTienePermisoHub(user, 'ver_todas')) {
    return { tipo: 'todas' };
  }
  if (usuarioTienePermisoHub(user, 'ver_equipo')) {
    return { tipo: 'equipo', idUsuario: Number(user.id_usuario) };
  }
  if (usuarioTienePermisoHub(user, 'ver_propias')) {
    return { tipo: 'propias', idUsuario: Number(user.id_usuario) };
  }
  return { tipo: 'ninguno' };
};

const listarVentas = async (user, { q, etapa, pagina = 1, limite = 50 } = {}) => {
  const scope = resolverScopeVentas(user);
  if (scope.tipo === 'ninguno') {
    return { ventas: [], total: 0 };
  }

  const offset = (Math.max(1, pagina) - 1) * limite;
  const replacements = {
    limite: Number(limite),
    offset: Number(offset),
  };

  let where = 'v.fecha_baja IS NULL AND e.fecha_baja IS NULL';

  if (scope.tipo === 'propias') {
    where += ' AND v.id_usuario_comercial = :idComercial';
    replacements.idComercial = scope.idUsuario;
  } else if (scope.tipo === 'equipo') {
    where += ` AND v.id_usuario_comercial IN (
      SELECT upi2.id_usuario
      FROM crm_usuario_puesto_interno upi2
      INNER JOIN crm_puesto_interno p2 ON p2.id_puesto = upi2.id_puesto
      WHERE upi2.fecha_baja IS NULL AND p2.codigo = 'comercial'
    )`;
  }

  if (etapa) {
    where += ' AND v.etapa = :etapa';
    replacements.etapa = etapa;
  }

  if (q) {
    where += ` AND (
      e.nombre LIKE :q OR e.alias LIKE :q OR e.email LIKE :q
      OR e.identificador_fiscal LIKE :q OR u.nombre LIKE :q OR u.email LIKE :q
    )`;
    replacements.q = `%${String(q).trim()}%`;
  }

  const incluirImportes = usuarioTienePermisoHub(user, 'ver_importes');

  const selectImportes = incluirImportes
    ? `, ef.modo_facturacion, ef.estado_suscripcion, ef.trial_ends_at,
       ef.licencias_facturadas, p.nombre AS plan_nombre`
    : '';

  const joinImportes = incluirImportes
    ? `LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
       LEFT JOIN planes p ON p.id_plan = ef.id_plan`
    : '';

  const ventas = await sequelize.query(
    `SELECT
       v.id_venta,
       v.id_empresa,
       v.canal,
       v.etapa,
       v.fecha_venta,
       v.notas,
       e.nombre AS empresa_nombre,
       e.alias AS empresa_alias,
       e.email AS empresa_email,
       e.telefono AS empresa_telefono,
       e.identificador_fiscal AS empresa_cif,
       e.fecha_alta AS empresa_fecha_alta,
       u.id_usuario AS comercial_id,
       u.nombre AS comercial_nombre,
       u.email AS comercial_email
       ${selectImportes}
     FROM crm_venta v
     INNER JOIN m_empresas e ON e.id_empresa = v.id_empresa
     INNER JOIN m_usuarios u ON u.id_usuario = v.id_usuario_comercial
     ${joinImportes}
     WHERE ${where}
     ORDER BY v.fecha_venta DESC
     LIMIT :limite OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );

  const [countRow] = await sequelize.query(
    `SELECT COUNT(*) AS total
     FROM crm_venta v
     INNER JOIN m_empresas e ON e.id_empresa = v.id_empresa
     INNER JOIN m_usuarios u ON u.id_usuario = v.id_usuario_comercial
     WHERE ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );

  return { ventas, total: Number(countRow?.total || 0) };
};

const listarComerciales = async () => {
  return sequelize.query(
    `SELECT DISTINCT u.id_usuario, u.nombre, u.email
     FROM crm_usuario_puesto_interno upi
     INNER JOIN crm_puesto_interno p ON p.id_puesto = upi.id_puesto
     INNER JOIN m_usuarios u ON u.id_usuario = upi.id_usuario
     WHERE upi.fecha_baja IS NULL
       AND p.codigo IN ('comercial', 'supervisor_comercial', 'admin_hub')
       AND u.fecha_baja IS NULL
     ORDER BY u.nombre ASC`,
    { type: QueryTypes.SELECT },
  );
};

const crearInvitacionRegistro = async ({
  idUsuarioComercial,
  emailPrevisto,
  telefonoPrevisto,
  canal = 'telefono',
  diasValidez = 30,
}) => {
  const token = generarTokenInvitacion();
  const tokenHash = hashToken(token);
  const codigoCorto = generarCodigoCorto();
  const fechaExpiracion = new Date();
  fechaExpiracion.setDate(fechaExpiracion.getDate() + diasValidez);

  const [, meta] = await sequelize.query(
    `INSERT INTO crm_invitacion_registro (
       token_hash, codigo_corto, id_usuario_comercial,
       email_previsto, telefono_previsto, canal, fecha_expiracion
     ) VALUES (
       :tokenHash, :codigoCorto, :idUsuarioComercial,
       :emailPrevisto, :telefonoPrevisto, :canal, :fechaExpiracion
     )`,
    {
      replacements: {
        tokenHash,
        codigoCorto,
        idUsuarioComercial,
        emailPrevisto: emailPrevisto || null,
        telefonoPrevisto: telefonoPrevisto || null,
        canal,
        fechaExpiracion,
      },
    },
  );

  const idInvitacion = meta?.insertId ?? null;

  return {
    id_invitacion: idInvitacion,
    token,
    codigo_corto: codigoCorto,
    fecha_expiracion: fechaExpiracion,
  };
};

const buscarInvitacionValida = async ({ token, codigoCorto }) => {
  const tokenHash = token ? hashToken(token) : null;
  const codigo = codigoCorto ? String(codigoCorto).trim().toUpperCase() : null;

  if (!tokenHash && !codigo) return null;

  const filas = await sequelize.query(
    `SELECT *
     FROM crm_invitacion_registro
     WHERE usado = 0
       AND (fecha_expiracion IS NULL OR fecha_expiracion > NOW())
       AND (
         (:tokenHash IS NOT NULL AND token_hash = :tokenHash)
         OR (:codigo IS NOT NULL AND codigo_corto = :codigo)
       )
     LIMIT 1`,
    {
      replacements: { tokenHash, codigo },
      type: QueryTypes.SELECT,
    },
  );

  return filas[0] || null;
};

const registrarVentaDesdeInvitacion = async ({
  idEmpresa,
  invitacion,
  usuarioAlta = null,
  transaction = null,
}) => {
  if (!invitacion) return null;

  const options = transaction ? { transaction } : {};

  const [, insertMeta] = await sequelize.query(
    `INSERT INTO crm_venta (
       id_empresa, id_usuario_comercial, id_invitacion_registro,
       canal, etapa, usuario_alta
     ) VALUES (
       :idEmpresa, :idComercial, :idInvitacion,
       :canal, 'registrada', :usuarioAlta
     )`,
    {
      replacements: {
        idEmpresa,
        idComercial: invitacion.id_usuario_comercial,
        idInvitacion: invitacion.id_invitacion,
        canal: invitacion.canal || 'telefono',
        usuarioAlta,
      },
      ...options,
    },
  );

  const idVenta = insertMeta?.insertId ?? null;

  await sequelize.query(
    `UPDATE crm_invitacion_registro
     SET usado = 1,
         id_empresa_uso = :idEmpresa,
         id_venta = :idVenta,
         fecha_uso = NOW()
     WHERE id_invitacion = :idInvitacion`,
    {
      replacements: {
        idEmpresa,
        idVenta,
        idInvitacion: invitacion.id_invitacion,
      },
      ...options,
    },
  );

  return idVenta;
};

const asignarVentaManual = async ({
  idEmpresa,
  idUsuarioComercial,
  canal = 'manual',
  notas = null,
  usuarioAlta,
}) => {
  const existente = await sequelize.query(
    `SELECT id_venta FROM crm_venta WHERE id_empresa = :idEmpresa AND fecha_baja IS NULL LIMIT 1`,
    {
      replacements: { idEmpresa },
      type: QueryTypes.SELECT,
    },
  );

  if (existente.length) {
    await sequelize.query(
      `UPDATE crm_venta
       SET id_usuario_comercial = :idComercial,
           canal = :canal,
           notas = COALESCE(:notas, notas),
           fecha_modificacion = NOW(),
           usuario_alta = :usuarioAlta
       WHERE id_venta = :idVenta`,
      {
        replacements: {
          idComercial: idUsuarioComercial,
          canal,
          notas,
          usuarioAlta,
          idVenta: existente[0].id_venta,
        },
      },
    );
    return existente[0].id_venta;
  }

  const [, meta] = await sequelize.query(
    `INSERT INTO crm_venta (
       id_empresa, id_usuario_comercial, canal, etapa, notas, usuario_alta
     ) VALUES (
       :idEmpresa, :idComercial, :canal, 'registrada', :notas, :usuarioAlta
     )`,
    {
      replacements: {
        idEmpresa,
        idComercial: idUsuarioComercial,
        canal,
        notas,
        usuarioAlta,
      },
    },
  );

  return meta?.insertId ?? null;
};

const obtenerInvitacionPreview = async ({ token, codigoCorto }) => {
  const invitacion = await buscarInvitacionValida({ token, codigoCorto });
  if (!invitacion) return null;

  const [comercial] = await sequelize.query(
    `SELECT nombre, email FROM m_usuarios WHERE id_usuario = :id LIMIT 1`,
    {
      replacements: { id: invitacion.id_usuario_comercial },
      type: QueryTypes.SELECT,
    },
  );

  return {
    email_previsto: invitacion.email_previsto,
    telefono_previsto: invitacion.telefono_previsto,
    canal: invitacion.canal,
    comercial_nombre: comercial?.nombre || null,
  };
};

module.exports = {
  PERMISOS_ROOT,
  hashToken,
  crmTablasDisponibles,
  obtenerClaimsHub,
  emitirJwtSesionConHub,
  usuarioTienePermisoHub,
  listarVentas,
  listarComerciales,
  crearInvitacionRegistro,
  buscarInvitacionValida,
  registrarVentaDesdeInvitacion,
  asignarVentaManual,
  obtenerInvitacionPreview,
};
