const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { emitirJwtSesion } = require('./usuarioEmpresaService');

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
let crmCampanasCache = null;

const crmCampanasDisponibles = async () => {
  if (crmCampanasCache === true) return true;
  if (!(await crmTablasDisponibles())) return false;
  try {
    await sequelize.query('SELECT 1 FROM crm_campana LIMIT 1', {
      type: QueryTypes.SELECT,
    });
    crmCampanasCache = true;
    return true;
  } catch {
    return false;
  }
};

const slugificarCampana = (nombre) => {
  let base = String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  if (!base) base = `campana-${Date.now()}`;
  return base;
};

const generarCodigoCampanaUnico = async (nombre) => {
  const reservados = new Set(['organico', 'legacy', 'comercial', 'admin', 'sistema']);
  let base = slugificarCampana(nombre);
  if (reservados.has(base)) base = `${base}-custom`;
  let codigo = base;
  let sufijo = 2;

  while (true) {
    const [existente] = await sequelize.query(
      `SELECT id_campana FROM crm_campana WHERE codigo = :codigo LIMIT 1`,
      { replacements: { codigo }, type: QueryTypes.SELECT },
    );
    if (!existente) return codigo;
    codigo = `${base}-${sufijo}`;
    sufijo += 1;
  }
};

const { TRIAL_DAYS } = require('../config/trial');

const normalizarDiasPruebaCampana = (dias) => {
  if (dias == null || dias === '') return null;
  const n = Number(dias);
  if (!Number.isFinite(n) || n < 1 || n > 730) {
    const error = new Error('Los días de prueba deben estar entre 1 y 730');
    error.code = 'DIAS_PRUEBA_INVALIDO';
    throw error;
  }
  return Math.floor(n);
};

const listarCampanas = async () => {
  if (!(await crmCampanasDisponibles())) return [];

  return sequelize.query(
    `SELECT
       c.id_campana,
       c.codigo,
       c.nombre,
       c.descripcion,
       c.dias_prueba,
       c.tipo,
       c.activo,
       c.id_usuario_creador,
       c.fecha_alta,
       u.nombre AS creador_nombre
     FROM crm_campana c
     LEFT JOIN m_usuarios u ON u.id_usuario = c.id_usuario_creador
     WHERE c.activo = 1
     ORDER BY c.tipo = 'campana' DESC, c.nombre ASC, c.fecha_alta DESC`,
    { type: QueryTypes.SELECT },
  );
};

const crearCampana = async ({
  nombre,
  descripcion = null,
  diasPrueba = null,
  idUsuario,
  usuarioAlta,
}) => {
  if (!(await crmCampanasDisponibles())) {
    const error = new Error('Las campañas comerciales no están disponibles en el servidor');
    error.code = 'CAMPANAS_NO_DISPONIBLES';
    throw error;
  }

  const nombreLimpio = String(nombre || '').trim();
  if (nombreLimpio.length < 2) {
    const error = new Error('El nombre de la campaña debe tener al menos 2 caracteres');
    error.code = 'NOMBRE_INVALIDO';
    throw error;
  }
  if (nombreLimpio.length > 120) {
    const error = new Error('El nombre de la campaña no puede superar 120 caracteres');
    error.code = 'NOMBRE_INVALIDO';
    throw error;
  }

  const diasPruebaValidos = normalizarDiasPruebaCampana(diasPrueba);
  const codigo = await generarCodigoCampanaUnico(nombreLimpio);

  const [, meta] = await sequelize.query(
    `INSERT INTO crm_campana (
       codigo, nombre, descripcion, dias_prueba, tipo, activo, id_usuario_creador, usuario_alta
     ) VALUES (
       :codigo, :nombre, :descripcion, :diasPrueba, 'campana', 1, :idUsuarioCreador, :usuarioAlta
     )`,
    {
      replacements: {
        codigo,
        nombre: nombreLimpio,
        descripcion: descripcion ? String(descripcion).trim() : null,
        diasPrueba: diasPruebaValidos,
        idUsuarioCreador: idUsuario || null,
        usuarioAlta: usuarioAlta || idUsuario || null,
      },
    },
  );

  const idCampana = meta?.insertId ?? null;
  const [campana] = await sequelize.query(
    `SELECT id_campana, codigo, nombre, descripcion, dias_prueba, tipo, activo,
            id_usuario_creador, fecha_alta
     FROM crm_campana
     WHERE id_campana = :idCampana
     LIMIT 1`,
    { replacements: { idCampana }, type: QueryTypes.SELECT },
  );

  return campana;
};

const resolverCampanaActiva = async (idCampana) => {
  if (!idCampana || !(await crmCampanasDisponibles())) return null;

  const [campana] = await sequelize.query(
    `SELECT id_campana, codigo, nombre, tipo, activo, dias_prueba
     FROM crm_campana
     WHERE id_campana = :idCampana
       AND activo = 1
     LIMIT 1`,
    { replacements: { idCampana: Number(idCampana) }, type: QueryTypes.SELECT },
  );

  return campana || null;
};

