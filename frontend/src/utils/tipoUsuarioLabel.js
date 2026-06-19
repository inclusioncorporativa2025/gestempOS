export const etiquetaTipoUsuario = (tipoUsuario) => {
  const n = Number(tipoUsuario);
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
