import React from 'react';
import { Modal } from 'antd';
import LandingCalendlyEmbed from './LandingCalendlyEmbed';
import './LandingCalendlyModal.css';

const LandingCalendlyModal = ({ open, onClose }) => (
  <Modal
    title={null}
    open={open}
    onCancel={onClose}
    footer={null}
    width={980}
    centered={false}
    destroyOnClose
    className="landing-calendly-modal"
    wrapClassName="landing-calendly-modal-wrap"
    style={{ top: 20, paddingBottom: 0 }}
    styles={{
      body: { padding: 0, overflow: 'visible', flex: 1, minHeight: 0 },
      content: { overflow: 'visible', padding: 0, display: 'flex', flexDirection: 'column' },
    }}
  >
    <header className="landing-calendly-modal__header">
      <div className="landing-calendly-modal__header-text">
        <span className="landing-calendly-modal__eyebrow">Demo gratuita</span>
        <h2 className="landing-calendly-modal__title">Reserva tu sesión con Timecor</h2>
        <p className="landing-calendly-modal__subtitle">
          Sin coste ni compromiso · Te mostramos la plataforma en directo
        </p>
      </div>
      <span className="landing-calendly-modal__badge" aria-hidden="true">
        30 min
      </span>
    </header>
    {open && (
      <LandingCalendlyEmbed
        hideDetails
        resize
        className="landing-calendly-embed--modal"
      />
    )}
  </Modal>
);

export default LandingCalendlyModal;
