import React, { useEffect, useState } from 'react';
import { Form, Typography, notification } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { registrarEmpresaPublica } from '../../features/auth/authService';
import { previewInvitacionHub } from '../../features/hub/hubService';
import { getPlanMinLicencias } from '../../constants/plans';
import AltaEmpresaForm from './admin/AltaEmpresaForm';
import './Register.css';

const { Title, Text } = Typography;

const Register = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const invToken = searchParams.get('inv');
  const invCodigo = searchParams.get('codigo');
  const [invTokenActivo, setInvTokenActivo] = useState(invToken);
  const [invCodigoActivo, setInvCodigoActivo] = useState(invCodigo);
  const [invitacionPreview, setInvitacionPreview] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!invToken && !invCodigo) return;

    previewInvitacionHub({ inv: invToken, codigo: invCodigo })
      .then((data) => {
        setInvitacionPreview(data);
        const fields = {};
        if (data.email_previsto) {
          fields.email = data.email_previsto;
        }
        const esPagoInv = data.pago_inmediato || data.venta_directa;
        if (esPagoInv && data.ciclo_facturacion) {
          fields.cicloFacturacion = data.ciclo_facturacion;
        }
        if (esPagoInv && data.plan) {
          fields.plan = data.plan;
          const minPlan = getPlanMinLicencias(data.plan);
          const actuales = form.getFieldValue('numLicencias');
          if (actuales == null || Number(actuales) < minPlan) {
            fields.numLicencias = minPlan;
          }
        }
        if (Object.keys(fields).length > 0) {
          form.setFieldsValue(fields);
        }
      })
      .catch(() => {
        setInvTokenActivo(null);
        setInvCodigoActivo(null);
        setInvitacionPreview(null);
      });
  }, [invToken, invCodigo, form]);

  const handleFinish = async (values) => {
    const { acceptTerms: _acceptTerms, ...payload } = values;
    setLoading(true);
    try {
      const data = await registrarEmpresaPublica({
        ...payload,
        plan: payload.plan || 'rrhh',
        cicloFacturacion: payload.cicloFacturacion || 'mensual',
        invitacionToken: invTokenActivo || undefined,
        invitacionCodigo: invCodigoActivo || undefined,
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

  const esPagoInmediatoInv = Boolean(
    invitacionPreview?.pago_inmediato || invitacionPreview?.venta_directa,
  );

  return (
    <div className="register-page gradient-bg">
      <div className="register-glass-panel">
        <Title level={2} className="register-title">
          {esPagoInmediatoInv ? 'Activa tu suscripción' : 'Empieza gratis'}
        </Title>
        <Text className="register-lead">
          {esPagoInmediatoInv ? (
            <>
              <strong>Venta privada acordada con tu comercial.</strong>{' '}
              Tras crear la empresa deberás completar el pago (
              {invitacionPreview.ciclo_facturacion === 'anual' ? 'facturación anual' : 'facturación mensual'}
              ) para activar TimeCor.
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
          invitacionPagoInmediato={esPagoInmediatoInv}
          invitacionPlan={invitacionPreview?.plan || null}
          bloquearCicloFacturacion={esPagoInmediatoInv}
        />

        <p className="register-footer">
          ¿Ya tienes cuenta? <Link to={APP_ROUTES.login}>Acceder</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
