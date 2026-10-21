/** Módulos del marketplace (alineado con marketplace_modulos.codigo). */
export const MARKETPLACE_MODULO_ALERTAS = 'alertas_fichaje';

export const MARKETPLACE_MIN_PLAZAS = 1;
export const MARKETPLACE_MAX_PLAZAS = 500;

/** Módulo contratado: estado active y al menos una plaza facturada. */
export const marketplaceModuloContratoActivo = (filaEstado) => {
  const contrato = filaEstado?.contrato;
  if (!contrato || String(contrato.estado).toLowerCase() !== 'active') return false;
  const plazas = Number(contrato.licencias_facturadas);
  return Number.isFinite(plazas) && plazas >= MARKETPLACE_MIN_PLAZAS;
};

/** Texto introductorio del catálogo (pestaña Catálogo). */
export const MARKETPLACE_CATALOGO_INTRO =
  'Funciones opcionales facturadas por usuario: contrata plazas en el catálogo '
  + 'y asigna cada plaza al personal en la ficha del módulo.';

export const MARKETPLACE_MODULOS = [
  {
    codigo: MARKETPLACE_MODULO_ALERTAS,
    nombre: 'Alertas de fichaje',
    menuLabel: 'Alerta fichaje',
    coverClass: 'marketplace-module-card__cover--alertas',
    coverImage: '/marketplace/alertas-fichaje-catalogo.png',
    coverImageAlt: 'Recordatorio de registro de jornada laboral',
    panelGestion: true,
    subtituloPanel:
      'Aviso por email o WhatsApp para registrar la jornada; canales configurables por persona asignada',
    descripcionCatalogo:
      'Si una persona trabajadora no ha registrado su jornada a tiempo, recibe un aviso por email o WhatsApp para que la registre. Los canales se configuran por persona al asignar el módulo.',
  },
];

export const marketplaceModuloPath = (codigo) => `/marketplace/m/${codigo}`;

export const marketplaceModulosGestion = () => (
  MARKETPLACE_MODULOS.filter((m) => m.panelGestion !== false)
);

/** Entrada al marketplace sin catálogo (p. ej. menú lateral). El layout redirige al primer módulo activo. */
export const marketplaceRutaGestionPorDefecto = () => '/marketplace';

export const marketplaceCodigoDesdePathname = (pathname) => {
  const match = String(pathname || '').match(/^\/marketplace\/m\/([^/]+)/);
  return match?.[1] ?? null;
};

export const marketplaceEsRutaModulo = (pathname) => (
  Boolean(marketplaceCodigoDesdePathname(pathname))
);

export const marketplaceNombreModulo = (codigo) => {
  const row = MARKETPLACE_MODULOS.find((m) => m.codigo === codigo);
  return row?.nombre ?? codigo;
};

export const marketplaceSubtituloModulo = (codigo) => {
  const row = MARKETPLACE_MODULOS.find((m) => m.codigo === codigo);
  return row?.subtituloPanel ?? 'Configuración del módulo contratado';
};

export const marketplaceDescripcionCatalogoModulo = (codigo, descripcionApi) => {
  const row = MARKETPLACE_MODULOS.find((m) => m.codigo === codigo);
  if (row?.descripcionCatalogo) return row.descripcionCatalogo;
  return descripcionApi ?? '';
};

export const marketplaceModuloCoverClass = (codigo) => {
  const row = MARKETPLACE_MODULOS.find((m) => m.codigo === codigo);
  return row?.coverClass ?? 'marketplace-module-card__cover--default';
};

export const marketplaceModuloCoverImage = (codigo) => {
  const row = MARKETPLACE_MODULOS.find((m) => m.codigo === codigo);
  return row?.coverImage ?? null;
};

export const marketplaceModuloCoverImageAlt = (codigo) => {
  const row = MARKETPLACE_MODULOS.find((m) => m.codigo === codigo);
  return row?.coverImageAlt ?? '';
};

export const marketplaceModuloMenuLabel = (codigo) => {
  const row = MARKETPLACE_MODULOS.find((m) => m.codigo === codigo);
  return row?.menuLabel ?? row?.nombre ?? codigo;
};

/** Módulo activo en empresa y hay plaza para asignar (o el usuario ya lo tiene). */
export const empresaModuloVisibleEnEdicionUsuario = (estadoFila, usuarioAsignado) => {
  if (!marketplaceModuloContratoActivo(estadoFila)) return false;
  if (usuarioAsignado) return true;
  const licencias = Number(estadoFila.contrato?.licencias_facturadas) || 0;
  const asientos = Number(estadoFila.asientos_activos) || 0;
  if (licencias <= 0) return true;
  return asientos < licencias;
};
