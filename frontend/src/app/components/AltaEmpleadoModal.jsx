import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, notification, message } from 'antd';
import GradientButton from './shared/GradientButton';
import { crearUsuario } from '../../features/user/usuarioService';
import { obtenerJornadas } from '../../features/jornada/jornadaService';
import { SUPPORT_EMAIL } from '../../constants/support';

const { Option } = Select;

const etiquetaTipoUsuario = (tipoUsuario) => {
  if (String(tipoUsuario) === '4') return 'Supervisor';
  if (String(tipoUsuario) === '5') return 'Personal';
  return 'Usuario';
};

const mostrarAlertaSinPlazas = (response) => {
  Modal.warning({
    title: 'Sin plazas disponibles',
    content: (
      <div>
        <p>{response?.message || 'No tiene plazas disponibles para dar de alta a más usuarios.'}</p>
        {response?.licencias != null && (
          <p style={{ marginTop: 8 }}>
            Licencias contratadas: <strong>{response.licencias}</strong>
            {' · '}
            En uso: <strong>{response.usadas}</strong>
          </p>
        )}
        <p style={{ marginTop: 12 }}>
          Póngase en contacto con soporte en{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> para solicitar más licencias.
        </p>
      </div>
    ),
    okText: 'Entendido',
  });
};

const AltaEmpleadoModal = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [jornadas, setJornadas] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    obtenerJornadas()
      .then(setJornadas)
      .catch(() => message.error('Error recuperando tipo de jornadas'));
  }, [open, form]);

  const handleFinish = async (values) => {
    setSubmitting(true);
    try {
      const response = await crearUsuario(
        values.email,
        values.nombreCompleto,
        values.dni,
        values.tipoUsuario,
        values.tipoHorario,
      );

      if (!response.creada) {
        if (response.codigo === 'LICENCIAS_AGOTADAS') {
          mostrarAlertaSinPlazas(response);
        } else {
          notification.error({
            message: response.message,
            description: response.message,
          });
        }
        return;
      }

      form.resetFields();
      const tipo = etiquetaTipoUsuario(values.tipoUsuario);

      if (response.emailInvitacionEnviado === false) {
        notification.warning({
          message: `${tipo} "${values.nombreCompleto}" creado, pero no se pudo enviar el email de invitación.`,
          description: 'Puede usar «Olvidé mi contraseña» con su correo para activar la cuenta.',
        });
      } else {
        notification.success({
          message: `${tipo} "${values.nombreCompleto}" creado, se le ha enviado el email de invitación.`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      notification.error({
        message: error.message,
        description: `Error enviando invitación a ${values.email}.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Añadir al personal"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label="Nombre completo"
          name="nombreCompleto"
          rules={[{ required: true, message: 'Introduce el nombre completo' }]}
        >
          <Input placeholder="Nombre y apellidos" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, type: 'email', message: 'Introduce un email válido' }]}
        >
          <Input placeholder="correo@empresa.com" />
        </Form.Item>

        <Form.Item
          label="DNI"
          name="dni"
          rules={[{ required: true, message: 'Introduce el DNI' }]}
        >
          <Input placeholder="DNI / NIE" />
        </Form.Item>

        <Form.Item
          label="Tipo de horario"
          name="tipoHorario"
          rules={[{ required: true, message: 'Selecciona un horario' }]}
        >
          <Select placeholder="Selecciona el horario">
            {jornadas.map((jornada) => (
              <Option key={jornada.id_jornada} value={jornada.id_jornada}>
                {jornada.nombre}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Tipo de usuario"
          name="tipoUsuario"
          rules={[{ required: true, message: 'Selecciona el tipo' }]}
        >
          <Select placeholder="Selecciona el tipo">
            <Option value="5">Personal</Option>
            <Option value="4">Supervisor</Option>
          </Select>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <GradientButton
            type="submit"
            text="Enviar invitación"
            block
            loading={submitting}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AltaEmpleadoModal;
