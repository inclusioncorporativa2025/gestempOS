import { Modal } from 'antd';
import { dispatchOpenFacturacion } from '../../constants/facturacion';
import { SUPPORT_EMAIL } from '../../constants/support';

const formatEuro = (amount) =>
  Number(amount).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Informa de falta de plazas y dirige a Facturación (preview de prorrateo allí).
 * @param {{ response?: object }} options
 */
export const mostrarModalLicenciasAgotadas = ({ response }) => {
  const puedeAmpliar = Boolean(response?.puede_ampliar_stripe);
  const esLegacy = Boolean(response?.es_legacy);
  const licenciasNecesarias =
    response?.licencias_necesarias ?? (Number(response?.usadas || 0) + 1);

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
      {response?.prorrateo_estimado_eur != null && (
        <p style={{ marginTop: 12 }}>
          Importe estimado de la licencia extra:{' '}
          <strong>{formatEuro(response.prorrateo_estimado_eur)} €</strong>
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
          Para añadir al menos <strong>1 plaza</strong> ({licenciasNecesarias} licencias en
          total), abra <strong>Facturación</strong> y use «Ampliar plazas en tu plan» en su
          suscripción. Verá el importe prorrateado antes de confirmar.
        </p>
      ) : (
        <p style={{ marginTop: 12 }}>
          En <strong>Facturación</strong>, indique cuántos usuarios accederán (columna «Configurar
          plan») y active la suscripción, o contacte con soporte en{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      )}
    </div>
  );

  const irAFacturacion = () => {
    dispatchOpenFacturacion({
      focusLicencias: true,
      licenciasSugeridas: licenciasNecesarias,
    });
  };

  if (!puedeAmpliar) {
    Modal.warning({
      title: 'Sin plazas disponibles',
      content: contenido,
      okText: 'Entendido',
    });
    return;
  }

  Modal.info({
    title: 'Sin plazas disponibles',
    content: contenido,
    okText: 'Ir a Facturación',
    onOk: irAFacturacion,
  });
};
