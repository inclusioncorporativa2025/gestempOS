import React, { useState } from 'react';
import { Modal, List, Typography, notification } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import GradientButton from './shared/GradientButton';
import './SelectEmpresaModal.css';

const { Text, Title } = Typography;

const SelectEmpresaModal = ({
  open,
  empresas = [],
  loading = false,
  onSelect,
  onCancel,
  title = 'Selecciona tu empresa',
  subtitle = 'Tu cuenta está vinculada a varias empresas. Elige con cuál deseas acceder.',
}) => {
  const [seleccionada, setSeleccionada] = useState(null);

  const handleConfirmar = async () => {
    if (!seleccionada) {
      notification.warning({ message: 'Selecciona una empresa para continuar' });
      return;
    }
    await onSelect(seleccionada);
  };

  const handleCancel = () => {
    setSeleccionada(null);
    onCancel?.();
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={handleCancel}
      footer={null}
      centered
      destroyOnClose
      className="select-empresa-modal"
      width={480}
    >
      <div className="select-empresa-modal__header">
        <Title level={4} className="select-empresa-modal__title">
          {title}
        </Title>
        <Text type="secondary">{subtitle}</Text>
      </div>

      <List
        className="select-empresa-modal__list"
        dataSource={empresas}
        renderItem={(empresa) => {
          const activa = seleccionada === empresa.id_empresa;
          return (
            <List.Item
              className={`select-empresa-modal__item${activa ? ' select-empresa-modal__item--active' : ''}`}
              onClick={() => setSeleccionada(empresa.id_empresa)}
            >
              <div className="select-empresa-modal__item-content">
                <BankOutlined className="select-empresa-modal__icon" />
                <div>
                  <Text strong>{empresa.nombre}</Text>
                  {empresa.alias ? (
                    <Text type="secondary" className="select-empresa-modal__alias">
                      {empresa.alias}
                    </Text>
                  ) : null}
                </div>
              </div>
            </List.Item>
          );
        }}
      />

      <GradientButton
        type="button"
        text="Continuar"
        block
        loading={loading}
        onClick={handleConfirmar}
      />
    </Modal>
  );
};

export default SelectEmpresaModal;
