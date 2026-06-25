import React, { useCallback, useEffect, useState } from 'react';
import { Dropdown, Modal, Tooltip, Typography, notification } from 'antd';
import { BankOutlined, CheckOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { SUPPORT_EMAIL } from '../../constants/support';
import { getIdEmpresa, getTipoUsuario, isImpersonating, getPlanId } from '../../utils/authSession';
import { fetchMisEmpresas, doSwitchEmpresa } from '../../features/auth/authService';
import { useAuth } from '../../config/AuthContext';
import { useEmpresaBranding } from '../../hooks/useEmpresaBranding';
import { planIncluyeFeature, getPlanLabel } from '../../constants/plans';
import './SidebarEmpresaBrand.css';

const { Text, Paragraph } = Typography;

const TIPOS_MENU_EMPRESA = [1, 2, 3];
const TIPOS_PLATAFORMA = [1, 2];

const SidebarEmpresaBrand = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const { refreshSession, impersonating } = useAuth();
  const {
    label,
    nombreEmpresa,
    licencias,
    planLabel,
    logoUrl,
    iniciales,
    mostrarLogo,
    onLogoError,
  } = useEmpresaBranding();

  const [planAbierto, setPlanAbierto] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [puedeCambiarEmpresa, setPuedeCambiarEmpresa] = useState(false);
  const [cambiandoEmpresa, setCambiandoEmpresa] = useState(false);
  const tipoUsuario = getTipoUsuario();
  const empresaActiva = getIdEmpresa();
  const planId = getPlanId();
  const puedeAnadirEmpresa = TIPOS_PLATAFORMA.includes(tipoUsuario);
  const esPlataforma = TIPOS_PLATAFORMA.includes(tipoUsuario);
  const tieneMultiempresa = planIncluyeFeature(planId, 'multiempresa');
  const tieneVariasEmpresas = puedeCambiarEmpresa && empresas.length > 1
    && (esPlataforma || tieneMultiempresa);
  const puedeVerMenu =
    TIPOS_MENU_EMPRESA.includes(tipoUsuario) || tieneVariasEmpresas;
  const nombrePlan = planLabel || getPlanLabel(planId);

  const cargarEmpresas = useCallback(async () => {
    if (impersonating || isImpersonating()) {
      return;
    }
    try {
      const data = await fetchMisEmpresas();
      setEmpresas(data.empresas || []);
      setPuedeCambiarEmpresa(Boolean(data.puede_cambiar_empresa));
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
              <span className="app-sider-empresa-option">
                <span className="app-sider-empresa-option__name">{empresa.nombre}</span>
                {empresa.id_empresa === empresaActiva ? (
                  <CheckOutlined className="app-sider-empresa-option__check" />
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

  const icono = (
    <span className="app-sider-brand__icon-wrap" aria-hidden="true">
      {mostrarLogo ? (
        <img
          src={logoUrl}
          alt=""
          className="app-sider-brand__logo"
          onError={onLogoError}
        />
      ) : (
        <BankOutlined className="app-sider-brand__icon" />
      )}
    </span>
  );

  const brandContent = (
    <div
      className={[
        'app-sider-brand',
        collapsed ? 'app-sider-brand--collapsed' : '',
        puedeVerMenu ? 'app-sider-brand--interactive' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icono}
      {!collapsed && (
        <>
          <span className="app-sider-brand__label" title={label}>
            {label}
          </span>
          {puedeVerMenu ? (
            <DownOutlined className="app-sider-brand__chevron" aria-hidden="true" />
          ) : null}
        </>
      )}
    </div>
  );

  const trigger =
    puedeVerMenu && !collapsed ? (
      <button
        type="button"
        className="app-sider-brand-trigger"
        aria-haspopup="menu"
        aria-label={`Empresa: ${label}. Cambiar empresa`}
      >
        {brandContent}
      </button>
    ) : (
      brandContent
    );

  const menu = puedeVerMenu ? (
    <Dropdown
      menu={{ items }}
      trigger={['click']}
      placement={collapsed ? 'bottomRight' : 'bottomLeft'}
      overlayClassName="app-sider-empresa-dropdown"
      onOpenChange={(open) => {
        if (open) {
          cargarEmpresas();
        }
      }}
    >
      {collapsed ? (
        <Tooltip title={label} placement="right">
          <button
            type="button"
            className="app-sider-brand-trigger app-sider-brand-trigger--collapsed"
            aria-haspopup="menu"
            aria-label={`Empresa: ${label}. Cambiar empresa`}
          >
            {brandContent}
          </button>
        </Tooltip>
      ) : (
        trigger
      )}
    </Dropdown>
  ) : collapsed ? (
    <Tooltip title={label} placement="right">
      {brandContent}
    </Tooltip>
  ) : (
    brandContent
  );

  return (
    <>
      {menu}

      <Modal
        title="Plan contratado"
        open={planAbierto}
        onCancel={cerrarPlan}
        footer={null}
        centered
        className="app-sider-plan-modal"
      >
        <div className="app-sider-plan-modal__body">
          <Text type="secondary">Empresa</Text>
          <Paragraph className="app-sider-plan-modal__empresa">
            {nombreEmpresa || label}
          </Paragraph>

          <Text type="secondary">Plan contratado</Text>
          <Paragraph className="app-sider-plan-modal__plan">
            {nombrePlan}
          </Paragraph>

          <Text type="secondary">Licencias contratadas</Text>
          <Paragraph className="app-sider-plan-modal__licencias">
            {licencias != null ? licencias : '—'}
          </Paragraph>

          <Paragraph type="secondary" className="app-sider-plan-modal__hint">
            {esPlataforma ? (
              <>
                Para cambiar el plan de una empresa, ve a{' '}
                <strong>Gestión interna → Empresas</strong> y edítala desde el listado.
              </>
            ) : (
              <>
                Para ampliar el plan o cambiar de modalidad, contacta con{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </>
            )}
          </Paragraph>
        </div>
      </Modal>
    </>
  );
};

export default SidebarEmpresaBrand;
