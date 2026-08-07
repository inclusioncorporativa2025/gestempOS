import React, { useState } from 'react';
import { Modal, Form, Input, Button, Typography, Descriptions, notification } from 'antd';
import GradientButton from './shared/GradientButton';
import { useAuth } from '../../config/AuthContext';
import { SUPPORT_EMAIL } from '../../constants/support';
import { enviarMensajeSoporte } from '../../features/support/supportService';
import { etiquetaTipoUsuario } from '../../utils/tipoUsuarioLabel';
import './SupportModal.css';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const SupportModal = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const nombreEmpresa = user?.nombre_empresa || 'Sin empresa asignada';
  const idEmpresa = user?.id_empresa ?? 'N/A';
  const emailUsuario = user?.email || '';
  const nombreUsuario = user?.nombre || 'Usuario';
  const rolUsuario = etiquetaTipoUsuario(user?.tipo_usuario);

  const handleClose = () => {
    if (loading) return;
    form.resetFields();
    onClose();
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await enviarMensajeSoporte(values.mensaje.trim());
      notification.success({
        message: 'Mensaje enviado',
        description: `Soporte recibirá tu consulta y te responderá a ${emailUsuario}.`,
      });
      form.resetFields();
      onClose();
    } catch (error) {
      notification.error({
        message: 'Error al enviar',
        description: error.message || 'Inténtalo de nuevo más tarde.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Contactar con soporte"
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      centered
      width={520}
      zIndex={2000}
      className="support-modal"
      getContainer={() => document.body}
    >
      <Paragraph type="secondary" className="support-modal-intro">
        Describe tu consulta o incidencia. El asunto incluirá los datos de tu empresa para
        agilizar el seguimiento.
      </Paragraph>

      <Descriptions size="small" column={1} bordered className="support-modal-meta">
        <Descriptions.Item label="Empresa">{`${nombreEmpresa} (${idEmpresa})`}</Descriptions.Item>
        <Descriptions.Item label="Usuario">{`${nombreUsuario} — ${rolUsuario}`}</Descriptions.Item>
        <Descriptions.Item label="Tu correo">{emailUsuario}</Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical" onFinish={handleSubmit} className="support-modal-form">
        <Form.Item
          label="Mensaje"
          name="mensaje"
          rules={[
            { required: true, message: 'Escribe tu consulta' },
            { min: 10, message: 'El mensaje debe tener al menos 10 caracteres' },
          ]}
        >
          <TextArea
            rows={5}
            placeholder="Cuéntanos qué necesitas o qué problema has encontrado..."
            maxLength={2000}
            showCount
          />
        </Form.Item>

        <Text type="secondary" className="support-modal-destino">
          Se enviará a <strong>{SUPPORT_EMAIL}</strong>
        </Text>

        <div className="modal-actions">
          <Button className="modal-btn-cancel" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <GradientButton
            type="submit"
            text="Enviar"
            loading={loading}
          />
        </div>
      </Form>
    </Modal>
  );
};

export default SupportModal;
