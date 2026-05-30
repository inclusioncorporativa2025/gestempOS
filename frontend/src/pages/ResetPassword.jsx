// src/pages/ResetPassword.jsx
import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card, notification, Result } from 'antd';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { doResetPassword } from '../features/auth/authService';
import './ResetPassword.css';

const { Title, Paragraph } = Typography;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const enlaceInvalido = !token || !email;

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await doResetPassword(email, token, values.password);
      notification.success({
        message: 'Contraseña establecida',
        description: 'Ya puedes iniciar sesión con tu nueva contraseña.',
      });
      navigate('/');
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.message || 'No se pudo restablecer la contraseña.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (enlaceInvalido) {
    return (
      <div className="reset-page">
        <Result
          status="warning"
          title="Enlace no válido"
          subTitle="El enlace de restablecimiento es incorrecto o está incompleto. Solicita uno nuevo desde el inicio de sesión."
          extra={<Link to="/"><Button type="primary">Volver al inicio</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="reset-page">
      <Card
        className="reset-card"
        title={<Title level={3} className="reset-title">Establecer nueva contraseña</Title>}
        bordered={false}
      >
        <Paragraph className="reset-account">
          Cuenta: <strong>{email}</strong>
        </Paragraph>

        <Form name="reset-password" onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="Nueva contraseña"
            name="password"
            rules={[
              { required: true, message: 'Por favor ingrese su nueva contraseña' },
              { min: 8, message: 'La contraseña debe tener al menos 8 caracteres' },
            ]}
            hasFeedback
          >
            <Input.Password placeholder="Nueva contraseña" />
          </Form.Item>

          <Form.Item
            label="Confirmar contraseña"
            name="confirm"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Por favor confirme su contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Repite la contraseña" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} className="colorPrincipal">
              Establecer contraseña
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPassword;
