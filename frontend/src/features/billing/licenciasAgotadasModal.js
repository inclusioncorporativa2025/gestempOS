import { Modal, message } from 'antd';
import { ampliarLicencias } from './billingService';
import { SUPPORT_EMAIL } from '../../constants/support';

const formatEuro = (amount) =>
  Number(amount).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const mostrarModalLicenciasAgotadas = ({ response, onAmpliado }) => {
  const puedeAmpliar = Boolean(response?.puede_ampliar_stripe);
  const esLegacy = Boolean(response?.es_legacy);
  const licenciasNecesarias =
    response?.licencias_necesarias ?? (Number(response?.usadas || 0) + 1);
  const prorrateo = response?.prorrateo_estimado_eur;

  const contenido = esLegacy && !puedeAmpliar ? (
    <div>
      <p>No tiene plazas disponibles. Contacte con soporte para ampliar la licencia.</p>
      {response?.licencias != null && (
        <p style={{ marginTop: 8 }}>
          Licencias contratadas: <strong>{response.licencias}</strong>
          {' · '}
          En uso: <strong>{response.usadas}</strong>
        </p>
      )}
      {prorrateo != null && (
        <p style={{ marginTop: 12 }}>
          Importe estimado de la licencia extra: <strong>{formatEuro(prorrateo)} €</strong>
          {' '}
          (precio anual prorrateado hasta la fecha de fin de periodo).
        </p>
      )}
      <p style={{ marginTop: 12 }}>
        <a href={`mailto:${SUPPORT_EMAIL}?subject=Solicitud%20licencia%20extra`}>
          {SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  ) : (
    <div>
      <p>
        {response?.message
          || 'No tiene plazas disponibles para dar de alta a más usuarios.'}
      </p>
      {response?.licencias != null && (
        <p style={{ marginTop: 8 }}>
          Licencias contratadas: <strong>{response.licencias}</strong>
          {' · '}
          En uso: <strong>{response.usadas}</strong>
        </p>
      )}
      {puedeAmpliar ? (
        <p style={{ marginTop: 12 }}>
          Se añadirá <strong>1 licencia</strong> a su suscripción (
          {licenciasNecesarias} en total). Stripe cargará el importe prorrateado
          en su método de pago.
        </p>
      ) : (
        <p style={{ marginTop: 12 }}>
          Active una suscripción en Facturación o contacte con soporte en{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      )}
    </div>
  );

  if (!puedeAmpliar) {
    Modal.warning({
      title: 'Sin plazas disponibles',
      content: contenido,
      okText: 'Entendido',
    });
    return;
  }

  Modal.confirm({
    title: 'Sin plazas disponibles',
    content: contenido,
    okText: 'Añadir licencia y continuar',
    cancelText: 'Cancelar',
    onOk: async () => {
      try {
        await ampliarLicencias(licenciasNecesarias);
        message.success(
          'Licencia añadida. El importe prorrateado se cargará en su método de pago.',
        );
        await onAmpliado?.();
      } catch (error) {
        message.error(error.message || 'No se pudo ampliar las licencias');
        throw error;
      }
    },
  });
};
