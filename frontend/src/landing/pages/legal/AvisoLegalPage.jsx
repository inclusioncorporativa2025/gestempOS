import React from 'react';
import LegalPageLayout, { LegalSection } from '../../components/LegalPageLayout';
import { BRAND_NAME, BRAND_BYLINE } from '../../../constants/brand';
import { LEGAL_ENTITY, LEGAL_LAST_UPDATED } from '../../../constants/legal';

const AvisoLegalPage = () => (
  <LegalPageLayout title="Aviso legal" lastUpdated={LEGAL_LAST_UPDATED}>
    <LegalSection title="Datos identificativos">
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la
        Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa que el titular
        de este sitio web es:
      </p>
      <ul>
        <li>
          <strong>Titular:</strong> {LEGAL_ENTITY.razonSocial}
        </li>
        <li>
          <strong>CIF:</strong> {LEGAL_ENTITY.cif}
        </li>
        <li>
          <strong>Domicilio:</strong> {LEGAL_ENTITY.direccion}
        </li>
        <li>
          <strong>Teléfono:</strong>{' '}
          <a href={`tel:${LEGAL_ENTITY.telefono.replace(/\s/g, '')}`}>{LEGAL_ENTITY.telefono}</a>
        </li>
        <li>
          <strong>Correo electrónico:</strong>{' '}
          <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>
        </li>
        <li>
          <strong>Sitio web:</strong>{' '}
          <a href={LEGAL_ENTITY.web}>{LEGAL_ENTITY.web}</a>
        </li>
      </ul>
      <p>
        El servicio {BRAND_NAME} ({BRAND_BYLINE}) es un software de control horario y registro de
        jornada laboral ofrecido por {LEGAL_ENTITY.razonSocial}.
      </p>
    </LegalSection>

    <LegalSection title="Objeto">
      <p>
        El presente aviso legal regula el acceso y uso del sitio web y de la aplicación {BRAND_NAME}.
        El acceso implica la aceptación sin reservas de las condiciones aquí expuestas.
      </p>
    </LegalSection>

    <LegalSection title="Condiciones de uso">
      <p>
        El usuario se compromete a hacer un uso adecuado de los contenidos y servicios, a no
        emplearlos para actividades ilícitas o contrarias a la buena fe, y a no causar daños en
        los sistemas físicos o lógicos del titular o de terceros.
      </p>
    </LegalSection>

    <LegalSection title="Propiedad intelectual e industrial">
      <p>
        Los contenidos del sitio web, incluyendo textos, imágenes, diseño, logotipos, código y
        software, son propiedad de {LEGAL_ENTITY.razonSocial} o de sus licenciantes y están
        protegidos por la legislación aplicable en materia de propiedad intelectual e industrial.
      </p>
    </LegalSection>

    <LegalSection title="Responsabilidad">
      <p>
        {LEGAL_ENTITY.razonSocial} no se hace responsable de los daños derivados del uso indebido
        del sitio web ni de interrupciones del servicio por causas ajenas a su control razonable.
        Los enlaces a sitios de terceros se ofrecen a título informativo; el titular no asume
        responsabilidad sobre sus contenidos.
      </p>
    </LegalSection>

    <LegalSection title="Legislación aplicable">
      <p>
        Las relaciones derivadas del uso de este sitio web se regirán por la legislación española.
        Para la resolución de conflictos, las partes se someten a los juzgados y tribunales del
        domicilio del consumidor o usuario, cuando la normativa aplicable así lo establezca.
      </p>
    </LegalSection>
  </LegalPageLayout>
);

export default AvisoLegalPage;
