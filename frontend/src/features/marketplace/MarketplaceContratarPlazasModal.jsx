import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  InputNumber,
  Modal,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import {
  MARKETPLACE_MAX_PLAZAS,
  MARKETPLACE_MIN_PLAZAS,
} from '../../constants/marketplace';
import {
  contratarPlazasModulo,
  previewContratarPlazasModulo,
} from './marketplaceService';
import './MarketplaceContratarPlazasModal.css';

const { Text, Paragraph } = Typography;

const formatEuro = (amount) =>
  Number(amount).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const MarketplaceContratarPlazasModal = ({
  open,
  onClose,
  codigoModulo,
  nombreModulo,
  precioMensualEur,
  plazasActuales = 0,
  idEmpresa,
  onContratado,
}) => {
  const [plazasAnadir, setPlazasAnadir] = useState(1);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const previewRequestId = useRef(0);

  const plazasObjetivo = Number(plazasActuales) + Number(plazasAnadir || 1);
  const esPrimeraContratacion = Number(plazasActuales) < MARKETPLACE_MIN_PLAZAS;

  const precioLabel = useMemo(() => {
    const precio = Number(precioMensualEur);
    if (!Number.isFinite(precio) || precio <= 0) return null;
    return formatEuro(precio);
  }, [precioMensualEur]);

  useEffect(() => {
    if (!open) {
      setPlazasAnadir(1);
      setPreview(null);
      setPreviewLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !codigoModulo || plazasAnadir < 1) {
      setPreview(null);
      setPreviewLoading(false);
      return undefined;
    }

    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const data = await previewContratarPlazasModulo({
          idEmpresa,
          codigoModulo,
          plazas: plazasObjetivo,
        });
        if (previewRequestId.current === requestId) {
          setPreview(data.preview ?? null);
        }
      } catch (error) {
        if (previewRequestId.current === requestId) {
          setPreview(null);
          if (error.code !== 'MARKETPLACE_PLAZAS_SIN_CAMBIO') {
            message.error(error.message || 'No se pudo calcular el importe');
          }
        }
      } finally {
        if (previewRequestId.current === requestId) {
          setPreviewLoading(false);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [open, codigoModulo, idEmpresa, plazasAnadir, plazasObjetivo]);

  const ejecutarContratar = async () => {
    setSubmitting(true);
    try {
      const result = await contratarPlazasModulo({
        idEmpresa,
        codigoModulo,
        plazas: plazasObjetivo,
      });
      message.success(
        esPrimeraContratacion
          ? `Módulo contratado con ${plazasObjetivo} plaza${plazasObjetivo === 1 ? '' : 's'}.`
          : `Plazas ampliadas a ${plazasObjetivo}. Stripe cargará el prorrateo.`,
      );
      onClose?.();
      await onContratado?.(result);
    } catch (error) {
      message.error(error.message || 'No se pudo contratar');
    } finally {
      setSubmitting(false);
    }
  };

  const titulo = esPrimeraContratacion
    ? `Contratar ${nombreModulo || 'módulo'}`
    : 'Ampliar plazas del módulo';

  return (
    <Modal
      title={titulo}
      open={open}
      onCancel={onClose}
      width={520}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancelar
        </Button>,
        <Button
          key="ok"
          type="primary"
          loading={submitting}
          disabled={previewLoading || !preview || plazasAnadir < 1}
          onClick={ejecutarContratar}
        >
          {esPrimeraContratacion ? 'Contratar y pagar prorrateo' : 'Confirmar ampliación'}
        </Button>,
      ]}
    >
      <Space direction="vertical" size={16} className="mp-contratar-plazas">
        <Paragraph className="mp-contratar-plazas__lead">
          {esPrimeraContratacion ? (
            <>
              Elige cuántas plazas quieres contratar. Cada plaza permite asignar el módulo a
              {' '}
              <Text strong>un usuario</Text>
              {precioLabel ? (
                <>
                  {' '}
                  (
                  {precioLabel}
                  {' '}
                  € / usuario / mes, alineado con tu ciclo de facturación)
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              Tienes
              {' '}
              <Text strong>{plazasActuales}</Text>
              {' '}
              plaza
              {plazasActuales === 1 ? '' : 's'}
              {' '}
              contratada
              {plazasActuales === 1 ? '' : 's'}
              . Indica cuántas plazas adicionales necesitas.
            </>
          )}
        </Paragraph>

        <div className="mp-contratar-plazas__combo">
          <div className="mp-contratar-plazas__field">
            <label className="mp-contratar-plazas__label" htmlFor="mp-plazas-anadir">
              {esPrimeraContratacion ? 'Plazas a contratar' : 'Plazas a añadir'}
            </label>
            <InputNumber
              id="mp-plazas-anadir"
              min={MARKETPLACE_MIN_PLAZAS}
              max={MARKETPLACE_MAX_PLAZAS - Number(plazasActuales)}
              value={plazasAnadir}
              onChange={(v) => setPlazasAnadir(v ?? 1)}
              className="mp-contratar-plazas__input"
            />
          </div>
          <div className="mp-contratar-plazas__field mp-contratar-plazas__field--total">
            <span className="mp-contratar-plazas__label">Total plazas</span>
            <strong className="mp-contratar-plazas__total">{plazasObjetivo}</strong>
          </div>
        </div>

        <div className="mp-contratar-plazas__importe">
          <Text type="secondary">Importe a cobrar ahora (prorrateo)</Text>
          <div className="mp-contratar-plazas__importe-valor">
            {previewLoading ? (
              <Spin size="small" />
            ) : preview ? (
              `${formatEuro(preview.importe_cobrar_ahora_eur)} €`
            ) : (
              '—'
            )}
          </div>
        </div>

        <Paragraph type="secondary" className="mp-contratar-plazas__hint">
          El cargo se añade a tu suscripción de TimeCor en Stripe. El módulo quedará activo en cuanto
          haya al menos una plaza contratada.
        </Paragraph>
      </Space>
    </Modal>
  );
};

export default MarketplaceContratarPlazasModal;
