// src/pages/ForgotPassword.js
import React from 'react';
import { Form, Input, Button, Typography, Card, message } from 'antd';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

const { Title } = Typography;

const ForgotPassword = () => {
  const handleSubmit = async (values) => {
    try {
      await sendPasswordResetEmail(auth, values.email);
      message.success('Se ha enviado un correo para recuperar tu contraseña');
    } catch (error) {
      message.error('Error al enviar el correo. Comprueba que el email es correcto.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card
        style={{ width: 400 }}
        title={<Title level={2} style={{ textAlign: 'center' }}>Recuperar Contraseña</Title>}
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
            <Button type="primary" htmlType="submit" block className="colorPrincipal"> 
              Enviar instrucciones
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ForgotPassword;
