import React, { useEffect, useRef, useState } from 'react';
import { Button, InputNumber, Modal, Spin, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { cambiarPlan, previewCambiarPlan } from '../../features/billing/billingService';
import { getPlanLabel } from '../../constants/plans';

const { Text } = Typography;

const formatEuro = (amount) =>
  Number(amount).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Solo con suscripción Stripe activa (prorrateo). Sin suscripción → configurar plan a la derecha. */
const FacturacionAmpliarPlazasBlock = ({
  estado,
  planActual,
  licenciasActuales,
  puedeCambiarPlan,
  onActualizado,
}) => {
  const [plazasAnadir, setPlazasAnadir] = useState(1);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const previewRequestId = useRef(0);

  const licenciasObjetivo = Number(licenciasActuales) + Number(plazasAnadir || 1);
  const plazasLibres = estado?.plazas_libres ?? 0;

  useEffect(() => {
    if (!puedeCambiarPlan || plazasAnadir < 1) {
      setPreview(null);
      setPreviewLoading(false);
      return undefined;
    }

    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const data = await previewCambiarPlan({
          plan: planActual,
          licencias: licenciasObjetivo,
        });
        if (previewRequestId.current === requestId) {
          setPreview(data);
        }
      } catch {
        if (previewRequestId.current === requestId) {
          setPreview(null);
        }
      } finally {
        if (previewRequestId.current === requestId) {
          setPreviewLoading(false);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [puedeCambiarPlan, planActual, licenciasObjetivo, plazasAnadir]);

  const ejecutarAmpliacion = async () => {
    setSubmitting(true);
    try {
      await cambiarPlan({ plan: planActual, licencias: licenciasObjetivo });
      message.success(
        `Plazas ampliadas a ${licenciasObjetivo}. Stripe cargará el importe prorrateado.`,
      );
      setConfirmOpen(false);
      setPlazasAnadir(1);
      setPreview(null);
      await onActualizado?.();
    } catch (error) {
      message.error(error.message || 'No se pudo ampliar las plazas');
    } finally {
      setSubmitting(false);
    }
  };

  if (!puedeCambiarPlan) {
    return null;
  }

  return (
    <div id="facturacion-ampliar-plazas" className="facturacion-ampliar-plazas">
      <Text className="facturacion-ampliar-plazas__title">Ampliar plazas en tu plan</Text>

      <Text type="secondary" className="facturacion-ampliar-plazas__hint">
        Plan actual: <strong>{estado?.plan_label || getPlanLabel(planActual)}</strong>
        {' · '}
        {licenciasActuales}
        {' '}
        contratadas
        {plazasLibres > 0 ? (
          <>
            {' · '}
            {plazasLibres}
            {' '}
            libres
          </>
        ) : null}
      </Text>

      <div className="facturacion-ampliar-plazas__combo">
        <div className="facturacion-ampliar-plazas__combo-half">
          <label
            className="facturacion-ampliar-plazas__combo-label"
            htmlFor="facturacion-plazas-anadir"
          >
            Plazas a añadir
          </label>
          <InputNumber
            id="facturacion-plazas-anadir"
            min={1}
            max={500}
            value={plazasAnadir}
            onChange={(v) => setPlazasAnadir(v ?? 1)}
            className="facturacion-ampliar-plazas__input"
          />
        </div>
        <div className="facturacion-ampliar-plazas__combo-half facturacion-ampliar-plazas__combo-half--total">
          <span className="facturacion-ampliar-plazas__combo-label">Nuevo total plazas</span>
          <strong className="facturacion-ampliar-plazas__combo-total">{licenciasObjetivo}</strong>
        </div>
      </div>

      <Text type="secondary" className="facturacion-ampliar-plazas__hint">
        Solo se cobra el prorrateo de las plazas añadidas; la cuota base y el descuento ya aplicados
        no se repiten.
      </Text>

      <dl className="facturacion-status-list">
        <div className="facturacion-status-list__row facturacion-ampliar-plazas__importe-row">
          <dt>Total prorrateo</dt>
          <dd className="facturacion-ampliar-plazas__importe">
            {previewLoading ? (
              <Spin size="small" />
            ) : preview ? (
              `${formatEuro(preview.importe_cobrar_ahora_eur)} €`
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      <Button
        type="primary"
        block
        icon={<PlusOutlined />}
        disabled={previewLoading || !preview || plazasAnadir < 1}
        onClick={() => setConfirmOpen(true)}
      >
        Ampliar
        {' '}
        {plazasAnadir}
        {' '}
        plaza
        {plazasAnadir === 1 ? '' : 's'}
      </Button>

      <Modal
        title="Confirmar ampliación de plazas"
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={ejecutarAmpliacion}
        okText="Confirmar y cobrar prorrateo"
        cancelText="Cancelar"
        confirmLoading={submitting}
        okButtonProps={{ disabled: !preview || previewLoading }}
        destroyOnClose
      >
        <p>
          Pasará de <strong>{licenciasActuales}</strong> a{' '}
          <strong>{licenciasObjetivo}</strong> plazas en{' '}
          <strong>{estado?.plan_label || getPlanLabel(planActual)}</strong>.
        </p>
        {preview?.lineas?.length > 0 && (
          <ul className="facturacion-preview-lines">
            {preview.lineas.map((linea) => (
              <li key={linea.descripcion}>{linea.descripcion}</li>
            ))}
          </ul>
        )}
        {preview ? (
          <p>
            Total prorrateo:{' '}
            <strong>{formatEuro(preview.importe_cobrar_ahora_eur)} €</strong>
          </p>
        ) : null}
      </Modal>
    </div>
  );
};

export default FacturacionAmpliarPlazasBlock;