const calcularFechaFinPruebaCampana = async ({ idCampana, desde = new Date() } = {}) => {
  let dias = TRIAL_DAYS;

  if (idCampana) {
    const campana = await resolverCampanaActiva(idCampana);
    if (campana?.dias_prueba != null) {
      dias = Number(campana.dias_prueba);
    }
  }

  const fin = new Date(desde);
  fin.setDate(fin.getDate() + dias);
  return fin;
};

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

  if (!idUsuario) {
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

const refrescarClaimsHubEnUsuario = async (user) => {
  const claims = await obtenerClaimsHub({
    id_usuario: user?.id_usuario,
    tipo_usuario: user?.tipo_usuario,
  });

  user.hub_acceso = Boolean(claims.hub_acceso);
  user.hub_puestos = claims.hub_puestos || [];
  user.hub_permisos = claims.hub_permisos || [];

  return user.hub_acceso;
};

const usuarioTienePermisoHub = (user, ...codigos) => {
  if (Number(user?.tipo_usuario) === ROLES_ROOT) return true;
  const permisos = user?.hub_permisos || [];
  return codigos.some((codigo) => permisos.includes(codigo));
};

/** ROOT/admin_hub: total. supervisor_comercial: solo puesto comercial. */
const resolverGestionAccesosHub = (user) => {
  if (Number(user?.tipo_usuario) === ROLES_ROOT) {
    return { nivel: 'total' };
  }

  const puestos = user?.hub_puestos || [];
  if (puestos.includes('admin_hub')) {
    return { nivel: 'total' };
  }
  if (puestos.includes('supervisor_comercial')) {
    return { nivel: 'supervisor' };
  }

  return null;
};

const usuarioPuedeGestionarAccesosHub = (user) => Boolean(resolverGestionAccesosHub(user));

const usuarioPuedeGestionarCarteraHub = usuarioPuedeGestionarAccesosHub;

const assertGestionCarteraHub = (user) => {
  const gestion = resolverGestionAccesosHub(user);
  if (!gestion) {
    const error = new Error('No autorizado para gestionar clientes e invitaciones');
    error.code = 'ACCESO_DENEGADO';
    throw error;
  }
  return gestion;
};

const assertComercialEnAlcanceGestion = async (user, idUsuarioComercial) => {
  const gestion = assertGestionCarteraHub(user);
  if (gestion.nivel === 'total') return;

  const [row] = await sequelize.query(
    `SELECT 1 AS ok
     FROM crm_usuario_puesto_interno upi
     INNER JOIN crm_puesto_interno p ON p.id_puesto = upi.id_puesto
     WHERE upi.id_usuario = :idUsuario
       AND upi.fecha_baja IS NULL
       AND p.codigo = 'comercial'
     LIMIT 1`,
    {
      replacements: { idUsuario: Number(idUsuarioComercial) },
      type: QueryTypes.SELECT,
    },
  );

  if (!row) {
    const error = new Error('Solo puedes gestionar registros de comerciales');
    error.code = 'COMERCIAL_FUERA_DE_ALCANCE';
    throw error;
  }
};

const assertComercialDestinoValido = async (idUsuarioComercial) => {
  const [row] = await sequelize.query(
    `SELECT u.id_usuario
     FROM m_usuarios u
     INNER JOIN crm_usuario_puesto_interno upi ON upi.id_usuario = u.id_usuario
     INNER JOIN crm_puesto_interno p ON p.id_puesto = upi.id_puesto
     WHERE u.id_usuario = :idUsuario
       AND u.fecha_baja IS NULL
       AND upi.fecha_baja IS NULL
       AND p.codigo = 'comercial'
     LIMIT 1`,
    {
      replacements: { idUsuario: Number(idUsuarioComercial) },
      type: QueryTypes.SELECT,
    },
  );

  if (!row) {
    const error = new Error('El comercial de destino no es válido');
    error.code = 'COMERCIAL_DESTINO_INVALIDO';
    throw error;
  }
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
    ? ', ef.licencias_facturadas, p.nombre AS plan_nombre'
    : '';

  const joinImportes = incluirImportes
    ? 'LEFT JOIN planes p ON p.id_plan = ef.id_plan'
    : '';

  const campanasOk = await crmCampanasDisponibles();
  const selectCampana = campanasOk
    ? ', v.id_campana, c.nombre AS campana_nombre, c.dias_prueba AS campana_dias_prueba'
    : '';
  const joinCampana = campanasOk ? 'LEFT JOIN crm_campana c ON c.id_campana = v.id_campana' : '';

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
       u.email AS comercial_email,
       ef.modo_facturacion,
       ef.estado_suscripcion,
       ef.trial_ends_at,
       ef.stripe_subscription_id,
       ef.cancel_at_period_end
       ${selectCampana}
       ${selectImportes}
     FROM crm_venta v
     INNER JOIN m_empresas e ON e.id_empresa = v.id_empresa
     INNER JOIN m_usuarios u ON u.id_usuario = v.id_usuario_comercial
     LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
     ${joinCampana}
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

const resolverEstadoInvitacionSql = `
  CASE
    WHEN i.usado = 1 THEN 'registrada'
    WHEN i.fecha_expiracion IS NOT NULL AND i.fecha_expiracion < NOW() THEN 'expirada'
    ELSE 'enviada'
  END`;

const listarInvitaciones = async (user, { q, estado, pagina = 1, limite = 50 } = {}) => {
  const scope = resolverScopeVentas(user);
  if (scope.tipo === 'ninguno') {
    return { invitaciones: [], total: 0 };
  }

  const offset = (Math.max(1, pagina) - 1) * limite;
  const replacements = {
    limite: Number(limite),
    offset: Number(offset),
  };

  let where = '1=1';

  if (scope.tipo === 'propias') {
    where += ' AND i.id_usuario_comercial = :idComercial';
    replacements.idComercial = scope.idUsuario;
  } else if (scope.tipo === 'equipo') {
    where += ` AND i.id_usuario_comercial IN (
      SELECT upi2.id_usuario
      FROM crm_usuario_puesto_interno upi2
      INNER JOIN crm_puesto_interno p2 ON p2.id_puesto = upi2.id_puesto
      WHERE upi2.fecha_baja IS NULL AND p2.codigo = 'comercial'
    )`;
  }

  if (estado === 'enviada') {
    where += ' AND i.usado = 0 AND (i.fecha_expiracion IS NULL OR i.fecha_expiracion >= NOW())';
  } else if (estado === 'registrada') {
    where += ' AND i.usado = 1';
  } else if (estado === 'expirada') {
    where += ' AND i.usado = 0 AND i.fecha_expiracion IS NOT NULL AND i.fecha_expiracion < NOW()';
  }

  if (q) {
    where += ` AND (
      i.email_previsto LIKE :q OR i.telefono_previsto LIKE :q
      OR i.codigo_corto LIKE :q OR u.nombre LIKE :q OR u.email LIKE :q
      OR e.nombre LIKE :q OR e.alias LIKE :q
    )`;
    replacements.q = `%${String(q).trim()}%`;
  }

  const campanasOk = await crmCampanasDisponibles();
  const selectCampanaInv = campanasOk
    ? ', i.id_campana, c.nombre AS campana_nombre, c.dias_prueba AS campana_dias_prueba'
    : '';
  const joinCampanaInv = campanasOk ? 'LEFT JOIN crm_campana c ON c.id_campana = i.id_campana' : '';

  const invitaciones = await sequelize.query(
    `SELECT
       i.id_invitacion,
       i.codigo_corto,
       i.email_previsto,
       i.telefono_previsto,
       i.canal,
       i.usado,
       i.fecha_creacion,
       i.fecha_expiracion,
       i.fecha_uso,
       i.id_empresa_uso,
       ${resolverEstadoInvitacionSql} AS estado,
       u.id_usuario AS comercial_id,
       u.nombre AS comercial_nombre,
       u.email AS comercial_email,
       e.nombre AS empresa_nombre,
       e.alias AS empresa_alias,
       v.etapa AS venta_etapa
       ${selectCampanaInv}
     FROM crm_invitacion_registro i
     INNER JOIN m_usuarios u ON u.id_usuario = i.id_usuario_comercial
     LEFT JOIN m_empresas e ON e.id_empresa = i.id_empresa_uso
     LEFT JOIN crm_venta v ON v.id_venta = i.id_venta
     ${joinCampanaInv}
     WHERE ${where}
     ORDER BY i.fecha_creacion DESC
     LIMIT :limite OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );

  const [countRow] = await sequelize.query(
    `SELECT COUNT(*) AS total
     FROM crm_invitacion_registro i
     INNER JOIN m_usuarios u ON u.id_usuario = i.id_usuario_comercial
     LEFT JOIN m_empresas e ON e.id_empresa = i.id_empresa_uso
     WHERE ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );

  return { invitaciones, total: Number(countRow?.total || 0) };
};

const listarComerciales = async ({ soloComercial = false } = {}) => {
  const codigos = soloComercial
    ? ['comercial']
    : ['comercial', 'supervisor_comercial', 'admin_hub'];

  return sequelize.query(
    `SELECT DISTINCT u.id_usuario, u.nombre, u.email
     FROM crm_usuario_puesto_interno upi
     INNER JOIN crm_puesto_interno p ON p.id_puesto = upi.id_puesto
     INNER JOIN m_usuarios u ON u.id_usuario = upi.id_usuario
     WHERE upi.fecha_baja IS NULL
       AND p.codigo IN (:codigos)
       AND u.fecha_baja IS NULL
     ORDER BY u.nombre ASC`,
    { replacements: { codigos }, type: QueryTypes.SELECT },
  );
};

const crearInvitacionRegistro = async ({
  idUsuarioComercial,
  emailPrevisto,
  telefonoPrevisto,
  canal = 'telefono',
  diasValidez = 30,
  idCampana = null,
}) => {
  const token = generarTokenInvitacion();
  const tokenHash = hashToken(token);
  const codigoCorto = generarCodigoCorto();
  const fechaExpiracion = new Date();
  fechaExpiracion.setDate(fechaExpiracion.getDate() + diasValidez);

  const campanasOk = await crmCampanasDisponibles();
  let idCampanaValida = null;
  if (campanasOk && idCampana) {
    const campana = await resolverCampanaActiva(idCampana);
    if (!campana) {
      const error = new Error('La campaña seleccionada no es válida');
      error.code = 'CAMPANA_INVALIDA';
      throw error;
    }
    idCampanaValida = campana.id_campana;
  }

  const campanaSql = idCampanaValida ? ', id_campana' : '';
  const campanaVal = idCampanaValida ? ', :idCampana' : '';

  const [, meta] = await sequelize.query(
    `INSERT INTO crm_invitacion_registro (
       token_hash, codigo_corto, id_usuario_comercial,
       email_previsto, telefono_previsto, canal, fecha_expiracion
       ${campanaSql}
     ) VALUES (
       :tokenHash, :codigoCorto, :idUsuarioComercial,
       :emailPrevisto, :telefonoPrevisto, :canal, :fechaExpiracion
       ${campanaVal}
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
        ...(idCampanaValida ? { idCampana: idCampanaValida } : {}),
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

/** Invitación pendiente más reciente para el email del admin (altas desde panel). */
const buscarInvitacionValidaPorEmail = async ({ email }) => {
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!emailNorm) return null;

  const filas = await sequelize.query(
    `SELECT *
     FROM crm_invitacion_registro
     WHERE usado = 0
       AND (fecha_expiracion IS NULL OR fecha_expiracion > NOW())
       AND LOWER(TRIM(email_previsto)) = :email
     ORDER BY fecha_creacion DESC
     LIMIT 1`,
    {
      replacements: { email: emailNorm },
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
  const campanasOk = await crmCampanasDisponibles();
  const campanaSql = campanasOk && invitacion.id_campana ? ', id_campana' : '';
  const campanaVal = campanasOk && invitacion.id_campana ? ', :idCampana' : '';

  const [, insertMeta] = await sequelize.query(
    `INSERT INTO crm_venta (
       id_empresa, id_usuario_comercial, id_invitacion_registro,
       canal, etapa, usuario_alta
       ${campanaSql}
     ) VALUES (
       :idEmpresa, :idComercial, :idInvitacion,
       :canal, 'registrada', :usuarioAlta
       ${campanaVal}
     )`,
    {
      replacements: {
        idEmpresa,
        idComercial: invitacion.id_usuario_comercial,
        idInvitacion: invitacion.id_invitacion,
        canal: invitacion.canal || 'telefono',
        usuarioAlta,
        ...(campanasOk && invitacion.id_campana
          ? { idCampana: invitacion.id_campana }
          : {}),
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

const eliminarVentaHub = async ({ idVenta, user }) => {
  assertGestionCarteraHub(user);

  const [venta] = await sequelize.query(
    `SELECT id_venta, id_usuario_comercial
     FROM crm_venta
     WHERE id_venta = :idVenta AND fecha_baja IS NULL
     LIMIT 1`,
    {
      replacements: { idVenta: Number(idVenta) },
      type: QueryTypes.SELECT,
    },
  );

  if (!venta) {
    const error = new Error('Cliente no encontrado o ya eliminado');
    error.code = 'VENTA_NO_ENCONTRADA';
    throw error;
  }

  await assertComercialEnAlcanceGestion(user, venta.id_usuario_comercial);

  await sequelize.query(
    `UPDATE crm_venta
     SET fecha_baja = NOW(), fecha_modificacion = NOW()
     WHERE id_venta = :idVenta`,
    { replacements: { idVenta: Number(idVenta) } },
  );

  return { id_venta: Number(idVenta) };
};

const transferirVentaHub = async ({ idVenta, idUsuarioComercial, user }) => {
  assertGestionCarteraHub(user);
  const idComercial = Number(idUsuarioComercial);
  if (!idComercial) {
    const error = new Error('id_usuario_comercial es obligatorio');
    error.code = 'COMERCIAL_DESTINO_INVALIDO';
    throw error;
  }

  await assertComercialDestinoValido(idComercial);

  const [venta] = await sequelize.query(
    `SELECT id_venta, id_usuario_comercial
     FROM crm_venta
     WHERE id_venta = :idVenta AND fecha_baja IS NULL
     LIMIT 1`,
    {
      replacements: { idVenta: Number(idVenta) },
      type: QueryTypes.SELECT,
    },
  );

  if (!venta) {
    const error = new Error('Cliente no encontrado o ya eliminado');
    error.code = 'VENTA_NO_ENCONTRADA';
    throw error;
  }

  await assertComercialEnAlcanceGestion(user, venta.id_usuario_comercial);

  if (Number(venta.id_usuario_comercial) === idComercial) {
    const error = new Error('El cliente ya está asignado a ese comercial');
    error.code = 'COMERCIAL_IGUAL';
    throw error;
  }

  await sequelize.query(
    `UPDATE crm_venta
     SET id_usuario_comercial = :idComercial,
         fecha_modificacion = NOW(),
         usuario_alta = :usuarioAlta
     WHERE id_venta = :idVenta`,
    {
      replacements: {
        idComercial,
        idVenta: Number(idVenta),
        usuarioAlta: Number(user.id_usuario),
      },
    },
  );

  return { id_venta: Number(idVenta), id_usuario_comercial: idComercial };
};

const eliminarInvitacionHub = async ({ idInvitacion, user }) => {
  assertGestionCarteraHub(user);

  const [invitacion] = await sequelize.query(
    `SELECT id_invitacion, id_usuario_comercial, usado
     FROM crm_invitacion_registro
     WHERE id_invitacion = :idInvitacion
     LIMIT 1`,
    {
      replacements: { idInvitacion: Number(idInvitacion) },
      type: QueryTypes.SELECT,
    },
  );

  if (!invitacion) {
    const error = new Error('Invitación no encontrada');
    error.code = 'INVITACION_NO_ENCONTRADA';
    throw error;
  }

  await assertComercialEnAlcanceGestion(user, invitacion.id_usuario_comercial);

  if (Number(invitacion.usado) === 1) {
    const error = new Error('No se puede eliminar una invitación ya utilizada; puedes transferirla');
    error.code = 'INVITACION_USADA';
    throw error;
  }

  await sequelize.query(
    `DELETE FROM crm_invitacion_registro WHERE id_invitacion = :idInvitacion`,
    { replacements: { idInvitacion: Number(idInvitacion) } },
  );

  return { id_invitacion: Number(idInvitacion) };
};

const transferirInvitacionHub = async ({ idInvitacion, idUsuarioComercial, user }) => {
  assertGestionCarteraHub(user);
  const idComercial = Number(idUsuarioComercial);
  if (!idComercial) {
    const error = new Error('id_usuario_comercial es obligatorio');
    error.code = 'COMERCIAL_DESTINO_INVALIDO';
    throw error;
  }

  await assertComercialDestinoValido(idComercial);

  const [invitacion] = await sequelize.query(
    `SELECT id_invitacion, id_usuario_comercial, id_venta, usado
     FROM crm_invitacion_registro
     WHERE id_invitacion = :idInvitacion
     LIMIT 1`,
    {
      replacements: { idInvitacion: Number(idInvitacion) },
      type: QueryTypes.SELECT,
    },
  );

  if (!invitacion) {
    const error = new Error('Invitación no encontrada');
    error.code = 'INVITACION_NO_ENCONTRADA';
    throw error;
  }

  await assertComercialEnAlcanceGestion(user, invitacion.id_usuario_comercial);

  if (Number(invitacion.id_usuario_comercial) === idComercial) {
    const error = new Error('La invitación ya pertenece a ese comercial');
    error.code = 'COMERCIAL_IGUAL';
    throw error;
  }

  await sequelize.query(
    `UPDATE crm_invitacion_registro
     SET id_usuario_comercial = :idComercial
     WHERE id_invitacion = :idInvitacion`,
    {
      replacements: {
        idComercial,
        idInvitacion: Number(idInvitacion),
      },
    },
  );

  if (invitacion.id_venta) {
    await sequelize.query(
      `UPDATE crm_venta
       SET id_usuario_comercial = :idComercial,
           fecha_modificacion = NOW(),
           usuario_alta = :usuarioAlta
       WHERE id_venta = :idVenta AND fecha_baja IS NULL`,
      {
        replacements: {
          idComercial,
          idVenta: Number(invitacion.id_venta),
          usuarioAlta: Number(user.id_usuario),
        },
      },
    );
  }

  return { id_invitacion: Number(idInvitacion), id_usuario_comercial: idComercial };
};

const listarPuestosInternos = async (user) => {
  const gestion = resolverGestionAccesosHub(user);
  if (!gestion) return [];

  const codigos = gestion.nivel === 'supervisor'
    ? ['comercial']
    : ['comercial', 'supervisor_comercial', 'admin_hub'];

  return sequelize.query(
    `SELECT id_puesto, codigo, nombre
     FROM crm_puesto_interno
     WHERE activo = 1
       AND codigo IN (:codigos)
     ORDER BY FIELD(codigo, 'comercial', 'supervisor_comercial', 'admin_hub')`,
    {
      replacements: { codigos },
      type: QueryTypes.SELECT,
    },
  );
};

const listarAccesosHub = async (user) => {
  const gestion = resolverGestionAccesosHub(user);
  if (!gestion) return [];

  const filtroSupervisor = gestion.nivel === 'supervisor'
    ? " AND p.codigo = 'comercial'"
    : '';

  return sequelize.query(
    `SELECT
       upi.id,
       upi.id_usuario,
       upi.id_puesto,
       upi.fecha_alta,
       u.nombre,
       u.email,
       u.tipo_usuario,
       p.codigo AS puesto_codigo,
       p.nombre AS puesto_nombre
     FROM crm_usuario_puesto_interno upi
     INNER JOIN m_usuarios u ON u.id_usuario = upi.id_usuario
     INNER JOIN crm_puesto_interno p ON p.id_puesto = upi.id_puesto
     WHERE upi.fecha_baja IS NULL
       AND u.fecha_baja IS NULL
       ${filtroSupervisor}
     ORDER BY u.nombre ASC, p.nombre ASC`,
    { type: QueryTypes.SELECT },
  );
};

const listarUsuariosInternosElegibles = async (user) => {
  const idEmpresa = user?.id_empresa ? Number(user.id_empresa) : null;

  if (idEmpresa) {
    return sequelize.query(
      `SELECT DISTINCT u.id_usuario, u.nombre, u.email,
              COALESCE(ue.tipo_usuario, u.tipo_usuario) AS tipo_usuario
       FROM m_usuarios u
       INNER JOIN m_usuarios_empresas ue ON ue.id_usuario = u.id_usuario
       WHERE ue.id_empresa = :idEmpresa
         AND ue.fecha_baja IS NULL
         AND (ue.activo IS NULL OR ue.activo = 1)
         AND u.fecha_baja IS NULL
         AND (u.activo IS NULL OR u.activo = 1)
       ORDER BY u.nombre ASC`,
      {
        replacements: { idEmpresa },
        type: QueryTypes.SELECT,
      },
    );
  }

  return sequelize.query(
    `SELECT id_usuario, nombre, email, tipo_usuario
     FROM m_usuarios
     WHERE tipo_usuario IN (1, 2)
       AND fecha_baja IS NULL
       AND (activo IS NULL OR activo = 1)
     ORDER BY nombre ASC`,
    { type: QueryTypes.SELECT },
  );
};

const asignarPuestoHub = async ({ idUsuario, idPuesto, usuarioAlta, user }) => {
  const gestion = resolverGestionAccesosHub(user);
  if (!gestion) {
    const error = new Error('No autorizado para gestionar accesos');
    error.code = 'ACCESO_DENEGADO';
    throw error;
  }

  const [puesto] = await sequelize.query(
    `SELECT codigo FROM crm_puesto_interno WHERE id_puesto = :idPuesto AND activo = 1 LIMIT 1`,
    {
      replacements: { idPuesto },
      type: QueryTypes.SELECT,
    },
  );

  if (!puesto) {
    const error = new Error('Puesto no válido');
    error.code = 'PUESTO_INVALIDO';
    throw error;
  }

  if (gestion.nivel === 'supervisor' && puesto.codigo !== 'comercial') {
    const error = new Error('Solo puedes asignar el puesto comercial');
    error.code = 'PUESTO_NO_PERMITIDO';
    throw error;
  }

  const [existente] = await sequelize.query(
    `SELECT id FROM crm_usuario_puesto_interno
     WHERE id_usuario = :idUsuario AND id_puesto = :idPuesto AND fecha_baja IS NULL
     LIMIT 1`,
    {
      replacements: { idUsuario, idPuesto },
      type: QueryTypes.SELECT,
    },
  );

  if (existente) {
    const error = new Error('El usuario ya tiene ese puesto activo');
    error.code = 'PUESTO_YA_ASIGNADO';
    throw error;
  }

  const [, meta] = await sequelize.query(
    `INSERT INTO crm_usuario_puesto_interno (id_usuario, id_puesto, usuario_alta)
     VALUES (:idUsuario, :idPuesto, :usuarioAlta)`,
    {
      replacements: { idUsuario, idPuesto, usuarioAlta },
    },
  );

  return meta?.insertId ?? null;
};

const revocarPuestoHub = async ({ idAsignacion, user }) => {
  const gestion = resolverGestionAccesosHub(user);
  if (!gestion) {
    const error = new Error('No autorizado para gestionar accesos');
    error.code = 'ACCESO_DENEGADO';
    throw error;
  }

  const [asignacion] = await sequelize.query(
    `SELECT upi.id, upi.id_usuario, p.codigo AS puesto_codigo
     FROM crm_usuario_puesto_interno upi
     INNER JOIN crm_puesto_interno p ON p.id_puesto = upi.id_puesto
     WHERE upi.id = :idAsignacion AND upi.fecha_baja IS NULL
     LIMIT 1`,
    {
      replacements: { idAsignacion },
      type: QueryTypes.SELECT,
    },
  );

  if (!asignacion) {
    const error = new Error('Asignación no encontrada o ya revocada');
    error.code = 'ASIGNACION_NO_ENCONTRADA';
    throw error;
  }

  if (gestion.nivel === 'supervisor' && asignacion.puesto_codigo !== 'comercial') {
    const error = new Error('Solo puedes revocar accesos de comerciales');
    error.code = 'PUESTO_NO_PERMITIDO';
    throw error;
  }

  await sequelize.query(
    `UPDATE crm_usuario_puesto_interno
     SET fecha_baja = NOW()
     WHERE id = :idAsignacion`,
    { replacements: { idAsignacion } },
  );

  return { id_usuario: asignacion.id_usuario };
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

/** Etapa comercial derivada de empresa_facturacion (alineada con trialService). */
const SQL_ETAPA_VENTA = `
  CASE
    WHEN LOWER(COALESCE(ef.estado_suscripcion, '')) = 'canceled' THEN 'cancelada'
    WHEN LOWER(COALESCE(ef.modo_facturacion, '')) = 'legacy' THEN 'activa'
    WHEN LOWER(COALESCE(ef.estado_suscripcion, '')) IN ('active', 'past_due') THEN 'activa'
    WHEN LOWER(COALESCE(ef.modo_facturacion, '')) = 'trial'
      AND (ef.trial_ends_at IS NULL OR ef.trial_ends_at > NOW()) THEN 'trial'
    ELSE 'registrada'
  END`;

const SQL_FECHA_CLIENTE = 'COALESCE(v.fecha_venta, e.fecha_alta)';

const normalizarMesMetricas = (mes) => {
  const raw = String(mes || '').trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const obtenerMetricasDashboard = async ({ mes } = {}) => {
  const mesFiltro = normalizarMesMetricas(mes);
  const crmOk = await crmTablasDisponibles();
  const joinVenta = crmOk
    ? 'LEFT JOIN crm_venta v ON v.id_empresa = e.id_empresa AND v.fecha_baja IS NULL'
    : 'LEFT JOIN (SELECT NULL AS id_venta, NULL AS id_empresa, NULL AS fecha_venta) v ON 1 = 0';

  const sqlFromClientes = `
  FROM m_empresas e
  ${joinVenta}
  LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
  WHERE e.fecha_baja IS NULL`;

  const resumenRows = await sequelize.query(
    `SELECT (${SQL_ETAPA_VENTA}) AS etapa_comercial, COUNT(*) AS total
     ${sqlFromClientes}
     GROUP BY etapa_comercial`,
    { type: QueryTypes.SELECT },
  );

  const resumen = {
    total: 0,
    registrada: 0,
    trial: 0,
    activa: 0,
    cancelada: 0,
    sin_comercial: 0,
  };
  resumenRows.forEach((row) => {
    const n = Number(row.total || 0);
    resumen.total += n;
    const key = row.etapa_comercial;
    if (key in resumen) {
      resumen[key] = n;
    }
  });

  const [sinComercialRow] = await sequelize.query(
    `SELECT COUNT(*) AS total
     ${sqlFromClientes}
       AND v.id_venta IS NULL`,
    { type: QueryTypes.SELECT },
  );
  resumen.sin_comercial = Number(sinComercialRow?.total || 0);

  const evolucion = await sequelize.query(
    `SELECT DATE_FORMAT(${SQL_FECHA_CLIENTE}, '%Y-%m') AS mes,
            COUNT(*) AS total,
            SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'activa' THEN 1 ELSE 0 END) AS activas,
            SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'trial' THEN 1 ELSE 0 END) AS trial,
            SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'registrada' THEN 1 ELSE 0 END) AS registradas
     ${sqlFromClientes}
       AND ${SQL_FECHA_CLIENTE} >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY DATE_FORMAT(${SQL_FECHA_CLIENTE}, '%Y-%m')
     ORDER BY mes ASC`,
    { type: QueryTypes.SELECT },
  );

  const [mesActual] = await sequelize.query(
    `SELECT COUNT(*) AS total
     ${sqlFromClientes}
       AND DATE_FORMAT(${SQL_FECHA_CLIENTE}, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`,
    { type: QueryTypes.SELECT },
  );

  const [mesAnterior] = await sequelize.query(
    `SELECT COUNT(*) AS total
     ${sqlFromClientes}
       AND DATE_FORMAT(${SQL_FECHA_CLIENTE}, '%Y-%m') = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m')`,
    { type: QueryTypes.SELECT },
  );

  let productividadComerciales = [];
  let productividadOrganica = { ventas_total: 0 };

  if (crmOk) {
    productividadComerciales = await sequelize.query(
      `SELECT
         u.id_usuario,
         u.nombre,
         u.email,
         COUNT(
           CASE
             WHEN v.id_venta IS NOT NULL
               AND e.fecha_baja IS NULL
               AND DATE_FORMAT(${SQL_FECHA_CLIENTE}, '%Y-%m') = :mesFiltro
             THEN v.id_venta
           END
         ) AS ventas_total,
         SUM(
           CASE
             WHEN v.id_venta IS NOT NULL
               AND e.fecha_baja IS NULL
               AND DATE_FORMAT(${SQL_FECHA_CLIENTE}, '%Y-%m') = :mesFiltro
               AND (${SQL_ETAPA_VENTA}) = 'activa'
             THEN 1 ELSE 0
           END
         ) AS ventas_activas,
         SUM(
           CASE
             WHEN v.id_venta IS NOT NULL
               AND e.fecha_baja IS NULL
               AND DATE_FORMAT(${SQL_FECHA_CLIENTE}, '%Y-%m') = :mesFiltro
               AND (${SQL_ETAPA_VENTA}) = 'trial'
             THEN 1 ELSE 0
           END
         ) AS ventas_trial,
         SUM(
           CASE
             WHEN v.id_venta IS NOT NULL
               AND e.fecha_baja IS NULL
               AND DATE_FORMAT(${SQL_FECHA_CLIENTE}, '%Y-%m') = :mesFiltro
               AND (${SQL_ETAPA_VENTA}) = 'registrada'
             THEN 1 ELSE 0
           END
         ) AS ventas_registradas,
         SUM(
           CASE
             WHEN v.id_venta IS NOT NULL
               AND e.fecha_baja IS NULL
               AND DATE_FORMAT(${SQL_FECHA_CLIENTE}, '%Y-%m') = :mesFiltro
               AND (${SQL_ETAPA_VENTA}) = 'cancelada'
             THEN 1 ELSE 0
           END
         ) AS ventas_canceladas,
         (
           SELECT COUNT(*)
           FROM crm_invitacion_registro i
           WHERE i.id_usuario_comercial = u.id_usuario
             AND DATE_FORMAT(i.fecha_creacion, '%Y-%m') = :mesFiltro
         ) AS invitaciones_total,
         (
           SELECT COUNT(*)
           FROM crm_invitacion_registro i
           WHERE i.id_usuario_comercial = u.id_usuario
             AND DATE_FORMAT(i.fecha_creacion, '%Y-%m') = :mesFiltro
             AND i.usado = 1
         ) AS invitaciones_usadas,
         0 AS es_organica
       FROM crm_usuario_puesto_interno upi
       INNER JOIN crm_puesto_interno p
         ON p.id_puesto = upi.id_puesto AND p.codigo = 'comercial'
       INNER JOIN m_usuarios u ON u.id_usuario = upi.id_usuario
       LEFT JOIN crm_venta v
         ON v.id_usuario_comercial = u.id_usuario AND v.fecha_baja IS NULL
       LEFT JOIN m_empresas e ON e.id_empresa = v.id_empresa AND e.fecha_baja IS NULL
       LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
       WHERE upi.fecha_baja IS NULL
         AND u.fecha_baja IS NULL
       GROUP BY u.id_usuario, u.nombre, u.email
       HAVING ventas_total > 0 OR invitaciones_total > 0
       ORDER BY ventas_total DESC, u.nombre ASC`,
      { replacements: { mesFiltro }, type: QueryTypes.SELECT },
    );

    [productividadOrganica] = await sequelize.query(
      `SELECT
         NULL AS id_usuario,
         'Registro directo / Legacy' AS nombre,
         NULL AS email,
         COUNT(e.id_empresa) AS ventas_total,
         SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'activa' THEN 1 ELSE 0 END) AS ventas_activas,
         SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'trial' THEN 1 ELSE 0 END) AS ventas_trial,
         SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'registrada' THEN 1 ELSE 0 END) AS ventas_registradas,
         SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'cancelada' THEN 1 ELSE 0 END) AS ventas_canceladas,
         0 AS invitaciones_total,
         0 AS invitaciones_usadas,
         1 AS es_organica
       ${sqlFromClientes}
         AND v.id_venta IS NULL
         AND DATE_FORMAT(e.fecha_alta, '%Y-%m') = :mesFiltro`,
      { replacements: { mesFiltro }, type: QueryTypes.SELECT },
    );
  } else {
    [productividadOrganica] = await sequelize.query(
      `SELECT
         NULL AS id_usuario,
         'Registro directo / Legacy' AS nombre,
         NULL AS email,
         COUNT(e.id_empresa) AS ventas_total,
         SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'activa' THEN 1 ELSE 0 END) AS ventas_activas,
         SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'trial' THEN 1 ELSE 0 END) AS ventas_trial,
         SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'registrada' THEN 1 ELSE 0 END) AS ventas_registradas,
         SUM(CASE WHEN (${SQL_ETAPA_VENTA}) = 'cancelada' THEN 1 ELSE 0 END) AS ventas_canceladas,
         0 AS invitaciones_total,
         0 AS invitaciones_usadas,
         1 AS es_organica
       FROM m_empresas e
       LEFT JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
       WHERE e.fecha_baja IS NULL
         AND DATE_FORMAT(e.fecha_alta, '%Y-%m') = :mesFiltro`,
      { replacements: { mesFiltro }, type: QueryTypes.SELECT },
    );
  }

  const mapProductividad = (row) => {
    const invTotal = Number(row.invitaciones_total || 0);
    const invUsadas = Number(row.invitaciones_usadas || 0);
    return {
      ...row,
      ventas_total: Number(row.ventas_total || 0),
      ventas_activas: Number(row.ventas_activas || 0),
      ventas_trial: Number(row.ventas_trial || 0),
      ventas_registradas: Number(row.ventas_registradas || 0),
      ventas_canceladas: Number(row.ventas_canceladas || 0),
      invitaciones_total: invTotal,
      invitaciones_usadas: invUsadas,
      tasa_conversion: invTotal > 0 ? Math.round((invUsadas / invTotal) * 100) : null,
      es_organica: Boolean(Number(row.es_organica)),
    };
  };

  const tieneActividadEnMes = (row) => {
    const ventas = Number(row.ventas_total || 0);
    const invitaciones = Number(row.invitaciones_total || 0);
    if (row.es_organica) return ventas > 0;
    return ventas > 0 || invitaciones > 0;
  };

  const productividadConTasa = [
    ...productividadComerciales.map(mapProductividad).filter(tieneActividadEnMes),
    ...(Number(productividadOrganica?.ventas_total || 0) > 0
      ? [mapProductividad(productividadOrganica)]
      : []),
  ].sort((a, b) => b.ventas_total - a.ventas_total || String(a.nombre).localeCompare(String(b.nombre)));

  return {
    mes: mesFiltro,
    resumen,
    evolucion: evolucion.map((row) => ({
      mes: row.mes,
      total: Number(row.total || 0),
      activas: Number(row.activas || 0),
      trial: Number(row.trial || 0),
      registradas: Number(row.registradas || 0),
    })),
    comparativa_meses: {
      actual: Number(mesActual?.total || 0),
      anterior: Number(mesAnterior?.total || 0),
    },
    productividad: productividadConTasa,
  };
};

module.exports = {
  PERMISOS_ROOT,
  hashToken,
  crmTablasDisponibles,
  crmCampanasDisponibles,
  listarCampanas,
  crearCampana,
  resolverCampanaActiva,
  calcularFechaFinPruebaCampana,
  obtenerClaimsHub,
  emitirJwtSesionConHub,
  usuarioTienePermisoHub,
  usuarioPuedeGestionarAccesosHub,
  usuarioPuedeGestionarCarteraHub,
  resolverGestionAccesosHub,
  eliminarVentaHub,
  transferirVentaHub,
  eliminarInvitacionHub,
  transferirInvitacionHub,
  listarVentas,
  listarInvitaciones,
  listarComerciales,
  crearInvitacionRegistro,
  buscarInvitacionValida,
  buscarInvitacionValidaPorEmail,
  registrarVentaDesdeInvitacion,
  asignarVentaManual,
  obtenerInvitacionPreview,
  listarPuestosInternos,
  listarAccesosHub,
  listarUsuariosInternosElegibles,
  asignarPuestoHub,
  revocarPuestoHub,
  obtenerMetricasDashboard,
  refrescarClaimsHubEnUsuario,
};
