import React from 'react';
import { Modal } from 'antd';
import DemoLeadForm from './DemoLeadForm';
import './LandingDemoFormModal.css';

const LandingDemoFormModal = ({ open, onClose }) => (
  <Modal
    title={null}
    open={open}
    onCancel={onClose}
    footer={null}
    width={640}
    centered
    destroyOnClose
    className="landing-demo-modal"
    wrapClassName="landing-demo-modal-wrap"
  >
    <DemoLeadForm variant="demo" key={open ? 'open' : 'closed'} />
  </Modal>
);

export default LandingDemoFormModal;
