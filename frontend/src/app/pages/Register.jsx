import React, { useEffect, useState } from 'react';
import { Form, Typography, notification, Alert } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { registrarEmpresaPublica } from '../../features/auth/authService';
import { previewInvitacionHub } from '../../features/hub/hubService';
import AltaEmpresaForm from './admin/AltaEmpresaForm';
import './Register.css';

const { Title, Text } = Typography;

const Register = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const invToken = searchParams.get('inv');
  const [invitacionInfo, setInvitacionInfo] = useState(null);
  const [invitacionError, setInvitacionError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!invToken) return;

    previewInvitacionHub({ inv: invToken })
      .then((data) => {
        setInvitacionInfo(data);
        if (data.email_previsto) {
          form.setFieldsValue({ email: data.email_previsto });
        }
      })
      .catch((error) => {
        setInvitacionError(error.message || 'Invitación no válida');
      });
  }, [invToken, form]);

  const handleFinish = async (values) => {
    const { acceptTerms: _acceptTerms, ...payload } = values;
    setLoading(true);
    try {
      const data = await registrarEmpresaPublica({
        ...payload,
        plan: 'rrhh',
        cicloFacturacion: payload.cicloFacturacion || 'mensual',
        invitacionToken: invToken || undefined,
      });

      if (data?.checkoutError) {
        notification.warning({
          message: 'Empresa registrada',
          description: `${data.message || 'Registro completado.'} ${data.checkoutError}`,
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
          Crea tu empresa en minutos y empieza a registrar la jornada de tu equipo sin coste
          durante la prueba. Recibirás un correo para activar tu cuenta y acceder al panel.
        </Text>
        {invitacionInfo?.comercial_nombre && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Invitación de ${invitacionInfo.comercial_nombre}`}
            description="Al completar el registro, tu empresa quedará vinculada a tu asesor comercial."
          />
        )}
        {invitacionError && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="Invitación no válida"
            description={invitacionError}
          />
        )}
        <ul className="register-trust" aria-label="Ventajas del registro">
          <li>Sin permanencia</li>
          <li>Control horario conforme a la normativa</li>
          <li>Soporte en español</li>
        </ul>

        <AltaEmpresaForm
          form={form}
          loading={loading}
          onFinish={handleFinish}
          onCancel={() => form.resetFields()}
          submitLabel="Registrar empresa"
          className="register-form-glass"
          registroPublico
          requireTermsAcceptance
          collectFiscalAddress
        />

        <p className="register-footer">
          ¿Ya tienes cuenta? <Link to={APP_ROUTES.login}>Acceder</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
