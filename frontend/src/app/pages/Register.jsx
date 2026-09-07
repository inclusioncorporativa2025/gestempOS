import React, { useEffect, useState } from 'react';
import { Form, Typography, notification } from 'antd';
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
  const [invTokenActivo, setInvTokenActivo] = useState(invToken);
  const [invitacionPreview, setInvitacionPreview] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!invToken) return;

    previewInvitacionHub({ inv: invToken })
      .then((data) => {
        setInvitacionPreview(data);
        const fields = {};
        if (data.email_previsto) {
          fields.email = data.email_previsto;
        }
        if (data.venta_directa && data.ciclo_facturacion) {
          fields.cicloFacturacion = data.ciclo_facturacion;
          fields.ventaDirectaInvitacion = true;
        }
        if (Object.keys(fields).length > 0) {
          form.setFieldsValue(fields);
        }
      })
      .catch(() => {
        setInvTokenActivo(null);
        setInvitacionPreview(null);
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
        invitacionToken: invTokenActivo || undefined,
      });

      if (data?.checkoutUrl) {
        notification.info({
          message: 'Completa el pago',
          description: 'Te redirigimos a Stripe para activar tu suscripción.',
          duration: 4,
        });
        window.location.href = data.checkoutUrl;
        return;
      }

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
          {invitacionPreview?.venta_directa ? 'Activa tu suscripción' : 'Empieza gratis'}
        </Title>
        <Text className="register-lead">
          {invitacionPreview?.venta_directa ? (
            <>
              <strong>Registro con venta directa.</strong>{' '}
              Tras crear la empresa deberás completar el pago (
              {invitacionPreview.ciclo_facturacion === 'anual' ? 'facturación anual' : 'facturación mensual'}
              ) para activar Timecor.
            </>
          ) : (
            <>
              <strong className="register-trial">15 días de prueba gratis.</strong>{' '}
              Crea tu empresa en minutos y empieza a registrar la jornada de tu equipo sin coste
              durante la prueba. Recibirás un correo para activar tu cuenta y acceder al panel.
            </>
          )}
        </Text>
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
          bloquearCicloFacturacion={Boolean(invitacionPreview?.venta_directa)}
        />

        <p className="register-footer">
          ¿Ya tienes cuenta? <Link to={APP_ROUTES.login}>Acceder</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
