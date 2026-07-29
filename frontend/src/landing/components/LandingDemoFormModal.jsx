import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Modal, Form, Input, Select, DatePicker, Button, Checkbox, message, ConfigProvider,
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import 'dayjs/locale/es';
import esES from 'antd/locale/es_ES';
import { LANDING_ROUTES } from '../../constants/routes';
import { submitDemoLead } from '../utils/submitDemoLead';
import './LandingDemoFormModal.css';

dayjs.extend(updateLocale);
dayjs.locale('es');
dayjs.updateLocale('es', { weekStart: 1 });
const BUSINESS_TYPES = [
  'Empresa con personal',
  'Autónomo',
  'Asesoría o gestoría',
  'Startup / PYME',
  'Otro',
];

const TEAM_SIZES = [
  '1-5',
  '6-20',
  '21-50',
  '51-100',
  'Más de 100',
];

const TIME_SLOTS = Array.from({ length: 8 }, (_, index) => {
  const totalMinutes = 9 * 60 + 30 + index * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
});

const disabledDate = (current) => {
  if (!current) return false;
  const day = current.day();
  return current.isBefore(dayjs().startOf('day')) || day === 0 || day === 6;
};

const LandingDemoFormModal = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState('');

  const timeOptions = useMemo(
    () => TIME_SLOTS.map((slot) => ({ value: slot, label: slot })),
    [],
  );

  const handleClose = () => {
    setSubmitted(false);
    setConfirmedSlot('');
    form.resetFields();
    onClose();
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const fechaDemo = values.fecha_demo.format('YYYY-MM-DD');
      await submitDemoLead({
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        email: values.email.trim(),
        telefono: values.telefono.trim(),
        tipo_negocio: values.tipo_negocio || '',
        num_empleados: values.num_empleados || '',
        fecha_demo: fechaDemo,
        hora_demo: values.hora_demo,
        consentimiento_rgpd: Boolean(values.consent),
      });

      setConfirmedSlot(`${values.fecha_demo.locale('es').format('DD/MM/YYYY')} · ${values.hora_demo}`);
      setSubmitted(true);
      message.success('Demo reservada correctamente');
    } catch (error) {
      message.error(
        error.status === 503
          ? 'Reservas temporalmente no disponibles. Inténtalo más tarde.'
          : 'No se pudo completar la reserva. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ConfigProvider locale={esES}>
    <Modal
      title={null}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={640}
      centered
      destroyOnClose
      className="landing-demo-modal"
      wrapClassName="landing-demo-modal-wrap"
    >
      {submitted ? (
        <div className="landing-demo-modal__success">
          <CheckCircleOutlined className="landing-demo-modal__success-icon" aria-hidden />
          <h2 className="landing-demo-modal__title">¡Demo reservada!</h2>
          <p className="landing-demo-modal__intro">
            Hemos recibido tu solicitud. Te contactaremos en
            {' '}
            <strong>{confirmedSlot}</strong>
            {' '}
            (hora peninsular).
          </p>
          <p className="landing-demo-modal__note">
            Recibirás un correo de confirmación en breve.
          </p>
          <Button
            type="primary"
            block
            size="large"
            className="landing-cta-start landing-hero-cta-primary landing-demo-modal__submit"
            onClick={handleClose}
          >
            Cerrar
          </Button>
        </div>
      ) : (
        <>
          <header className="landing-demo-modal__header">
            <p className="landing-demo-modal__eyebrow">Demo gratuita</p>
            <h2 className="landing-demo-modal__title">Reserva tu demo personalizada</h2>
            <p className="landing-demo-modal__intro">
              Elige el día y la hora que mejor te venga y te enseñamos cómo Timecor
              puede ayudarte a cumplir la normativa de fichaje.
            </p>
          </header>

          <Form
            form={form}
            layout="vertical"
            className="landing-demo-modal__form"
            onFinish={handleSubmit}
            requiredMark="optional"
          >
            <Form.Item
              name="nombre"
              label="Nombre"
              required
              rules={[{ required: true, message: 'Indica tu nombre' }]}
            >
              <Input placeholder="Tu nombre" size="large" />
            </Form.Item>

            <Form.Item
              name="apellidos"
              label="Apellidos"
              required
              rules={[{ required: true, message: 'Indica tus apellidos' }]}
            >
              <Input placeholder="Tus apellidos" size="large" />
            </Form.Item>
            <div className="landing-demo-modal__row">
              <Form.Item
                name="email"
                label="Correo electrónico"
                required
                rules={[
                  { required: true, message: 'Indica tu email' },
                  { type: 'email', message: 'Email no válido' },
                ]}
              >
                <Input placeholder="ejemplo@gmail.com" size="large" inputMode="email" />
              </Form.Item>

              <Form.Item
                name="telefono"
                label="Teléfono"
                required
                rules={[{ required: true, message: 'Indica tu teléfono' }]}
              >
                <Input placeholder="+34 600 000 000" size="large" inputMode="tel" />
              </Form.Item>
            </div>

            <Form.Item
              name="tipo_negocio"
              label="¿Qué tipo de negocio tienes?"
            >
              <Select
                placeholder="Selecciona una opción (opcional)"
                size="large"
                allowClear
                options={BUSINESS_TYPES.map((value) => ({ value, label: value }))}
              />
            </Form.Item>

            <Form.Item name="num_empleados" label="¿Cuánto personal tiene tu empresa?">
              <Select
                placeholder="Selecciona una opción (opcional)"
                size="large"
                allowClear
                options={TEAM_SIZES.map((value) => ({ value, label: value }))}
              />
            </Form.Item>

            <div className="landing-demo-modal__row">
              <Form.Item
                name="fecha_demo"
                label="Elige el día"
                required
                rules={[{ required: true, message: 'Selecciona un día' }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Selecciona un día"
                  size="large"
                  disabledDate={disabledDate}
                  className="landing-demo-modal__date"
                  inputReadOnly
                />
              </Form.Item>

              <Form.Item
                name="hora_demo"
                label="Elige la hora"
                required
                rules={[{ required: true, message: 'Selecciona una franja' }]}
              >
                <Select
                  placeholder="Selecciona una franja"
                  size="large"
                  options={timeOptions}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="consent"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) => (
                    value
                      ? Promise.resolve()
                      : Promise.reject(new Error('Debes aceptar los términos y la política de privacidad'))
                  ),
                },
              ]}
            >
              <Checkbox className="landing-demo-modal__consent">
                Acepto los{' '}
                <Link to={LANDING_ROUTES.terms} target="_blank" rel="noopener noreferrer">
                  Términos y condiciones
                </Link>
                {' '}y la{' '}
                <Link to={LANDING_ROUTES.privacy} target="_blank" rel="noopener noreferrer">
                  Política de privacidad
                </Link>
              </Checkbox>
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
              className="landing-cta-start landing-hero-cta-primary landing-demo-modal__submit"
            >
              Reservar mi demo
            </Button>

            <p className="landing-demo-modal__footer-note">
              Sin compromiso · Gratis · Online
            </p>
          </Form>
        </>
      )}
    </Modal>
    </ConfigProvider>
  );
};

export default LandingDemoFormModal;
