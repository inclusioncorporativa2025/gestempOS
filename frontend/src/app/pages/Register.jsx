import React, { useState } from 'react';
import { Form, Typography, notification } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { registrarEmpresaPublica } from '../../features/auth/authService';
import AltaEmpresaForm from './admin/AltaEmpresaForm';
import './Register.css';

const { Title, Text } = Typography;

const Register = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      const data = await registrarEmpresaPublica(values);

      if (data?.checkoutUrl) {
        notification.info({
          message: 'Empresa registrada',
          description:
            'A continuación añade tu tarjeta en Stripe para activar los 15 días de prueba.',
          duration: 6,
        });
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data?.checkoutError) {
        notification.warning({
          message: 'Empresa registrada',
          description: `${data.message || 'Registro completado.'} No se pudo abrir el pago: ${data.checkoutError}`,
          duration: 12,
        });
      } else if (data?.emailBienvenidaEnviado === false) {
        notification.warning({
          message: 'Empresa registrada',
          description:
            data.message ||
            'Tu empresa se ha creado, pero no pudimos enviar el correo. Usa «Olvidé mi contraseña» con el email del administrador.',
          duration: 10,
        });
      } else {
        notification.success({
          message: '¡Registro completado!',
          description:
            data?.message ||
            'Revisa el correo del administrador para activar tu cuenta e iniciar sesión.',
          duration: 8,
        });
      }

      if (data?.devWelcomeUrl) {
        console.info('[DEV] Enlace de bienvenida:', data.devWelcomeUrl);
      }

      form.resetFields();
      navigate(APP_ROUTES.login, { replace: true });
    } catch (error) {
      notification.error({
        message: 'No se pudo registrar la empresa',
        description: error.message || 'Inténtalo de nuevo más tarde.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page gradient-bg">
      <div className="register-glass-panel">
        <Title level={2} className="register-title">
          Empieza gratis
        </Title>
        <Text className="register-lead">
          <strong className="register-trial">15 días de prueba gratis.</strong>{' '}
          Tras registrar tu empresa, añade tu tarjeta en Stripe. No se cobrará nada hasta
          que termine la prueba y puedes cancelar en cualquier momento antes, sin compromiso.
          Después recibirás un correo para activar tu cuenta.
        </Text>

        <AltaEmpresaForm
          form={form}
          loading={loading}
          onFinish={handleFinish}
          onCancel={() => form.resetFields()}
          submitLabel="Registrar empresa"
          className="register-form-glass"
          showPlanSelect
          planSelectVariant="cards"
        />

        <p className="register-footer">
          ¿Ya tienes cuenta? <Link to={APP_ROUTES.login}>Acceder</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
