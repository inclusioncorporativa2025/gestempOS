import React, { useState } from 'react';
import { Dropdown, Modal, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { SUPPORT_EMAIL } from '../../constants/support';
import { getTipoUsuario } from '../../utils/authSession';
import './HeaderEmpresaMenu.css';

const { Text, Paragraph } = Typography;

const TIPOS_PLATAFORMA = [1, 2];

const HeaderEmpresaMenu = ({
  label,
  nombreEmpresa,
  licencias,
  logoUrl,
  iniciales,
  mostrarLogo,
  onLogoError,
}) => {
  const navigate = useNavigate();
  const [planAbierto, setPlanAbierto] = useState(false);
  const puedeAnadirEmpresa = TIPOS_PLATAFORMA.includes(getTipoUsuario());

  const abrirPlan = () => setPlanAbierto(true);
  const cerrarPlan = () => setPlanAbierto(false);

  const irAnadirEmpresa = () => {
    navigate(APP_ROUTES.companies, { state: { abrirAltaEmpresa: true } });
  };

  const items = [
    {
      key: 'plan',
      label: 'Ver plan contratado',
      onClick: abrirPlan,
    },
    ...(puedeAnadirEmpresa
      ? [
          {
            key: 'anadir-empresa',
            label: 'Añadir empresa',
            onClick: irAnadirEmpresa,
          },
        ]
      : []),
  ];

  const logo = (
    <span className="app-header-logo" aria-hidden="true">
      {mostrarLogo ? (
        <img
          src={logoUrl}
          alt=""
          className="app-header-logo__img"
          onError={onLogoError}
        />
      ) : (
        <span className="app-header-logo__initials">{iniciales}</span>
      )}
    </span>
  );

  const trigger = (
    <button type="button" className="app-header-profile" aria-haspopup="menu">
      {logo}
      <span className="app-header-profile-name">{label}</span>
      <DownOutlined className="app-header-profile-chevron" />
    </button>
  );

  return (
    <>
      <Dropdown
        menu={{ items }}
        trigger={['click']}
        placement="bottomRight"
        overlayClassName="app-header-empresa-dropdown"
      >
        {trigger}
      </Dropdown>

      <Modal
        title="Plan contratado"
        open={planAbierto}
        onCancel={cerrarPlan}
        footer={null}
        centered
        className="app-header-plan-modal"
      >
        <div className="app-header-plan-modal__body">
          <Text type="secondary">Empresa</Text>
          <Paragraph className="app-header-plan-modal__empresa">
            {nombreEmpresa || label}
          </Paragraph>

          <Text type="secondary">Licencias contratadas</Text>
          <Paragraph className="app-header-plan-modal__licencias">
            {licencias != null ? licencias : '—'}
          </Paragraph>

          <Paragraph type="secondary" className="app-header-plan-modal__hint">
            Para ampliar el plan o cambiar de modalidad, contacta con{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </Paragraph>
        </div>
      </Modal>
    </>
  );
};

export default HeaderEmpresaMenu;
