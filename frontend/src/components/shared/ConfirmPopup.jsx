import React from 'react';
import { Modal, Button, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import './ConfirmPopup.css';

const { Title } = Typography;

const VARIANTS = {
  entrada: 'entrada',
  salida: 'salida',
  descanso: 'descanso',
  'fin-descanso': 'fin-descanso',
  logout: 'logout',
};

/**
 * Modal de confirmación reutilizable (sin icono de advertencia por defecto).
 *
 * @param {boolean} open
 * @param {() => void} onCancel
 * @param {() => void | Promise<void>} onConfirm
 * @param {string} title - Título del modal
 * @param {React.ReactNode} message - Cuerpo (texto o JSX)
 * @param {Array<{ label?: string, value: React.ReactNode }>} meta - Filas informativas (hora, ubicación…)
 * @param {React.ComponentType} icon - Icono Ant Design opcional
 * @param {'entrada'|'salida'|'descanso'|'fin-descanso'|string} variant - Acento visual
 * @param {string} confirmText
 * @param {string} cancelText
 * @param {boolean} confirmLoading
 * @param {boolean} destroyOnClose
 */
const ConfirmPopup = ({
  open,
  onCancel,
  onConfirm,
  title = 'Confirmar',
  message,
  meta = [],
  icon: IconProp,
  variant = 'entrada',
  confirmText = 'Sí, confirmar',
  cancelText = 'Cancelar',
  confirmLoading = false,
  destroyOnClose = true,
}) => {
  const variantKey = VARIANTS[variant] ? variant : 'entrada';
  const Icon = IconProp || QuestionCircleOutlined;

  const handleConfirm = async () => {
    await onConfirm?.();
  };

  return (
    <Modal
      className="confirm-popup"
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      closable
      destroyOnClose={destroyOnClose}
      width={400}
      maskClosable={!confirmLoading}
    >
      <div className="confirm-popup-body">
        <div className={`confirm-popup-icon confirm-popup-icon--${variantKey}`}>
          <Icon />
        </div>

        <Title level={4} className="confirm-popup-title">
          {title}
        </Title>

        {message && <div className="confirm-popup-message">{message}</div>}

        {meta.length > 0 && (
          <div className="confirm-popup-meta">
            {meta.map((item, index) => (
              <div key={item.label || index} className="confirm-popup-meta-row">
                {item.label && <span>{item.label}:</span>}
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="confirm-popup-footer">
        <Button
          className="confirm-popup-btn-cancel"
          onClick={onCancel}
          disabled={confirmLoading}
        >
          {cancelText}
        </Button>
        <Button
          type="primary"
          className={`confirm-popup-btn-confirm confirm-popup-btn-confirm--${variantKey}`}
          loading={confirmLoading}
          onClick={handleConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmPopup;
