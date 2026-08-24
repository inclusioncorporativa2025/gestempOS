/** Utilidades de acceso al hub comercial (claims JWT). */

export const tieneAccesoHub = (user) =>
  Boolean(user?.hub_acceso) || Number(user?.tipo_usuario) === 1;

export const tienePermisoHub = (user, codigo) => {
  if (Number(user?.tipo_usuario) === 1) return true;
  return (user?.hub_permisos || []).includes(codigo);
};

export const puedeVerDashboardHub = (user) =>
  [1, 2].includes(Number(user?.tipo_usuario));

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

export const etiquetaPuestoHub = (codigo, nombre) => {
  if (codigo === 'admin_hub') return 'Admin';
  return nombre;
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

export const etiquetaEstadoInvitacion = (estado) => {
  const map = {
    enviada: 'Enviada',
    registrada: 'Registrada',
    expirada: 'Expirada',
  };
  return map[estado] || estado;
};

export const colorEstadoInvitacion = (estado) => {
  const map = {
    enviada: 'gold',
    registrada: 'green',
    expirada: 'default',
  };
  return map[estado] || 'default';
};
