const normalizarTipoUsuario = (tipoUsuario) => Number(tipoUsuario);

const etiquetaTipoUsuario = (tipoUsuario) => {
  const n = normalizarTipoUsuario(tipoUsuario);
  if (n === 1) return 'Super-admin';
  if (n === 2) return 'Admin plataforma';
  if (n === 3) return 'Administrador';
  if (n === 4) return 'Supervisor';
  if (n === 5) return 'Personal';
  if (n === 6) return 'Inspector';
  return 'Usuario';
};

module.exports = {
  normalizarTipoUsuario,
  etiquetaTipoUsuario,
};
