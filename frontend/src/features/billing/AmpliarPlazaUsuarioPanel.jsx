import React from 'react';
import { Button, Typography } from 'antd';
import { CreditCardOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import { dispatchOpenFacturacion } from '../../constants/facturacion';
import { SUPPORT_EMAIL } from '../../constants/support';
import './AmpliarPlazaUsuarioPanel.css';

const { Text, Title } = Typography;

/**
 * Bloque cuando no hay plazas libres para dar de alta un usuario con licencia.
 */
const AmpliarPlazaUsuarioPanel = ({ estado }) => {
  const usadas = estado?.licencias_usadas ?? 0;
  const contratadas = estado?.licencias ?? 0;
  const licenciasSugeridas = Math.max(contratadas, usadas + 1);
  const puedeAmpliarStripe = Boolean(estado?.puede_ampliar_stripe);
  const esLegacy = Boolean(estado?.es_legacy);

  const irAFacturacion = () => {
    dispatchOpenFacturacion({
      focusLicencias: true,
      licenciasSugeridas: licenciasSugeridas,
    });
  };

  let ctaLabel = 'Configurar plazas en Facturación';
  let ctaProps = { type: 'primary', icon: <CreditCardOutlined />, onClick: irAFacturacion };

  if (puedeAmpliarStripe) {
    ctaLabel = 'Ampliar plaza en Facturación';
  } else if (esLegacy) {
    ctaLabel = 'Solicitar plaza a soporte';
    ctaProps = {
      type: 'primary',
      href: `mailto:${SUPPORT_EMAIL}?subject=Solicitud%20plaza%20usuario%20extra`,
    };
  }

  let descripcionExtra = '';
  if (puedeAmpliarStripe) {
    descripcionExtra = ' En Facturación verás el importe prorrateado antes de confirmar.';
  } else if (esLegacy) {
    descripcionExtra = ' En contrato manual, solicítala a soporte.';
  } else {
    descripcionExtra = ' En Facturación, elige cuántos usuarios accederán y activa la suscripción.';
  }

  return (
    <div className="ampliar-plaza-usuario">
      <div className="ampliar-plaza-usuario__head">
        <ExclamationCircleFilled
          className="ampliar-plaza-usuario__head-icon"
          aria-hidden
        />
        <Title level={5} className="ampliar-plaza-usuario__title">
          No hay plazas libres
        </Title>
      </div>

      <div className="ampliar-plaza-usuario__metrics">
        <div className="ampliar-plaza-usuario__metric">
          <span className="ampliar-plaza-usuario__metric-value">{contratadas}</span>
          <span className="ampliar-plaza-usuario__metric-label">Contratadas</span>
        </div>
        <div className="ampliar-plaza-usuario__metric">
          <span className="ampliar-plaza-usuario__metric-value">{usadas}</span>
          <span className="ampliar-plaza-usuario__metric-label">En uso</span>
        </div>
        <div className="ampliar-plaza-usuario__metric">
          <span className="ampliar-plaza-usuario__metric-value">1</span>
          <span className="ampliar-plaza-usuario__metric-label">Admin gratis</span>
        </div>
      </div>

      <Text type="secondary" className="ampliar-plaza-usuario__lead">
        Para dar de alta a otra persona necesitas <strong>1 plaza</strong>.
        {descripcionExtra}
      </Text>

      <Button block size="large" className="ampliar-plaza-usuario__cta" {...ctaProps}>
        {ctaLabel}
      </Button>
    </div>
  );
};

export default AmpliarPlazaUsuarioPanel;
