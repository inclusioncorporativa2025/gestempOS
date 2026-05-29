const firebaseAdmin = require('firebase-admin');
// const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const nodemailer = require('nodemailer');
const path = require('path');
const { sequelize } = require('../config/db');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');

if (!firebaseAdmin.apps.length) {

  const serviceAccount = require('../config/fichaeneltrabajoes-firebase-adminsdk-vioy5-e8a9b21323.json');

  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
  });
} else {
  firebaseAdmin.app();
}

const login = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token no proporcionado' });
  }

  try {

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

    res.status(200).json({
      message: 'Login exitoso',
      user: decodedToken,
    });
  } catch (error) {
    return res.status(401).json({ error: 'Token no válido o expirado' });
  }
};

const logout = (req, res) => {

  res.status(200).json({ message: 'Logout exitoso' });
};

const createUser = async (req, res) => {
  const { nombreCompleto, email, password, empresa } = req.body;

  if (!nombreCompleto || !email || !empresa || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios (nombre, email, contraseña, empresa)' });
  }

  try {

    const userRecord = await getAuth().createUser({
      email: email,
      emailVerified: false,
      password: password,
      displayName: nombreCompleto,
      disabled: false,
    });

    await getAuth().setCustomUserClaims(userRecord.uid, { empresa });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        empresa: empresa,
      },
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ message: 'Error al crear el usuario', error: error.message });
  }
};

