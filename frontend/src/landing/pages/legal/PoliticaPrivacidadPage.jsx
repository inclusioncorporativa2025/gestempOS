import React from 'react';
import LegalPageLayout, { LegalSection } from '../../components/LegalPageLayout';
import { LEGAL_ENTITY, LEGAL_LAST_UPDATED } from '../../../constants/legal';

const PoliticaPrivacidadPage = () => (
  <LegalPageLayout title="Política de privacidad" lastUpdated={LEGAL_LAST_UPDATED}>
    <LegalSection title="Responsable del tratamiento de los datos">
      <p>
        El responsable del tratamiento de tus datos es <strong>{LEGAL_ENTITY.razonSocial}</strong>,
        con CIF <strong>{LEGAL_ENTITY.cif}</strong>. Puedes ponerte en contacto con nosotros a
        través de los siguientes medios:
      </p>
      <ul>
        <li>
          <strong>Dirección:</strong> {LEGAL_ENTITY.direccion}
        </li>
        <li>
          <strong>Teléfono:</strong>{' '}
          <a href={`tel:${LEGAL_ENTITY.telefono.replace(/\s/g, '')}`}>{LEGAL_ENTITY.telefono}</a>
        </li>
        <li>
          <strong>Correo electrónico:</strong>{' '}
          <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>
        </li>
      </ul>
      <p>Estamos disponibles para atenderte en todo lo relacionado con la gestión de tus datos personales.</p>
    </LegalSection>

    <LegalSection title="Cumplimiento normativo">
      <p>
        En {LEGAL_ENTITY.razonSocial} nos comprometemos a cumplir con las normativas vigentes en
        materia de protección de datos, tales como el Reglamento General de Protección de Datos
        (RGPD) y la Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales
        (LOPDGDD), así como cualquier otra legislación que la complemente o sustituya.
      </p>
    </LegalSection>

    <LegalSection title="Finalidades del tratamiento de los datos">
      <p>Los datos personales que recojamos serán tratados para las siguientes finalidades:</p>
      <ul>
        <li>
          <strong>Atención a consultas:</strong> responder a las consultas y solicitudes que
          recibimos a través de diferentes medios, incluyendo teléfono, correo electrónico o
          formularios web, así como para gestionar cualquier duda, sugerencia o reclamación
          relacionada con nuestros servicios.
        </li>
        <li>
          <strong>Prestación de servicios:</strong> proporcionar los servicios solicitados,
          incluyendo asesoramiento técnico, gestión administrativa y fiscal, así como la
          elaboración de informes y evaluaciones que sean necesarios.
        </li>
        <li>
          <strong>Gestión de la relación comercial:</strong> mantener y gestionar nuestra relación
          contigo como cliente, incluyendo la oferta y contratación de formación, ya sea
          bonificada o no, así como la administración de los cursos y su seguimiento.
        </li>
        <li>
          <strong>Datos de contacto y empresarios individuales:</strong> tratar los datos de
          empresarios individuales y personas de contacto de empresas, ya sea para relaciones
          comerciales, transaccionales o de otra índole.
        </li>
        <li>
          <strong>Procesos de selección de personal:</strong> gestionar los currículums vitae
          recibidos para su inclusión en los procesos de selección de personal que realizamos.
        </li>
        <li>
          <strong>Plataforma Timecor:</strong> gestionar el registro de jornada, fichajes,
          ausencias, nóminas documentales y demás funcionalidades del software de control horario
          contratado por tu empresa.
        </li>
      </ul>
    </LegalSection>

    <LegalSection title="Base legal para el tratamiento">
      <p>
        El tratamiento de tus datos se basa en el consentimiento que nos otorgas al marcar la
        casilla correspondiente en los formularios de nuestra web o en otros medios dispuestos
        para este fin. También puede estar basado en la ejecución de un contrato o en la
        aplicación de medidas precontractuales solicitadas por ti, así como en nuestro interés
        legítimo, siempre y cuando no prevalezcan tus derechos y libertades fundamentales.
      </p>
    </LegalSection>

    <LegalSection title="Cesión de datos a terceros">
      <p>
        {LEGAL_ENTITY.razonSocial} no compartirá tus datos con terceros, salvo que exista una
        obligación legal. Se podrán ceder, en su caso, a organismos como la Agencia Tributaria,
        entidades financieras, o a la Fundación Estatal para la Formación en el Empleo (FUNDAE),
        así como a cualquier otra entidad necesaria para la correcta prestación de nuestros
        servicios. Todos los terceros que gestionen tus datos actuarán bajo las garantías de
        protección de datos estipuladas por la normativa, siempre que operen dentro del Espacio
        Económico Europeo (EEE).
      </p>
    </LegalSection>

    <LegalSection title="Seguridad de los datos">
      <p>
        Adoptamos todas las medidas técnicas y organizativas necesarias para proteger tus datos
        personales y evitar su acceso no autorizado, alteración, pérdida o tratamiento indebido,
        garantizando la seguridad de los mismos según el estado de la tecnología y los riesgos
        asociados al tratamiento.
      </p>
    </LegalSection>

    <LegalSection title="Ejercicio de derechos">
      <p>
        Tienes derecho a acceder, rectificar, suprimir, oponerte, limitar el tratamiento y
        solicitar la portabilidad de tus datos. Para ejercer estos derechos, puedes dirigirte a:
      </p>
      <ul>
        <li>
          <strong>Dirección:</strong> {LEGAL_ENTITY.direccion}
        </li>
        <li>
          <strong>Correo electrónico:</strong>{' '}
          <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>
        </li>
      </ul>
      <p>
        Es necesario que acredites tu identidad mediante una copia de tu DNI o documento similar
        y especifiques el derecho que deseas ejercer. Si consideras que no has obtenido una
        respuesta adecuada, tienes derecho a presentar una reclamación ante la Agencia Española
        de Protección de Datos (
        <a href={LEGAL_ENTITY.aepdUrl} target="_blank" rel="noopener noreferrer">
          www.aepd.es
        </a>
        ).
      </p>
    </LegalSection>

    <LegalSection title="Plazo de conservación de los datos">
      <p>
        Los datos se conservarán mientras se mantenga la relación contractual o hasta que
        solicites su supresión. Tras finalizar la relación, mantendremos los datos durante el
        tiempo que establezcan las obligaciones legales aplicables.
      </p>
    </LegalSection>
  </LegalPageLayout>
);

export default PoliticaPrivacidadPage;
