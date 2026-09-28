/** Módulos del marketplace (alineado con marketplace_modulos.codigo). */
export const MARKETPLACE_MODULO_ALERTAS = 'alertas_fichaje';

export const MARKETPLACE_MODULOS = [
  {
    codigo: MARKETPLACE_MODULO_ALERTAS,
    nombre: 'Alertas de fichaje',
    menuLabel: 'Alerta fichaje',
    coverClass: 'marketplace-module-card__cover--alertas',
    panelGestion: true,
    subtituloPanel: 'Aviso por email o WhatsApp cuando alguien no ficha la entrada',
  },
];

export const marketplaceModuloPath = (codigo) => `/marketplace/m/${codigo}`;

export const marketplaceModulosGestion = () => (
  MARKETPLACE_MODULOS.filter((m) => m.panelGestion !== false)
);

export const marketplaceRutaGestionPorDefecto = () => {
  const modulos = marketplaceModulosGestion();
  return modulos.length ? marketplaceModuloPath(modulos[0].codigo) : '/marketplace';
};

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

export const marketplaceModuloCoverClass = (codigo) => {
  const row = MARKETPLACE_MODULOS.find((m) => m.codigo === codigo);
  return row?.coverClass ?? 'marketplace-module-card__cover--default';
};

export const marketplaceModuloMenuLabel = (codigo) => {
  const row = MARKETPLACE_MODULOS.find((m) => m.codigo === codigo);
  return row?.menuLabel ?? row?.nombre ?? codigo;
};

/** Módulo activo en empresa y hay plaza para asignar (o el usuario ya lo tiene). */
export const empresaModuloVisibleEnEdicionUsuario = (estadoFila, usuarioAsignado) => {
  if (estadoFila?.contrato?.estado !== 'active') return false;
  if (usuarioAsignado) return true;
  const licencias = Number(estadoFila.contrato?.licencias_facturadas) || 0;
  const asientos = Number(estadoFila.asientos_activos) || 0;
  if (licencias <= 0) return true;
  return asientos < licencias;
};
