import React, { useCallback, useEffect, useState } from 'react';
import { Dropdown, Modal, Typography, notification } from 'antd';
import { CheckOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { SUPPORT_EMAIL } from '../../constants/support';
import { getIdEmpresa, getTipoUsuario, isImpersonating } from '../../utils/authSession';
import { fetchMisEmpresas, doSwitchEmpresa } from '../../features/auth/authService';
import { useAuth } from '../../config/AuthContext';
import './HeaderEmpresaMenu.css';

const { Text, Paragraph } = Typography;

const TIPOS_MENU_EMPRESA = [1, 2, 3];
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
  const { refreshSession, impersonating } = useAuth();
  const [planAbierto, setPlanAbierto] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [cambiandoEmpresa, setCambiandoEmpresa] = useState(false);
  const tipoUsuario = getTipoUsuario();
  const empresaActiva = getIdEmpresa();
  const puedeAnadirEmpresa = TIPOS_PLATAFORMA.includes(tipoUsuario);
  const tieneVariasEmpresas = empresas.length > 1;
  const puedeVerMenu =
    TIPOS_MENU_EMPRESA.includes(tipoUsuario) || tieneVariasEmpresas;

  const cargarEmpresas = useCallback(async () => {
    if (impersonating || isImpersonating()) {
      return;
    }
    try {
      const data = await fetchMisEmpresas();
      setEmpresas(data.empresas || []);
    } catch {
      setEmpresas([]);
    }
  }, [impersonating]);

  useEffect(() => {
    if (empresaActiva) {
      cargarEmpresas();
    }
  }, [empresaActiva, cargarEmpresas]);

  const abrirPlan = () => setPlanAbierto(true);
  const cerrarPlan = () => setPlanAbierto(false);

  const irAnadirEmpresa = () => {
    navigate(APP_ROUTES.platformEmpresas, { state: { abrirAltaEmpresa: true } });
  };

  const cambiarEmpresa = async (idEmpresa) => {
    if (idEmpresa === empresaActiva || cambiandoEmpresa) {
      return;
    }

    setCambiandoEmpresa(true);
    try {
      const data = await doSwitchEmpresa(idEmpresa);
      refreshSession(data.token);
      notification.success({
        message: 'Empresa cambiada',
        description: `Ahora estás en ${data.empresa?.nombre || 'la empresa seleccionada'}`,
      });
      navigate(APP_ROUTES.home, { replace: true });
      window.location.reload();
    } catch (error) {
      notification.error({
        message: 'No se pudo cambiar de empresa',
        description: error.message,
      });
    } finally {
      setCambiandoEmpresa(false);
    }
  };

  const items = [
    ...(tieneVariasEmpresas
      ? [
          { key: 'cambiar-empresa-title', type: 'group', label: 'Cambiar empresa' },
          ...empresas.map((empresa) => ({
            key: `empresa-${empresa.id_empresa}`,
            label: (
              <span className="app-header-empresa-option">
                <span className="app-header-empresa-option__name">{empresa.nombre}</span>
                {empresa.id_empresa === empresaActiva ? (
                  <CheckOutlined className="app-header-empresa-option__check" />
                ) : null}
              </span>
            ),
            onClick: () => cambiarEmpresa(empresa.id_empresa),
          })),
          { type: 'divider' },
        ]
      : []),
    ...(TIPOS_MENU_EMPRESA.includes(tipoUsuario)
      ? [
          {
            key: 'plan',
            label: 'Ver plan contratado',
            onClick: abrirPlan,
          },
        ]
      : []),
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

  const trigger = puedeVerMenu ? (
    <button type="button" className="app-header-profile" aria-haspopup="menu">
      {logo}
      <span className="app-header-profile-name">{label}</span>
      <DownOutlined className="app-header-profile-chevron" />
    </button>
  ) : (
    <span className="app-header-profile app-header-profile--static">
      {logo}
      <span className="app-header-profile-name">{label}</span>
    </span>
  );

  return (
    <>
      {puedeVerMenu ? (
        <Dropdown
          menu={{ items }}
          trigger={['click']}
          placement="bottomRight"
          overlayClassName="app-header-empresa-dropdown"
          onOpenChange={(open) => {
            if (open) {
              cargarEmpresas();
            }
          }}
        >
          {trigger}
        </Dropdown>
      ) : (
        trigger
      )}

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
