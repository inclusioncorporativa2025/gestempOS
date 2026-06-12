const { enviarCorreoSoporte } = require('../utils/mailService');

const enviarMensajeSoporte = async (req, res) => {
  const { mensaje } = req.body;

  if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
    return res.status(400).json({ message: 'El mensaje es obligatorio' });
  }

  if (mensaje.trim().length < 10) {
    return res.status(400).json({ message: 'El mensaje debe tener al menos 10 caracteres' });
  }

  if (mensaje.length > 2000) {
    return res.status(400).json({ message: 'El mensaje no puede superar 2000 caracteres' });
  }

  const { email, nombre, id_empresa, nombre_empresa, id_usuario } = req.user;

  if (!email) {
    return res.status(400).json({ message: 'No se encontró el correo del usuario en la sesión' });
  }

  try {
    await enviarCorreoSoporte({
      nombreUsuario: nombre || 'Usuario',
      emailUsuario: email,
      nombreEmpresa: nombre_empresa || 'Sin empresa',
      idEmpresa: id_empresa ?? 'N/A',
      idUsuario: id_usuario ?? 'N/A',
      mensaje: mensaje.trim(),
    });

    return res.status(200).json({ message: 'Mensaje enviado a soporte correctamente' });
  } catch (error) {
    console.error('Error enviando correo de soporte:', error);
    return res.status(500).json({ message: 'No se pudo enviar el mensaje. Inténtalo más tarde.' });
  }
};

module.exports = { enviarMensajeSoporte };
