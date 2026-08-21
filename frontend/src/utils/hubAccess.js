/** Utilidades de acceso al hub comercial (claims JWT). */

export const tieneAccesoHub = (user) =>
  Boolean(user?.hub_acceso) || Number(user?.tipo_usuario) === 1;

export const tienePermisoHub = (user, codigo) => {
  if (Number(user?.tipo_usuario) === 1) return true;
  return (user?.hub_permisos || []).includes(codigo);
};

/** ROOT, admin_hub o supervisor_comercial — pueden ver pestaña Accesos y asignar. */
export const puedeGestionarAccesosHub = (user) => {
  if (Number(user?.tipo_usuario) === 1) return true;
  const puestos = user?.hub_puestos || [];
  return puestos.includes('supervisor_comercial') || puestos.includes('admin_hub');
};

/** Supervisor sin admin: solo gestiona puesto comercial. */
export const esSupervisorComercialHub = (user) => {
  if (Number(user?.tipo_usuario) === 1) return false;
  const puestos = user?.hub_puestos || [];
  return puestos.includes('supervisor_comercial') && !puestos.includes('admin_hub');
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
