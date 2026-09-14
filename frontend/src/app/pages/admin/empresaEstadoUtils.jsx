import React from 'react';
import { Tag, Typography } from 'antd';
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
    return <Tag color="gold">Cancelación programada</Tag>;
  }

  return <Tag color="green">Activa</Tag>;
};
