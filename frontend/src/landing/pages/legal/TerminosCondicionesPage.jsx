import React from 'react';
import { Link } from 'react-router-dom';
import LegalPageLayout, { LegalSection } from '../../components/LegalPageLayout';
import { LANDING_ROUTES } from '../../../constants/routes';
import { BRAND_NAME, BRAND_BYLINE } from '../../../constants/brand';
import { LEGAL_ENTITY, LEGAL_LAST_UPDATED } from '../../../constants/legal';

const TerminosCondicionesPage = () => (
  <LegalPageLayout title="Términos y condiciones" lastUpdated={LEGAL_LAST_UPDATED}>
    <LegalSection title="Identificación del prestador">
      <p>
        El servicio {BRAND_NAME} ({BRAND_BYLINE}) es prestado por{' '}
        <strong>{LEGAL_ENTITY.razonSocial}</strong> (CIF {LEGAL_ENTITY.cif}), con domicilio en{' '}
        {LEGAL_ENTITY.direccion}. Contacto:{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> ·{' '}
        <a href={`tel:${LEGAL_ENTITY.telefono.replace(/\s/g, '')}`}>{LEGAL_ENTITY.telefono}</a>.
      </p>
    </LegalSection>

    <LegalSection title="Objeto del contrato">
      <p>
        Estos términos regulan el acceso y uso del software {BRAND_NAME} en modalidad SaaS
        (software como servicio), incluyendo el registro de jornada, gestión de personal,
        ausencias y demás funcionalidades según el plan contratado.
      </p>
      <p>
        La contratación implica la aceptación de estos términos, del{' '}
        <Link to={LANDING_ROUTES.legalNotice}>Aviso legal</Link> y de la{' '}
        <Link to={LANDING_ROUTES.privacy}>Política de privacidad</Link>.
      </p>
    </LegalSection>

    <LegalSection title="Registro y cuenta">
      <p>
        El administrador de la empresa es responsable de la veracidad de los datos facilitados en
        el registro y de gestionar los accesos de su personal. Cada usuario debe mantener la
        confidencialidad de sus credenciales.
      </p>
    </LegalSection>

    <LegalSection title="Planes, precios y facturación">
      <p>
        Los precios publicados no incluyen impuestos salvo indicación contraria. El periodo de
        prueba gratuito, si se ofrece, se rige por las condiciones indicadas en el momento del
        alta. Tras el trial, la suscripción se renovará automáticamente según el plan y ciclo
        elegidos, salvo cancelación previa.
      </p>
      <p>
        Las facturas se emiten por {LEGAL_ENTITY.razonSocial} conforme a la normativa fiscal
        vigente.
      </p>
    </LegalSection>

    <LegalSection title="Uso permitido">
      <p>
        El cliente se compromete a utilizar {BRAND_NAME} conforme a la normativa laboral aplicable,
        en particular en materia de registro de jornada, y a no usar el servicio para fines
        ilícitos ni para vulnerar derechos de terceros.
      </p>
    </LegalSection>

    <LegalSection title="Disponibilidad y soporte">
      <p>
        {LEGAL_ENTITY.razonSocial} procurará mantener el servicio disponible de forma continuada,
        sin garantizar una disponibilidad ininterrumpida. Se podrán programar tareas de
        mantenimiento que serán comunicadas cuando sea razonablemente posible.
      </p>
    </LegalSection>

    <LegalSection title="Propiedad intelectual">
      <p>
        El software, la documentación y los materiales asociados son propiedad de{' '}
        {LEGAL_ENTITY.razonSocial} o de sus licenciantes. Se concede al cliente una licencia de
        uso no exclusiva, intransferible y limitada a la duración del contrato.
      </p>
    </LegalSection>

    <LegalSection title="Protección de datos">
      <p>
        El tratamiento de datos personales se describe en la{' '}
        <Link to={LANDING_ROUTES.privacy}>Política de privacidad</Link>. Cuando el cliente actúa
        como responsable del tratamiento de los datos de sus empleados, {LEGAL_ENTITY.razonSocial}{' '}
        actúa como encargado del tratamiento en los términos legalmente aplicables.
      </p>
    </LegalSection>

    <LegalSection title="Cancelación y baja">
      <p>
        El cliente puede cancelar la suscripción desde el panel de facturación. La baja surtirá
        efecto según las condiciones del plan contratado. {LEGAL_ENTITY.razonSocial} podrá
        suspender o resolver el acceso en caso de incumplimiento grave de estos términos o de
        impago.
      </p>
    </LegalSection>

    <LegalSection title="Legislación y jurisdicción">
      <p>
        Estos términos se rigen por la legislación española. Salvo norma imperativa en contrario,
        las partes se someten a los juzgados y tribunales que correspondan según la legislación
        aplicable.
      </p>
    </LegalSection>
  </LegalPageLayout>
);

export default TerminosCondicionesPage;