const crearUsuarioFirebase = async (req,res) => {
  const { nombreUsuario, email, password, admin } = JSON.parse(req);

  if (!nombreUsuario || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios (nombre, email, contraseña, empresa)' });
  }

  try {

    const userRecord = await firebaseAdmin.auth().createUser({
      email: email,
      password: password,
      displayName: nombreUsuario,
      disabled: false,
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });

    var mailOptions;
    if(admin){
       mailOptions = {
        from: 'Noreply@fichaeneltrabajo.es',
        to: email,
        subject: 'Confirmación de registro',
        html: `
    <div style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; color: black;">
      <p>¡Te damos la bienvenida!</p>
    </div>
    <div style="text-align: center; margin-top: 20px;;">
    <p>Felicidades, ya formas parte de <strong>InCor</strong>, tu herramienta para fichar en el trabajo.</p>
    <p>Lo primero que debes hacer es configurar tu cuenta y dar de alta a todas las personas trabajadoras de tu empresa.</p>
      <div style="display: flex; justify-content: center; margin-top: 20px;">
          <table style="border-collapse: collapse; font-size: 18px; text-align: center; color: black;">
              <thead>
                  <tr>
                      <th style="border: 1px solid #ddd; padding: 10px; background-color: #f2f2f2;">Email</th>
                      <th style="border: 1px solid #ddd; padding: 10px; background-color: #f2f2f2;">Contraseña</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td style="border: 1px solid #ddd; padding: 10px;">${email}</td>
                      <td style="border: 1px solid #ddd; padding: 10px;">${password}</td>
                  </tr>
              </tbody>
          </table>
      </div>

      <p>Para acceder a tu panel de control, haz clic en el siguiente enlace:</p>
      <a href="http://fichaeneltrabajo.es"
        style="background-color: #007BFF; color: white; padding: 10px 20px; text-decoration: none; font-size: 16px; border-radius: 5px;">
        Acceder a mi cuenta
      </a>
      <p style="margin-top: 20px;">Si el enlace anterior no funciona, copia y pega la siguiente URL en la barra de direcciones de tu navegador:</p>
      <p><a href="http://fichaeneltrabajo.es" style="color: #007BFF;">http://fichaeneltrabajo.es</a></p>
      <p>¡Gracias!</p>
      <p>El equipo de Inclusión Corporativa</p>
            <img src="cid:logo" alt="Logo de InCor" style="width: 150px;" />

    </div>
    <div style="text-align: center; font-size: 12px;  margin-top: 20px;  color: black;">
        <p><em>No respondas a este correo electrónico. Este buzón no se supervisa. Si necesitas ayuda, envíanos un correo electrónico</em></p>
        <p><em>a info@fichaeneltrabajo.es o puedes llamarnos al 886 137 361. Recuerda que nuestro horario comercial es de L-V de 09:00 a 13:00.</em></p>
        <p><em>Este mensaje y sus archivos adjuntos se dirige exclusivamente a su destinatario y puede contener información confidencial. Si no eres el</em></p>
        <p><em>destinatario indicado, te notificamos que la utilización, divulgación y/o copia sin autorización está prohibida en virtud de la legislación</em></p>
        <p><em>vigente. Si has recibido este mensaje por error, te rogamos que nos lo comuniques inmediatamente y procedas a su destrucción. Gracias.</em></p>
        <p><em>De conformidad con lo dispuesto en las normativas vigentes en protección de datos GDPR y LOPD, te informamos que los datos personales</em></p>
        <p><em>serán tratados bajo la responsabilidad de Inclusión Corporativa, S.L. para resolver tu consulta. Los datos serán conservados el tiempo</em></p>
        <p><em>necesario para resolver tu consulta. Tras esto, tus datos serán conservados y no serán cedidos a terceros, salvo obligación legal. Puedes</em></p>
        <p><em>ejercer los derechos de acceso, rectificación, portabilidad, supresión, limitación y oposición enviando un mensaje</em></p>
        <p><em>a info@fichaeneltrabajo.es y si consideras que el tratamiento no se ajusta a la normativa vigente, podrás presentar una reclamación ante</em></p>
        <p><em>la autoridad de control en www.agpd.es.</em></p>
    </div>

        `,

        attachments: [
          {
            filename: 'Logo-Horizontal INCOR-RGB.png',
            path: path.resolve(__dirname, './Logo-Horizontal INCOR-RGB.png'),
            cid: 'logo'
          }
        ]
      };
    }else{
       mailOptions = {
        from: 'Noreply@fichaeneltrabajo.es',
        to: email,
        subject: 'Confirmación de registro',
        html: `
<div style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; color: black;">
  <p>¡Te damos la bienvenida!</p>
</div>
<div style="text-align: center; font-size: 18px; ">
    <p>Se ha creado un nuevo usuario en su cuenta Ficha en el trabajo con los siguientes datos:</p>
    <div style="display: flex; justify-content: center; margin-top: 20px;">
        <table style="border-collapse: collapse; font-size: 18px; text-align: center; color: black;">
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 10px; background-color: #f2f2f2;">Email</th>
                    <th style="border: 1px solid #ddd; padding: 10px; background-color: #f2f2f2;">Contraseña</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 10px;">${email}</td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${password}</td>
                </tr>
            </tbody>
        </table>
    </div>
    <p>Para acceder a tu panel de control, haz clic en el siguiente enlace:</p>
        <a href="http://fichaeneltrabajo.es"
          style="background-color: #007BFF; color: white; padding: 10px 20px; text-decoration: none; font-size: 16px; border-radius: 5px;">
          Acceder a mi cuenta
        </a>
    <p style="margin-top: 20px; color: black;">Si el enlace anterior no funciona, copia y pega la siguiente URL en la barra de direcciones de tu navegador:</p>
    <p><a href="http://fichaeneltrabajo.es" style="color: #007BFF;">http://fichaeneltrabajo.es</a></p>
    <p>¡Gracias!</p>
    <p>El equipo de Inclusión Corporativa</p>
          <img src="cid:logo" alt="Logo de InCor" style="width: 150px;" />

</div>
<div style="text-align: center; font-size: 12px;  margin-top: 20px;">
    <p><em>No respondas a este correo electrónico. Este buzón no se supervisa. Si necesitas ayuda, envíanos un correo electrónico</em></p>
    <p><em>a info@fichaeneltrabajo.es o puedes llamarnos al 886 137 361. Recuerda que nuestro horario comercial es de L-V de 09:00 a 13:00.</em></p>
    <p><em>Este mensaje y sus archivos adjuntos se dirige exclusivamente a su destinatario y puede contener información confidencial. Si no eres el</em></p>
    <p><em>destinatario indicado, te notificamos que la utilización, divulgación y/o copia sin autorización está prohibida en virtud de la legislación</em></p>
    <p><em>vigente. Si has recibido este mensaje por error, te rogamos que nos lo comuniques inmediatamente y procedas a su destrucción. Gracias.</em></p>
    <p><em>De conformidad con lo dispuesto en las normativas vigentes en protección de datos GDPR y LOPD, te informamos que los datos personales</em></p>
    <p><em>serán tratados bajo la responsabilidad de Inclusión Corporativa, S.L. para resolver tu consulta. Los datos serán conservados el tiempo</em></p>
    <p><em>necesario para resolver tu consulta. Tras esto, tus datos serán conservados y no serán cedidos a terceros, salvo obligación legal. Puedes</em></p>
    <p><em>ejercer los derechos de acceso, rectificación, portabilidad, supresión, limitación y oposición enviando un mensaje</em></p>
    <p><em>a info@fichaeneltrabajo.es y si consideras que el tratamiento no se ajusta a la normativa vigente, podrás presentar una reclamación ante</em></p>
    <p><em>la autoridad de control en www.agpd.es.</em></p>
</div>
        `,
        attachments: [
          {
            filename: 'Logo-Horizontal INCOR-RGB.png',
            path: path.resolve(__dirname, './Logo-Horizontal INCOR-RGB.png'),
            cid: 'logo'
          }
        ]
      };
    }

    await transporter.sendMail(mailOptions);

  } catch (error) {
    console.error(error);
  }
};

const completarRegistro = async (req, res) => {
  const { nombreCompleto, email, password, empresa, usuarioAlta, tipoUsuario } = req.body;
  const transaction = await sequelize.transaction();

  try {
      const fecha = new Date();

      const usuarioAdmin = await Usuario.create({
        nombre: nombreCompleto,
        email: email,
        fecha_alta: fecha,
        usuario_alta: usuarioAlta,
        tipo_usuario: tipoUsuario || 3
      }, { transaction });

      const usuarioEmpresa = await UsuarioEmpresa.create({
        id_usuario: usuarioAdmin.dataValues.id_usuario,
        id_empresa: empresa,
        fecha_alta: fecha,
        usuario_alta: usuarioAlta,
      }, { transaction });

      await transaction.commit();

      res.status(200).json({
        message: 'Usuario creado o actualizado exitosamente',
        email,
        nombreCompleto,
        empresa,
      });
  } catch (error) {

    console.error(error);
    res.status(500).json({
      message: 'Hubo un error al procesar el registro',
      error: error.message,
    });
  }
};

module.exports = {
  login,
  logout,
  createUser,
  crearUsuarioFirebase,
  completarRegistro
};
