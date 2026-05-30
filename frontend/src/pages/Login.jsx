import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, Typography, notification, Modal } from 'antd';
import { getUsuarioData } from "../features/user/usuarioService";
import { doLogin, doForgotPassword } from "../features/auth/authService";
import { useNavigate } from 'react-router-dom';
import './Login.css';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  // Maneja el inicio de sesión contra el backend (JWT).
  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      await doLogin(values.email, values.password);

      const datosUsuario = await getUsuarioData(values.email);

      if (values.remember) {
        localStorage.setItem('isLoggedIn', 'true');
      } else {
        sessionStorage.setItem('isLoggedIn', 'true');
      }

      sessionStorage.setItem('idUsuario', datosUsuario.usuario.id_usuario);
      sessionStorage.setItem('idEmpresa', datosUsuario.empresa.id_empresa);
      sessionStorage.setItem('nombreUsuario', datosUsuario.usuario.nombre);
      sessionStorage.setItem('nombreEmpresa', datosUsuario.empresa.nombre);
      sessionStorage.setItem('tipoUsuario', datosUsuario.usuario.tipo_usuario);
      sessionStorage.setItem('esquema', datosUsuario.empresa.id_empresa);
      sessionStorage.setItem('alias', datosUsuario.empresa.alias);

      notification.success({
        message: "Inicio de sesión exitoso",
        description: `Hola, ${datosUsuario.usuario.nombre}`,
      });

      navigate('/Home');
    } catch (error) {
      // El usuario aún no tiene contraseña establecida (migración) o requiere reset.
      // El backend ya ha enviado el correo automáticamente; solo informamos.
      if (error.code === 'PASSWORD_RESET_REQUIRED') {
        notification.info({
          message: "Restablecimiento de contraseña requerido",
          description: error.message || "Tras mejoras en el sistema, por motivos de seguridad debes restablecer la contraseña. Se te ha enviado un correo con los pasos a seguir.",
          duration: 8,
        });
      } else {
        notification.error({
          message: "Error",
          description: error.message || "Error al iniciar sesión",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const openPasswordResetModal = () => setModalVisible(true);
  const closePasswordResetModal = () => setModalVisible(false);

  // Solicita el correo de restablecimiento al backend.
  const handlePasswordReset = async (values) => {
    const correo = values?.email || email;
    if (!correo) {
      notification.error({
        message: "Error",
        description: "Por favor ingrese un correo electrónico.",
      });
      return;
    }

    setResetLoading(true);
    try {
      const data = await doForgotPassword(correo);

      notification.success({
        message: "Correo enviado",
        description: "Si el email existe, recibirás instrucciones para restablecer tu contraseña.",
      });

      if (data.devResetUrl) {
        console.info('[DEV] Enlace de restablecimiento:', data.devResetUrl);
      }

      setModalVisible(false);
    } catch (error) {
      notification.error({
        message: "Error",
        description: error.message || "Error al enviar el correo de recuperación.",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Mitad izquierda: imagen con velo degradado rosa/azul (se oculta en móvil) */}
        <div className="login-visual">
          <div className="login-visual-veil" />
          <div className="login-visual-content">
            <Title level={2} className="login-visual-title">
              Ficha en el Trabajo
            </Title>
            <Text className="login-visual-text">
              Gestiona tu jornada de forma sencilla y segura.
            </Text>
          </div>
        </div>

        {/* Mitad derecha: formulario de login */}
        <div className="login-form-panel">
          <div className="login-form-wrapper">
            <Title level={2} className="login-title">Iniciar Sesión</Title>
            <Text type="secondary" className="login-subtitle">
              Bienvenido de nuevo, accede a tu cuenta
            </Text>

            <Form
              className="login-form"
              name="login"
              initialValues={{ remember: true }}
              onFinish={handleSubmit}
              layout="vertical"
              size="large"
            >
              <Form.Item
                label="Correo electrónico"
                name="email"
                rules={[{ required: true, type: 'email', message: 'Por favor ingrese un correo electrónico válido!' }]}
              >
                <Input type="email" placeholder="Correo electrónico" />
              </Form.Item>

              <Form.Item
                label="Contraseña"
                name="password"
                rules={[{ required: true, message: 'Por favor ingrese su contraseña!' }]}
              >
                <Input.Password placeholder="Contraseña" />
              </Form.Item>

              <Form.Item name="remember" valuePropName="checked" className="login-remember">
                <Checkbox>Recordarme</Checkbox>
              </Form.Item>

              <Form.Item className="login-submit">
                <Button className="colorPrincipal" type="primary" htmlType="submit" block loading={loading}>
                  Iniciar sesión
                </Button>
              </Form.Item>

              <Form.Item className="login-forgot">
                <Button type="link" onClick={openPasswordResetModal}>
                  ¿Olvidaste tu contraseña?
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>

      <Modal
        title="Recuperar contraseña"
        open={modalVisible}
        onCancel={closePasswordResetModal}
        footer={null}
        destroyOnClose
      >
        <Form
          name="password-reset"
          layout="vertical"
          onFinish={handlePasswordReset}
          initialValues={{ email }}
        >
          <Form.Item
            label="Correo electrónico"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Por favor ingrese su correo electrónico' }]}
          >
            <Input
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={resetLoading}>
              Enviar enlace de recuperación
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Login;
