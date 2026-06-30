import React from 'react';
import { Link } from 'react-router-dom';
import LegalPageLayout, { LegalSection } from '../../components/LegalPageLayout';
import { LANDING_ROUTES } from '../../../constants/routes';
import { BRAND_NAME } from '../../../constants/brand';
import { LEGAL_ENTITY, LEGAL_LAST_UPDATED } from '../../../constants/legal';

const PoliticaCookiesPage = () => (
  <LegalPageLayout title="Política de cookies" lastUpdated={LEGAL_LAST_UPDATED}>
    <LegalSection title="¿Qué son las cookies?">
      <p>
        Las cookies son pequeños archivos que se almacenan en tu dispositivo cuando visitas un
        sitio web. Permiten recordar preferencias, mantener la sesión iniciada o analizar el uso
        del servicio.
      </p>
    </LegalSection>

    <LegalSection title="Cookies que utilizamos">
      <p>En la web y la aplicación {BRAND_NAME} podemos utilizar las siguientes categorías:</p>
      <ul>
        <li>
          <strong>Técnicas o necesarias:</strong> imprescindibles para el funcionamiento del
          sitio y la aplicación (por ejemplo, mantener la sesión de usuario o recordar
          preferencias de seguridad).
        </li>
        <li>
          <strong>De preferencias:</strong> recuerdan opciones como el idioma o la configuración
          de la interfaz.
        </li>
        <li>
          <strong>Analíticas:</strong> nos ayudan a comprender cómo se utiliza el servicio de
          forma agregada y anónima, con el fin de mejorarlo.
        </li>
      </ul>
      <p>
        No utilizamos cookies publicitarias de terceros en la aplicación de fichaje. Si en el
        futuro incorporáramos nuevas cookies, actualizaremos esta política.
      </p>
    </LegalSection>

    <LegalSection title="Gestión de cookies">
      <p>
        Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que
        desactivar las cookies técnicas puede impedir el correcto funcionamiento de la aplicación
        {BRAND_NAME}, incluido el inicio de sesión.
      </p>
      <p>
        Consulta la ayuda de tu navegador para más información sobre cómo gestionar las cookies.
      </p>
    </LegalSection>

    <LegalSection title="Más información">
      <p>
        Para conocer cómo tratamos tus datos personales, consulta nuestra{' '}
        <Link to={LANDING_ROUTES.privacy}>Política de privacidad</Link>. Si tienes dudas,
        escríbenos a{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
      </p>
    </LegalSection>
  </LegalPageLayout>
);

export default PoliticaCookiesPage;
