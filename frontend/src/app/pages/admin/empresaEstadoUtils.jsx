import React from 'react';
import { Tag, Tooltip, Typography } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

export const empresaDadaDeBaja = (record) =>
  Boolean(record?.fecha_baja) || record?.activo === 0 || record?.activo === false;

export const trialSinSuscripcion = (record) =>
  String(record?.modo_facturacion || '').toLowerCase() === 'trial'
  && !record?.stripe_subscription_id;

export const trialExpiradoSinSuscripcion = (record) => {
  if (!trialSinSuscripcion(record) || !record?.trial_ends_at) return false;
  return new Date(record.trial_ends_at) <= new Date();
};

export const trialActivoSinTarjeta = (record) =>
  trialSinSuscripcion(record) && !trialExpiradoSinSuscripcion(record);

export const empresaFacturacionBloquea = (record) => {
  const estado = String(record?.estado_suscripcion || '').toLowerCase();
  const modo = String(record?.modo_facturacion || '').toLowerCase();

  if (estado === 'canceled') return true;
  if (modo === 'pendiente_pago') return true;
  if (trialExpiradoSinSuscripcion(record)) return true;

  if (estado === 'trialing' && record?.trial_ends_at) {
    if (new Date(record.trial_ends_at) <= new Date()) return true;
  }

  if (
    modo === 'stripe' &&
    estado &&
    !['active', 'trialing', 'past_due'].includes(estado)
  ) {
    return true;
  }

  return false;
};

export const empresaEstaActiva = (record) =>
  !empresaDadaDeBaja(record) && !empresaFacturacionBloquea(record);

export const empresaRequiereEnlacePago = (record) =>
  record?.requiere_enlace_pago === 1
  || record?.requiere_enlace_pago === true
  || String(record?.modo_facturacion || '').toLowerCase() === 'pendiente_pago'
  || trialExpiradoSinSuscripcion(record);

export const empresaPuedeAmpliarPrueba = (record) => {
  const modo = String(record?.modo_facturacion || '').toLowerCase();
  const estado = String(record?.estado_suscripcion || '').toLowerCase();

  if (modo === 'legacy') return false;
  if (modo === 'trial') return true;
  if (estado === 'trialing') return true;

  return false;
};

export const empresaGestionadaStripe = (record) => {
  const modo = String(record?.modo_facturacion || '').toLowerCase();
  if (modo !== 'stripe') return false;
  if (record?.stripe_subscription_id) return true;
  const estado = String(record?.estado_suscripcion || '').toLowerCase();
  return ['active', 'trialing', 'past_due'].includes(estado);
};

/** En prueba (trial o Stripe trialing vigente), sin contar bajas */
export const empresaEnPruebaListado = (record) => {
  if (empresaDadaDeBaja(record)) return false;
  if (trialActivoSinTarjeta(record)) return true;
  const estado = String(record?.estado_suscripcion || '').toLowerCase();
  if (estado !== 'trialing') return false;
  if (record?.trial_ends_at && new Date(record.trial_ends_at) <= new Date()) return false;
  return true;
};

/** Pendiente de pago / cobro (incluye sin acceso operativo) */
export const empresaPtePagoListado = (record) => {
  if (empresaDadaDeBaja(record)) return false;
  const estado = String(record?.estado_suscripcion || '').toLowerCase();
  const modo = String(record?.modo_facturacion || '').toLowerCase();
  if (estado === 'past_due') return true;
  if (modo === 'pendiente_pago') return true;
  if (trialExpiradoSinSuscripcion(record)) return true;
  return false;
};

/** Activa gestionada por Stripe (excluye prueba y pago pendiente) */
export const empresaStripeActivaListado = (record) => {
  if (!empresaEstaActiva(record)) return false;
  if (empresaEnPruebaListado(record)) return false;
  if (String(record?.estado_suscripcion || '').toLowerCase() === 'past_due') return false;
  return empresaGestionadaStripe(record);
};

const normalizarLast4Tarjeta = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(-4);
  return digits.length === 4 ? digits : null;
};

export const etiquetaCicloFacturacionEmpresa = (record) => {
  const ciclo = String(record?.ciclo_facturacion || '').toLowerCase();
  if (ciclo === 'anual') return 'Anual';
  if (ciclo === 'mensual') return 'Mensual';
  const modo = String(record?.modo_facturacion || '').toLowerCase();
  if (modo === 'legacy') return 'Anual (manual)';
  return null;
};

export const etiquetaFacturacionEmpresa = (record) => {
  const ciclo = etiquetaCicloFacturacionEmpresa(record);
  if (!ciclo) return null;
  return `Facturación: ${ciclo}`;
};

const tooltipGestionadoStripe = (record) => {
  const last4 = normalizarLast4Tarjeta(record?.stripe_card_last4);
  if (last4) {
    return `Gestionado por Stripe · ···· ${last4}`;
  }
  return 'Gestionado por Stripe';
};

const renderIconoStripe = (record) => {
  if (!empresaGestionadaStripe(record)) return null;
  const titulo = tooltipGestionadoStripe(record);
  return (
    <Tooltip title={titulo}>
      <CreditCardOutlined
        className="empresa-estado-stripe-icon"
        aria-label={titulo}
      />
    </Tooltip>
  );
};

export const formatProximaRenovacionEmpresa = (record) => {
  const raw = record?.current_period_end;
  if (!raw) return null;
  const fecha = dayjs(raw);
  if (!fecha.isValid()) return null;
  return fecha.format('DD/MM/YYYY');
};

const renderRenovacionDebajo = (record, { prefijo = 'Renovación' } = {}) => {
  const label = formatProximaRenovacionEmpresa(record);
  if (!label) return null;
  return (
    <Text type="secondary" className="empresa-estado-renovacion">
      {prefijo}
      :
      {' '}
      {label}
    </Text>
  );
};

const renderEnPrueba = (record) => (
  <div>
    <Tag color="blue">En prueba</Tag>
    {record?.trial_ends_at && (
      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
        Finaliza el {dayjs(record.trial_ends_at).format('DD/MM/YYYY')}
      </Text>
    )}
  </div>
);

const renderActiva = (record) => (
  <div className="empresa-estado-cell">
    <div className="empresa-estado-cell__head">
      <Tag color="green">Activa</Tag>
      {renderIconoStripe(record)}
    </div>
    {renderRenovacionDebajo(record)}
  </div>
);

export const renderEstadoEmpresa = (record) => {
  if (empresaDadaDeBaja(record)) {
    return <Tag color="default">De baja</Tag>;
  }

  const estado = String(record?.estado_suscripcion || '').toLowerCase();
  const modo = String(record?.modo_facturacion || '').toLowerCase();

  if (estado === 'canceled') {
    return <Tag color="red">Suscripción cancelada</Tag>;
  }
  if (trialActivoSinTarjeta(record)) {
    return renderEnPrueba(record);
  }
  if (trialExpiradoSinSuscripcion(record)) {
    return <Tag color="orange">Pendiente de pago</Tag>;
  }
  if (modo === 'pendiente_pago') {
    return <Tag color="orange">Pendiente de pago</Tag>;
  }
  if (estado === 'trialing') {
    return renderEnPrueba(record);
  }
  if (estado === 'past_due') {
    return <Tag color="orange">Pago pendiente</Tag>;
  }
  if (record?.cancel_at_period_end) {
    return (
      <div className="empresa-estado-cell">
        <Tag color="gold">Cancelación programada</Tag>
        {renderRenovacionDebajo(record, { prefijo: 'Acceso hasta' })}
      </div>
    );
  }

  return renderActiva(record);
};
