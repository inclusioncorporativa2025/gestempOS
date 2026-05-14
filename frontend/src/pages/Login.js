import React, { useState } from 'react';
import { Row, Col, Form, Input, Button, Checkbox, Typography, Card, notification, Modal } from 'antd';
import { getUsuarioData } from "../features/user/usuarioService";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

import { auth } from "../config/firebase"; // Asegúrate de importar tu configuración de Firebase
import { useNavigate } from 'react-router-dom'; // Navegación para redirección

const { Title } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); // Estado para controlar la visibilidad del modal
  const [email, setEmail] = useState(""); // Estado para almacenar el correo electrónico del usuario
  const navigate = useNavigate(); // Hook para redirigir
  const [remember, setRemember] = useState(false); // Estado para "Recordarme"

  // Función para manejar el submit del formulario
  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      // Autenticar al usuario con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      //llamada a API para recuperar los datos del usuario (la empresa a la que pertenece, tipo usuario etc)
      const datosUsuario = await getUsuarioData(values.email);

      // Guardar el estado de sesión
      if (values.remember) {
        localStorage.setItem('isLoggedIn', true);
      } else {
        sessionStorage.setItem('isLoggedIn', true);
      }

      //guardamos la informacion del usuario
      sessionStorage.setItem('idUsuario', datosUsuario.usuario.id_usuario);
      sessionStorage.setItem('idEmpresa', datosUsuario.empresa.id_empresa);
      sessionStorage.setItem('nombreUsuario', datosUsuario.usuario.nombre);
      sessionStorage.setItem('nombreEmpresa', datosUsuario.empresa.nombre);
      sessionStorage.setItem('tipoUsuario', datosUsuario.usuario.tipo_usuario);
      sessionStorage.setItem('esquema', datosUsuario.empresa.id_empresa);
      sessionStorage.setItem('alias', datosUsuario.empresa.alias);


  

      // Notificación de éxito
      notification.success({
        message: "Inicio de sesión exitoso",
        description: `Hola, ${datosUsuario.usuario.nombre}`,
      });


      // Redirigir a la página principal
      navigate('/Home');
    } catch (error) {
      // Manejar errores de autenticación
      notification.error({
        message: "Error",
        description: "Error al iniciar sesión",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir el modal
  const openPasswordResetModal = () => {
    setModalVisible(true);
  };

  // Función para cerrar el modal
  const closePasswordResetModal = () => {
    setModalVisible(false);
  };

  // Función para manejar el envío del enlace de recuperación de contraseña
  const handlePasswordReset = async () => {
    if (!email) {
      notification.error({
        message: "Error",
        description: "Por favor ingrese un correo electrónico.",
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      notification.success({
        message: "Correo enviado",
        description: "Revisa tu correo electrónico para restablecer tu contraseña.",
      });
      setModalVisible(false); // Cerrar el modal
    } catch (error) {
      notification.error({
        message: "Error",
        description: error.message || "Error al enviar el correo de recuperación.",
      });
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', backgroundColor: '#f5f5f5' }}>
      <Row style={{ width: '100vw', justifyContent: 'center' }}>
        <Col xs={21} sm={12} md={12} lg={12} xl={12} xxl={12}>
          <Card
            title={<Title level={2} style={{ textAlign: 'center' }}>Iniciar Sesión</Title>}
            bordered={false}
          >
            <Form
              name="login"
              initialValues={{ remember: true }}
              onFinish={handleSubmit}
              layout="vertical"
            >
              {/* Campo de correo electrónico */}
              <Form.Item
                label="Correo electrónico"
                name="email"
                rules={[{ required: true, type: 'email', message: 'Por favor ingrese un correo electrónico válido!' }]}
              >
                <Input type="email" placeholder="Correo electrónico" />
              </Form.Item>

              {/* Campo de contraseña */}
              <Form.Item
                label="Contraseña"
                name="password"
                rules={[{ required: true, message: 'Por favor ingrese su contraseña!' }]}
              >
                <Input.Password placeholder="Contraseña" />
              </Form.Item>

              {/* Recordar sesión */}
              <Form.Item name="remember" valuePropName="checked">
                <Checkbox onChange={(e) => setRemember(e.target.checked)}>Recordarme</Checkbox>
              </Form.Item>

              {/* Botón de inicio de sesión */}
              <Form.Item>
                <Button className="colorPrincipal" type="primary" htmlType="submit" block loading={loading}>
                  Iniciar sesión
                </Button>
              </Form.Item>

              {/* Enlace para recuperar la contraseña */}
              <Form.Item style={{ textAlign: 'center' }}>
                <Button type="link" onClick={openPasswordResetModal}>
                  ¿Olvidaste tu contraseña?
                </Button>
              </Form.Item>

            </Form>
          </Card>
        </Col>
      </Row>

      {/* Modal para recuperar la contraseña */}
      <Modal
        title="Recuperar contraseña"
        open={modalVisible}
        onCancel={closePasswordResetModal}
        footer={null}
      >
        <Form
          name="password-reset"
          layout="vertical"
          onFinish={handlePasswordReset}
        >
          <Form.Item
            label="Correo electrónico"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Por favor ingrese su correo electrónico' }]}
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Enviar enlace de recuperación
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Login;
