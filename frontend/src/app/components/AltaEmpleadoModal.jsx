import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, notification, message } from 'antd';
import GradientButton from './shared/GradientButton';
import { crearUsuario } from '../../features/user/usuarioService';
import { obtenerJornadas } from '../../features/jornada/jornadaService';
import { mostrarModalLicenciasAgotadas } from '../../features/billing/licenciasAgotadasModal';
import { opcionesTipoHora, TIPO_HORA_INHERIT } from '../../utils/tipoHora';
import { tooltipTipoHoraFormItem } from '../../utils/tipoHoraTooltip';
import JornadaLaboralSelect from './JornadaLaboralSelect';

const { Option } = Select;

const etiquetaTipoUsuario = (tipoUsuario) => {
  if (String(tipoUsuario) === '4') return 'Supervisor';
  if (String(tipoUsuario) === '5') return 'Personal';
  return 'Usuario';
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
      .catch(() => message.error('Error recuperando jornadas laborales'));
  }, [open, form]);

  const completarAlta = async (values, response) => {
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
  };

  const handleFinish = async (values) => {
    setSubmitting(true);
    try {
      const response = await crearUsuario(
        values.email,
        values.nombreCompleto,
        values.dni,
        values.tipoUsuario,
        values.tipoHorario,
        values.tipoHora,
      );

      if (!response.creada) {
        if (response.codigo === 'LICENCIAS_AGOTADAS') {
          mostrarModalLicenciasAgotadas({
            response,
            onAmpliado: async () => {
              const reintento = await crearUsuario(
                values.email,
                values.nombreCompleto,
                values.dni,
                values.tipoUsuario,
                values.tipoHorario,
                values.tipoHora,
              );
              if (!reintento.creada) {
                notification.error({
                  message: reintento.message || 'No se pudo completar el alta tras ampliar licencias',
                });
                return;
              }
              await completarAlta(values, reintento);
            },
          });
        } else {
          notification.error({
            message: response.message,
            description: response.message,
          });
        }
        return;
      }

      await completarAlta(values, response);
    } catch (error) {
      notification.error({
        message: error.message || 'No se pudo dar de alta al personal',
        description: error.codigo
          ? undefined
          : `No se pudo completar el alta para ${values.email}.`,
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
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ tipoHora: TIPO_HORA_INHERIT }}
      >
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
          label="Jornada laboral"
          name="tipoHorario"
          rules={[{ required: true, message: 'Selecciona una jornada laboral' }]}
        >
          <JornadaLaboralSelect
            jornadas={jornadas}
            showTipoHoraSuffix
            onNavigateAway={onClose}
          />
        </Form.Item>

        <Form.Item
          label="Tipo de hora (extra / complementaria / bolsa)"
          name="tipoHora"
          tooltip={tooltipTipoHoraFormItem({ includeHeredar: true })}
        >
          <Select options={opcionesTipoHora} />
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
