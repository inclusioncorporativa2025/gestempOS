const AccesoPlataforma = require('../models/AccesoPlataforma');

const registrarAcceso = async ({
  idUsuario,
  tipoEvento,
  ruta,
  ip = null,
  userAgent = null,
  idEmpresa = null,
}) => {
  if (!idUsuario || !tipoEvento || !ruta) return null;

  try {
    return await AccesoPlataforma.create({
      id_usuario: idUsuario,
      tipo_evento: tipoEvento,
      ruta: String(ruta).slice(0, 500),
      ip: ip ? String(ip).slice(0, 45) : null,
      user_agent: userAgent ? String(userAgent).slice(0, 512) : null,
      id_empresa: idEmpresa ?? null,
      fecha: new Date(),
    });
  } catch (error) {
    console.error('Error registrando acceso plataforma:', error.message);
    return null;
  }
};

module.exports = {
  registrarAcceso,
};
