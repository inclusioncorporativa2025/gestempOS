import { Modal, message } from 'antd';
import { ampliarLicencias } from './billingService';
import { SUPPORT_EMAIL } from '../../constants/support';

export const mostrarModalLicenciasAgotadas = ({ response, onAmpliado }) => {
  const puedeAmpliar = Boolean(response?.puede_ampliar_stripe);
  const esLegacy = Boolean(response?.es_legacy);
  const licenciasNecesarias =
    response?.licencias_necesarias ?? (Number(response?.usadas || 0) + 1);
  const prorrateo = response?.prorrateo_estimado_eur;

  const contenido = (
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
      ) : esLegacy ? (
        <p style={{ marginTop: 12 }}>
          Las ampliaciones en facturación manual se gestionan con soporte
          {prorrateo != null ? (
            <>
              {' '}
              (importe estimado de la licencia extra:{' '}
              <strong>
                {Number(prorrateo).toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                €
              </strong>
              )
            </>
          ) : null}
          . Recibirá un correo 7 días antes de la renovación para activar el
          pago automático con tarjeta.
        </p>
      ) : (
        <p style={{ marginTop: 12 }}>
          Active una suscripción en Facturación o contacte con soporte en{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      )}
      {esLegacy && !puedeAmpliar ? (
        <p style={{ marginTop: 8 }}>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Solicitud%20licencia%20extra`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      ) : null}
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
