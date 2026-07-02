export const normalizarTipoUsuario = (tipoUsuario) => Number(tipoUsuario);

export const valorTipoUsuarioForm = (tipoUsuario) => {
  const n = normalizarTipoUsuario(tipoUsuario);
  if ([3, 4, 5, 6].includes(n)) return String(n);
  return '5';
};

export const esAdministradorEmpresa = (tipoUsuario) =>
  normalizarTipoUsuario(tipoUsuario) === 3;

export const esInspector = (tipoUsuario) =>
  normalizarTipoUsuario(tipoUsuario) === 6;

export const etiquetaTipoUsuario = (tipoUsuario) => {
  const n = normalizarTipoUsuario(tipoUsuario);
  if (n === 1) return 'Super-admin';
  if (n === 2) return 'Admin plataforma';
  if (n === 3) return 'Administrador';
  if (n === 4) return 'Supervisor';
  if (n === 5) return 'Personal';
  if (n === 6) return 'Inspector';
  return 'Usuario';
};

export const puedeVerFichaPersonal = (tipoUsuario) =>
  [1, 2, 3, 4].includes(Number(tipoUsuario));

/** Aprobar/rechazar solicitudes de la empresa (administrador o supervisor). */
export const puedeAprobarSolicitudesEmpresa = (tipoUsuario) =>
  [3, 4].includes(normalizarTipoUsuario(tipoUsuario));

/** Cupo y ajustes de vacaciones en la propia ficha (super-admin y administrador de empresa). */
export const puedeAutogestionarVacacionesSaldo = (tipoUsuario) =>
  [1, 3].includes(normalizarTipoUsuario(tipoUsuario));
