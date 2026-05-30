// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card, message } from 'antd';
import { doForgotPassword } from '../features/auth/authService';
import './ForgotPassword.css';

const { Title } = Typography;

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const data = await doForgotPassword(values.email);
      message.success('Si el email existe, recibirás un correo para restablecer tu contraseña.');
      if (data.devResetUrl) {
        console.info('[DEV] Enlace de restablecimiento:', data.devResetUrl);
      }
    } catch (error) {
      message.error(error.message || 'Error al enviar el correo. Comprueba que el email es correcto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <Card
        className="forgot-card"
        title={<Title level={2} className="forgot-title">Recuperar Contraseña</Title>}
        bordered={false}
      >
        <Form name="forgot-password" onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="Correo electrónico"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Por favor ingrese un correo electrónico válido!' }]}
          >
            <Input type="email" placeholder="Correo electrónico" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} className="colorPrincipal">
              Enviar instrucciones
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ForgotPassword;
