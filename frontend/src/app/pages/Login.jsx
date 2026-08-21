import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, notification, Modal } from 'antd';
import GradientButton from '../components/shared/GradientButton';
import { doLogin, doForgotPassword, doSelectEmpresa, reanudarCheckout } from "../../features/auth/authService";
import { useAuth } from '../../config/AuthContext';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { SUPPORT_EMAIL } from '../../constants/support';
import BrandLogo from '../../components/BrandLogo';
import { redirectToApp } from '../../utils/appLinks';
import { getAuthToken } from '../../utils/authSession';
import SelectEmpresaModal from '../components/SelectEmpresaModal';
import { TRIAL_PAYMENT_DETAIL, TRIAL_PAYMENT_HEADLINE } from '../../constants/trial';
import './Login.css';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  const [empresasPendientes, setEmpresasPendientes] = useState([]);
  const [preAuthToken, setPreAuthToken] = useState(null);
  const [usuarioPendiente, setUsuarioPendiente] = useState(null);
  const [seleccionEmpresaLoading, setSeleccionEmpresaLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCheckoutUrl, setPaymentCheckoutUrl] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState(null);
  const navigate = useNavigate();
  const { user, login, ready } = useAuth();

  useEffect(() => {
    if (ready && user) {
      const token = getAuthToken();
      if (redirectToApp(APP_ROUTES.home, token)) return;
      navigate(APP_ROUTES.home, { replace: true });
    }
  }, [ready, user, navigate]);

  const completarAcceso = async (data) => {
    if (!data?.token) {
      throw new Error('No se recibió el token de sesión');
    }

    await login(data.token);

    const trialCaducado = Boolean(data.trial?.expirada || data.trial?.requierePlan);

    notification.success({
      message: trialCaducado ? 'Sesión iniciada' : 'Inicio de sesión exitoso',
      description: trialCaducado
        ? 'Tu periodo de prueba ha finalizado. Activa una suscripción para seguir usando Timecor.'
        : `Hola, ${data.usuario?.nombre || usuarioPendiente?.nombre || ''}`,
      duration: trialCaducado ? 10 : 4,
    });

    if (redirectToApp(trialCaducado ? APP_ROUTES.facturacion : APP_ROUTES.home, data.token)) {
      return;
    }

    navigate(trialCaducado ? APP_ROUTES.facturacion : APP_ROUTES.home);
  };

  const handleSeleccionEmpresa = async (idEmpresa) => {
    setSeleccionEmpresaLoading(true);
    try {
      const data = await doSelectEmpresa(preAuthToken, idEmpresa);
      setEmpresaModalOpen(false);
      setPreAuthToken(null);
      setEmpresasPendientes([]);
      await completarAcceso(data);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.message || 'No se pudo acceder a la empresa seleccionada',
      });
    } finally {
      setSeleccionEmpresaLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      const data = await doLogin(values.email, values.password);

      if (data.code === 'EMPRESA_SELECTION_REQUIRED') {
        setLoginCredentials(values);
        setPreAuthToken(data.preAuthToken);
        setEmpresasPendientes(data.empresas || []);
        setUsuarioPendiente(data.usuario || null);
        setEmpresaModalOpen(true);
        return;
      }

      await completarAcceso(data);
    } catch (error) {
      if (error.code === 'PASSWORD_RESET_REQUIRED') {
        notification.info({
          message: 'Restablecimiento de contraseña requerido',
          description:
            error.message
            || 'Tras mejoras en el sistema, por motivos de seguridad debes restablecer la contraseña. Se te ha enviado un correo con los pasos a seguir.',
          duration: 8,
        });
      } else if (error.code === 'EMPRESA_INACTIVA' || error.code === 'EMPRESA_NO_VINCULADA') {
        const emailSoporte = error.supportEmail || SUPPORT_EMAIL;
        notification.warning({
          message: 'Acceso no disponible',
          description: (
            <>
              {error.message || 'No podemos iniciar su sesión en este momento.'}{' '}
              Si necesita ayuda, escríbanos a{' '}
              <a href={`mailto:${emailSoporte}`}>{emailSoporte}</a>.
            </>
          ),
          duration: 10,
        });
      } else {
        notification.error({
          message: 'Error',
          description: error.message || 'Error al iniciar sesión',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const openPasswordResetModal = () => setModalVisible(true);
  const closePasswordResetModal = () => setModalVisible(false);

  const handleActivarPrueba = async () => {
    if (paymentCheckoutUrl) {
      window.location.href = paymentCheckoutUrl;
      return;
    }

    if (!loginCredentials?.email || !loginCredentials?.password) {
      notification.warning({
        message: 'Inicia sesión de nuevo',
        description: 'Vuelve a introducir tu email y contraseña para generar el enlace de pago.',
      });
      setPaymentModalOpen(false);
      return;
    }

    setPaymentLoading(true);
    try {
      const data = await reanudarCheckout(
        loginCredentials.email,
        loginCredentials.password,
      );
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      notification.error({
        message: 'No se pudo abrir el pago',
        description: 'Inténtalo de nuevo o contacta con soporte.',
      });
    } catch (error) {
      notification.error({
        message: 'No se pudo abrir el pago',
        description: error.message || 'Inténtalo de nuevo más tarde.',
      });
    } finally {
      setPaymentLoading(false);
    }
  };

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

  if (!ready) {
    return null;
  }

  return (
    <div className="login-page gradient-bg">
      <div className="login-card">
        <div className="login-visual">
          <div className="login-visual-veil" />
          <div className="login-visual-content">
            <BrandLogo className="login-visual-logo" variant="login" />
            <Text className="login-visual-text">
              Gestiona tu jornada de forma sencilla y segura.
            </Text>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-wrapper">
            <Title level={2} className="login-title">Iniciar Sesión</Title>
            <Text type="secondary" className="login-subtitle">
              Bienvenido de nuevo, accede a tu cuenta
            </Text>

            <Form
              className="login-form"
              name="login"
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

              <Form.Item className="login-submit">
                <GradientButton type="submit" text="Iniciar sesión" block loading={loading} />
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
            <GradientButton type="submit" text="Enviar enlace de recuperación" block loading={resetLoading} />
          </Form.Item>
        </Form>
      </Modal>

      <SelectEmpresaModal
        open={empresaModalOpen}
        empresas={empresasPendientes}
        loading={seleccionEmpresaLoading}
        onSelect={handleSeleccionEmpresa}
        onCancel={() => {
          setEmpresaModalOpen(false);
          setPreAuthToken(null);
          setEmpresasPendientes([]);
        }}
      />

      <Modal
        open={paymentModalOpen}
        title="Activar suscripción"
        onCancel={() => setPaymentModalOpen(false)}
        footer={[
          <Button key="cerrar" onClick={() => setPaymentModalOpen(false)}>
            Más tarde
          </Button>,
          <Button
            key="activar"
            type="primary"
            loading={paymentLoading}
            onClick={handleActivarPrueba}
          >
            Ir a pagar
          </Button>,
        ]}
      >
        <p style={{ marginBottom: 12 }}>{TRIAL_PAYMENT_HEADLINE}</p>
        <p style={{ marginBottom: 0, color: '#555' }}>{TRIAL_PAYMENT_DETAIL}</p>
      </Modal>
    </div>
  );
};

export default Login;
