/** Módulos del marketplace (alineado con marketplace_modulos.codigo). */
export const MARKETPLACE_MODULO_ALERTAS = 'alertas_fichaje';

export const MARKETPLACE_MODULOS = [
  {
    codigo: MARKETPLACE_MODULO_ALERTAS,
    nombre: 'Alertas de fichaje',
    menuLabel: 'Alerta fichaje',
    coverClass: 'marketplace-module-card__cover--alertas',
  },
];

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
