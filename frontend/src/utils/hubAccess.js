/** Utilidades de acceso al hub comercial (claims JWT). */

export const tieneAccesoHub = (user) =>
  Boolean(user?.hub_acceso) || Number(user?.tipo_usuario) === 1;

export const tienePermisoHub = (user, codigo) => {
  if (Number(user?.tipo_usuario) === 1) return true;
  return (user?.hub_permisos || []).includes(codigo);
};

export const etiquetaEtapaVenta = (etapa) => {
  const map = {
    registrada: 'Registrada',
    trial: 'En prueba',
    activa: 'Activa',
    cancelada: 'Cancelada',
  };
  return map[etapa] || etapa;
};

export const colorEtapaVenta = (etapa) => {
  const map = {
    registrada: 'blue',
    trial: 'gold',
    activa: 'green',
    cancelada: 'default',
  };
  return map[etapa] || 'default';
};
