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

  const cicloFacturacion = preview?.ciclo_facturacion;
  const esCicloAnual = cicloFacturacion === 'anual';

  const precioPlazaCiclo = useMemo(() => {
    const desdePreview = Number(preview?.precio_plaza_ciclo_eur);
    if (Number.isFinite(desdePreview) && desdePreview > 0) return desdePreview;
    const mensual = Number(precioMensualEur);
    if (!Number.isFinite(mensual) || mensual <= 0) return null;
    return esCicloAnual ? mensual * 12 : mensual;
  }, [preview?.precio_plaza_ciclo_eur, precioMensualEur, esCicloAnual]);

  const proximaFacturaLabel = useMemo(() => {
    if (!preview?.proxima_factura) return null;
    const d = new Date(preview.proxima_factura);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [preview?.proxima_factura]);

  const unidadCiclo = esCicloAnual ? 'año' : 'mes';
  const cicloLabel = esCicloAnual ? 'anual' : 'mensual';

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
              Elige cuántas plazas contratar (una plaza =
              {' '}
              <Text strong>un usuario</Text>
              ). Se usa el
              {' '}
              <Text strong>mismo ciclo que tu suscripción en Stripe</Text>
              {cicloFacturacion ? (
                <>
                  {' '}
                  (
                  {cicloLabel}
                  )
                </>
              ) : null}
              {precioPlazaCiclo != null ? (
                <>
                  :
                  {' '}
                  <Text strong>
                    {formatEuro(precioPlazaCiclo)}
                    {' '}
                    € / usuario /
                    {' '}
                    {unidadCiclo}
                  </Text>
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
              {' '}
              (ciclo
              {' '}
              {cicloLabel || '—'}
              ). Indica cuántas plazas adicionales necesitas.
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
          <Text type="secondary">
            Ahora — prorrateo
            {proximaFacturaLabel ? (
              <>
                {' '}
                hasta la próxima factura (
                {proximaFacturaLabel}
                )
              </>
            ) : (
              ' hasta la próxima factura'
            )}
          </Text>
          <div className="mp-contratar-plazas__importe-valor">
            {previewLoading ? (
              <Spin size="small" />
            ) : preview ? (
              `${formatEuro(preview.importe_cobrar_ahora_eur)} €`
            ) : (
              '—'
            )}
          </div>
          {preview?.importe_recurrente_ciclo_eur != null && precioPlazaCiclo != null ? (
            <Text type="secondary" className="mp-contratar-plazas__recurrente">
              Después, en cada renovación
              {' '}
              {cicloLabel}
              :
              {' '}
              <Text strong>
                {formatEuro(preview.importe_recurrente_ciclo_eur)}
                {' '}
                €
              </Text>
              {' '}
              (
              {plazasObjetivo}
              {' '}
              ×
              {' '}
              {formatEuro(precioPlazaCiclo)}
              {' '}
              €)
            </Text>
          ) : null}
        </div>

        <Paragraph type="secondary" className="mp-contratar-plazas__hint">
          El módulo se suma a tu suscripción TimeCor en Stripe: hoy pagas solo el tramo hasta la
          próxima factura; luego el total del ciclo (
          {cicloLabel || 'mensual o anual'}
          ) en cada renovación.
        </Paragraph>
      </Space>
    </Modal>
  );
};

export default MarketplaceContratarPlazasModal;
