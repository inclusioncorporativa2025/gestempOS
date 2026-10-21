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
  marketplaceEtiquetaPrecioPlaza,
  marketplaceNormalizarCiclo,
  marketplacePrecioPlazaEnCiclo,
} from '../../constants/marketplace';
import {
  crearCheckoutContratarPlazasModulo,
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
  precioAnualEur,
  cicloFacturacionEmpresa = 'mensual',
  plazasActuales = 0,
  idEmpresa,
}) => {
  const [plazasAnadir, setPlazasAnadir] = useState(1);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const previewRequestId = useRef(0);

  const plazasObjetivo = Number(plazasActuales) + Number(plazasAnadir || 1);
  const esPrimeraContratacion = Number(plazasActuales) < MARKETPLACE_MIN_PLAZAS;

  const cicloFacturacion = preview?.ciclo_facturacion
    ?? marketplaceNormalizarCiclo(cicloFacturacionEmpresa);
  const esCicloAnual = cicloFacturacion === 'anual';

  const moduloPrecios = useMemo(() => ({
    precio_mensual_eur: precioMensualEur,
    precio_anual_eur: precioAnualEur,
  }), [precioMensualEur, precioAnualEur]);

  const precioPlazaCiclo = useMemo(() => {
    const desdePreview = Number(preview?.precio_plaza_ciclo_eur);
    if (Number.isFinite(desdePreview) && desdePreview > 0) return desdePreview;
    return marketplacePrecioPlazaEnCiclo(moduloPrecios, cicloFacturacion);
  }, [preview?.precio_plaza_ciclo_eur, moduloPrecios, cicloFacturacion]);

  const etiquetaPrecioPlaza = useMemo(
    () => marketplaceEtiquetaPrecioPlaza(moduloPrecios, cicloFacturacion),
    [moduloPrecios, cicloFacturacion],
  );

  const formatoFechaLarga = (value) => {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const hoyLabel = useMemo(() => formatoFechaLarga(new Date()), []);

  const finSuscripcionLabel = useMemo(
    () => formatoFechaLarga(preview?.proxima_factura),
    [preview?.proxima_factura],
  );

  const periodoPagoLabel = useMemo(() => {
    if (finSuscripcionLabel) {
      return `Desde hoy (${hoyLabel}) hasta el fin de tu suscripción pagada (${finSuscripcionLabel})`;
    }
    return `Desde hoy (${hoyLabel}) hasta el fin del periodo de suscripción pagado`;
  }, [finSuscripcionLabel, hoyLabel]);

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
      const data = await crearCheckoutContratarPlazasModulo({
        idEmpresa,
        codigoModulo,
        plazas: plazasObjetivo,
      });
      if (!data.url) {
        message.error('No se pudo abrir la pasarela de pago');
        return;
      }
      window.location.href = data.url;
    } catch (error) {
      message.error(error.message || 'No se pudo iniciar el pago');
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
          {esPrimeraContratacion ? 'Pagar prorrateo ahora' : 'Pagar ampliación ahora'}
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
              ). Mismo ciclo que tu plan (
              {cicloLabel}
              )
              {etiquetaPrecioPlaza ? (
                <>
                  :
                  {' '}
                  <Text strong>{etiquetaPrecioPlaza}</Text>
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
          <Text strong className="mp-contratar-plazas__importe-titulo">
            Total a pagar
          </Text>
          <Text type="secondary" className="mp-contratar-plazas__importe-periodo">
            {periodoPagoLabel}
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
        </div>

        <Paragraph type="secondary" className="mp-contratar-plazas__hint">
          Confirmarás el pago en la pasarela segura. El importe del total a pagar se cobra al
          confirmar y cubre el periodo indicado arriba.
        </Paragraph>
      </Space>
    </Modal>
  );
};

export default MarketplaceContratarPlazasModal;
