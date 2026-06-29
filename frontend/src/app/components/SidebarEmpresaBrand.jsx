import React, { useCallback, useEffect, useState } from 'react';
import { Dropdown, Modal, Tooltip, notification } from 'antd';
import { BankOutlined, CheckOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { OPEN_FACTURACION_EVENT } from '../../constants/facturacion';
import { getIdEmpresa, getTipoUsuario, isImpersonating, getPlanId } from '../../utils/authSession';
import { fetchMisEmpresas, doSwitchEmpresa } from '../../features/auth/authService';
import { useAuth } from '../../config/AuthContext';
import { useEmpresaBranding } from '../../hooks/useEmpresaBranding';
import { planIncluyeFeature } from '../../constants/plans';
import FacturacionPanel from './FacturacionPanel';
import './SidebarEmpresaBrand.css';

const TIPOS_MENU_EMPRESA = [1, 2, 3];
const TIPOS_PLATAFORMA = [1, 2];
const TIPO_ADMIN_EMPRESA = 3;

const SidebarEmpresaBrand = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const { refreshSession, impersonating } = useAuth();
  const {
    label,
    nombreEmpresa,
    logoUrl,
    iniciales,
    mostrarLogo,
    onLogoError,
  } = useEmpresaBranding();

  const [facturacionAbierta, setFacturacionAbierta] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [puedeCambiarEmpresa, setPuedeCambiarEmpresa] = useState(false);
  const [cambiandoEmpresa, setCambiandoEmpresa] = useState(false);
  const tipoUsuario = getTipoUsuario();
  const empresaActiva = getIdEmpresa();
  const planId = getPlanId();
  const puedeAnadirEmpresa = TIPOS_PLATAFORMA.includes(tipoUsuario);
  const esPlataforma = TIPOS_PLATAFORMA.includes(tipoUsuario);
  const esAdminEmpresa = Number(tipoUsuario) === TIPO_ADMIN_EMPRESA;
  const puedeGestionarSuscripcion =
    Boolean(empresaActiva) && (esAdminEmpresa || esPlataforma);
  const tieneMultiempresa = planIncluyeFeature(planId, 'multiempresa');
  const tieneVariasEmpresas = puedeCambiarEmpresa && empresas.length > 1
    && (esPlataforma || tieneMultiempresa);
  const puedeVerMenu =
    TIPOS_MENU_EMPRESA.includes(tipoUsuario) || tieneVariasEmpresas;

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

  useEffect(() => {
    const abrir = () => {
      if (puedeGestionarSuscripcion) {
        setFacturacionAbierta(true);
      }
    };
    window.addEventListener(OPEN_FACTURACION_EVENT, abrir);
    return () => window.removeEventListener(OPEN_FACTURACION_EVENT, abrir);
  }, [puedeGestionarSuscripcion]);

  const abrirFacturacion = () => setFacturacionAbierta(true);
  const cerrarFacturacion = () => setFacturacionAbierta(false);

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
    ...(puedeGestionarSuscripcion
      ? [
          {
            key: 'facturacion',
            label: tieneVariasEmpresas
              ? `Suscripción (${nombreEmpresa || label})`
              : 'Suscripción',
            onClick: abrirFacturacion,
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

      {puedeGestionarSuscripcion ? (
        <Modal
          title={
            tieneVariasEmpresas
              ? `Suscripción — ${nombreEmpresa || label}`
              : 'Suscripción'
          }
          open={facturacionAbierta}
          onCancel={cerrarFacturacion}
          footer={null}
          centered
          width={920}
          destroyOnClose
          className="app-sider-facturacion-modal"
        >
          <FacturacionPanel activo={facturacionAbierta} />
        </Modal>
      ) : null}
    </>
  );
};

export default SidebarEmpresaBrand;
