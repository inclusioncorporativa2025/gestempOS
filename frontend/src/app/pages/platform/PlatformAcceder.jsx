import React, { useState } from 'react';
import { Alert, Button, Form, Input, Typography, message } from 'antd';
import { UserSwitchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../../constants/routes';
import { useAuth } from '../../../config/AuthContext';
import { accederComoUsuario } from '../../../features/platform/platformService';
import SelectEmpresaModal from '../../components/SelectEmpresaModal';
import './Platform.css';

const { Text, Paragraph } = Typography;

const rutaInicioPorTipo = (tipo) => {
  if (tipo === 6) return APP_ROUTES.users;
  if ([1, 2].includes(tipo)) return APP_ROUTES.platformEmpresas;
  return APP_ROUTES.home;
};

const PlatformAcceder = () => {
  const [loading, setLoading] = useState(false);
  const [empresasPendientes, setEmpresasPendientes] = useState([]);
  const [emailPendiente, setEmailPendiente] = useState('');
  const [selectorEmpresaOpen, setSelectorEmpresaOpen] = useState(false);
  const { impersonate, impersonating } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const completarAcceso = async (data, emailFallback) => {
    if (!data?.token) {
      throw new Error('No se pudo iniciar el acceso temporal');
    }

    impersonate(data.token);
    message.success(
      `Acceso temporal a ${data.usuario?.nombre || emailFallback} (${data.expiraEn || '1h'})`,
    );
    navigate(rutaInicioPorTipo(Number(data.usuario?.tipo_usuario)));
  };

  const solicitarAcceso = async (email, idEmpresa = null) => {
    const data = await accederComoUsuario(email, idEmpresa);

    if (data?.code === 'EMPRESA_SELECTION_REQUIRED') {
      setEmailPendiente(email);
      setEmpresasPendientes(data.empresas || []);
      setSelectorEmpresaOpen(true);
      return;
    }

    await completarAcceso(data, email);
  };

  const onFinish = async ({ email }) => {
    setLoading(true);
    try {
      await solicitarAcceso(email.trim());
    } catch (error) {
      message.error(error.message || 'No se pudo acceder a la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const onSeleccionarEmpresa = async (idEmpresa) => {
    setLoading(true);
    try {
      await solicitarAcceso(emailPendiente, idEmpresa);
      setSelectorEmpresaOpen(false);
      setEmpresasPendientes([]);
      setEmailPendiente('');
    } catch (error) {
      message.error(error.message || 'No se pudo acceder a la cuenta');
    } finally {
      setLoading(false);
    }
  };

  if (impersonating) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Ya estás en una sesión suplantada"
        description="Cierra la sesión actual con «Volver a mi cuenta» antes de acceder a otra."
      />
    );
  }

  return (
    <div className="platform-acceder">
      <div className="platform-acceder__intro">
        <UserSwitchOutlined className="platform-acceder__icon" />
        <Text strong>Acceso temporal a cuenta de usuario</Text>
        <Paragraph type="secondary" className="platform-acceder__desc">
          Introduce el correo del usuario para acceder temporalmente a su cuenta. La sesión
          expira automáticamente. ROOT puede acceder a cualquier cuenta, incluidas inactivas
          o de administración de plataforma.
        </Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        className="platform-acceder__form"
      >
        <Form.Item
          name="email"
          label="Correo del usuario"
          rules={[
            { required: true, message: 'Introduce el correo' },
            { type: 'email', message: 'Correo no válido' },
          ]}
        >
          <Input placeholder="usuario@empresa.com" autoComplete="off" />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading}>
          Acceder a la cuenta
        </Button>
      </Form>

      <SelectEmpresaModal
        open={selectorEmpresaOpen}
        empresas={empresasPendientes}
        loading={loading}
        title="Selecciona la empresa"
        subtitle="El usuario pertenece a varias empresas. Elige con cuál acceder temporalmente."
        onSelect={onSeleccionarEmpresa}
        onCancel={() => {
          setSelectorEmpresaOpen(false);
          setEmpresasPendientes([]);
          setEmailPendiente('');
        }}
      />
    </div>
  );
};

export default PlatformAcceder;
