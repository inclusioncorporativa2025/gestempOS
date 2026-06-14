import React, { useEffect, useState } from 'react';
import { Col, Form, Input, Row, Spin, message } from 'antd';
import GradientButton from '../../components/shared/GradientButton';
import { editMiPerfil, getMiPerfil } from '../../../features/user/usuarioService';
import { useAuth } from '../../../config/AuthContext';
import './Configuracion.css';

const labelTipoUsuario = (tipo) => {
  const n = Number(tipo);
  if (n === 1) return 'Super-admin';
  if (n === 2) return 'Admin de plataforma';
  if (n === 3) return 'Administrador';
  if (n === 4) return 'Supervisor';
  if (n === 5) return 'Empleado';
  if (n === 6) return 'Inspector';
  return 'Usuario';
};

const ConfiguracionUsuario = () => {
  const [form] = Form.useForm();
  const { patchUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cargarPerfil = async () => {
      setLoading(true);
      try {
        const perfil = await getMiPerfil();
        form.setFieldsValue({
          nombre: perfil.nombre,
          email: perfil.email,
          dni: perfil.dni || '',
          tipoUsuario: labelTipoUsuario(perfil.tipo_usuario),
        });
      } catch (error) {
        message.error(error.message || 'No se pudo cargar tu perfil');
      } finally {
        setLoading(false);
      }
    };

    cargarPerfil();
  }, [form]);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = {
        nombre: values.nombre,
        dni: values.dni,
      };

      if (values.contrasenaNueva) {
        payload.contrasenaActual = values.contrasenaActual;
        payload.contrasenaNueva = values.contrasenaNueva;
      }

      const data = await editMiPerfil(payload);
      patchUser({ nombre: data.perfil.nombre });
      form.setFieldsValue({
        contrasenaActual: '',
        contrasenaNueva: '',
        contrasenaConfirmacion: '',
      });
      message.success('Tu perfil se ha actualizado correctamente');
    } catch (error) {
      message.error(error.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="config-empresa-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="config-usuario">
      <Form form={form} layout="vertical" onFinish={handleSave} className="config-empresa-form">
        <section className="config-empresa-block">
          <h3 className="config-empresa-block__title">Datos personales</h3>
          <Row gutter={[16, 0]}>
            <Col xs={24} lg={12}>
              <Form.Item
                name="nombre"
                label="Nombre completo"
                rules={[{ required: true, message: 'Introduce tu nombre' }]}
              >
                <Input placeholder="Tu nombre" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="email" label="Email">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="dni" label="DNI / NIF">
                <Input placeholder="Opcional" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item name="tipoUsuario" label="Rol en la plataforma">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
        </section>

        <section className="config-empresa-block">
          <h3 className="config-empresa-block__title">Cambiar contraseña</h3>
          <p className="config-usuario-hint">
            Déjalo en blanco si no quieres cambiar la contraseña.
          </p>
          <Row gutter={[16, 0]}>
            <Col xs={24} lg={8}>
              <Form.Item name="contrasenaActual" label="Contraseña actual">
                <Input.Password placeholder="Solo si vas a cambiarla" autoComplete="current-password" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={8}>
              <Form.Item
                name="contrasenaNueva"
                label="Nueva contraseña"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || String(value).length >= 8) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mínimo 8 caracteres'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={8}>
              <Form.Item
                name="contrasenaConfirmacion"
                label="Confirmar contraseña"
                dependencies={['contrasenaNueva']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const nueva = getFieldValue('contrasenaNueva');
                      if (!nueva || value === nueva) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Las contraseñas no coinciden'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Repite la nueva contraseña" autoComplete="new-password" />
              </Form.Item>
            </Col>
          </Row>
        </section>

        <div className="config-empresa-actions">
          <GradientButton text="Guardar cambios" type="submit" loading={saving} />
        </div>
      </Form>
    </div>
  );
};

export default ConfiguracionUsuario;
