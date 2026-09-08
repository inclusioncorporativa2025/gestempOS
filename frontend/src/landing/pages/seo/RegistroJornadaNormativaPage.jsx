import React, { useEffect, useState } from 'react';
import {
  SafetyCertificateOutlined,
  AuditOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import LandingHeroVisual from '../../components/LandingHeroVisual';
import LandingDemoFormModal from '../../components/LandingDemoFormModal';
import SeoLandingLayout from './SeoLandingLayout';
import { LANDING_ROUTES } from '../../../constants/routes';
import './SeoLandingLayout.css';

const HERO_IMAGES = [
  {
    src: '/landing/hero.png',
    alt: 'Registro de jornada laboral conforme a la normativa',
  },
  {
    src: '/landing/hero-gestion-tiempo.png',
    alt: 'Informes de jornada para cumplimiento legal',
  },
];

const BENEFITS = [
  {
    icon: <SafetyCertificateOutlined />,
    title: 'Cumplimiento legal',
    text: 'Registro diario de la jornada con hora de inicio y fin, conforme a la normativa española de control horario.',
  },
  {
    icon: <AuditOutlined />,
    title: 'Preparado para inspecciones',
    text: 'Conserva el historial de fichajes y expórtalo cuando la Inspección de Trabajo o la gestoría lo soliciten.',
  },
  {
    icon: <FileTextOutlined />,
    title: 'Registro accesible',
    text: 'Los datos deben estar disponibles para trabajadores, representantes legales y la autoridad laboral.',
  },
  {
    icon: <ClockCircleOutlined />,
    title: 'Trazabilidad horaria',
    text: 'Entradas, salidas, pausas y horas extra quedan registradas con fecha y hora en un sistema centralizado.',
  },
  {
    icon: <ExportOutlined />,
    title: 'Informes exportables',
    text: 'Genera listados en Excel con el detalle de jornadas por empleado y periodo.',
  },
  {
    icon: <CheckCircleOutlined />,
    title: 'Menos riesgo de sanción',
    text: 'Evita multas por incumplimiento sustituyendo registros manuales poco fiables por un sistema digital.',
  },
];

const STEPS = [
  {
    title: 'Digitaliza el registro',
    text: 'Sustituye hojas de firmas o Excel por fichajes digitales con hora exacta de cada evento.',
  },
  {
    title: 'Conserva y organiza',
    text: 'TimeCor almacena el historial de jornadas de forma ordenada y recuperable en cualquier momento.',
  },
  {
    title: 'Demuestra el cumplimiento',
    text: 'Ante una inspección o auditoría, exporta los informes que acreditan el registro de jornada.',
  },
];

const FAQ_ITEMS = [
  {
    question: '¿Es obligatorio el registro de jornada en España?',
    answer:
      'Sí. Desde la reforma laboral, todas las empresas deben registrar la jornada diaria de sus trabajadores, conservar ese registro y ponerlo a disposición de empleados, representantes y la Inspección de Trabajo.',
  },
  {
    question: '¿Qué datos debe incluir el registro de jornada?',
    answer:
      'Como mínimo, la hora concreta de inicio y fin de la jornada de cada persona. También es recomendable registrar pausas y horas extraordinarias para una trazabilidad completa.',
  },
  {
    question: '¿Cuánto tiempo hay que conservar los registros?',
    answer:
      'La normativa exige conservar el registro durante cuatro años. Un software como TimeCor facilita archivar y recuperar los datos de todo ese periodo.',
  },
  {
    question: '¿Sirve un Excel para cumplir la normativa?',
    answer:
      'Un Excel puede ser insuficiente si no garantiza fiabilidad, trazabilidad y accesibilidad. Un sistema de fichaje digital reduce errores y demuestra mejor el cumplimiento ante una inspección.',
  },
  {
    question: '¿TimeCor cumple con la normativa de registro de jornada?',
    answer:
      'TimeCor está diseñado para el control horario obligatorio en España: fichaje digital, informes exportables y roles para supervisión. Puedes probarlo 15 días gratis.',
  },
];

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: answer,
    },
  })),
};

const RegistroJornadaNormativaPage = () => {
  const [demoFormOpen, setDemoFormOpen] = useState(false);

  useEffect(() => {
    const scriptId = 'seo-registro-jornada-normativa-faq-schema';
    if (document.getElementById(scriptId)) return undefined;

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(FAQ_SCHEMA);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, []);

  return (
    <>
      <SeoLandingLayout
        eyebrow="Registro de jornada laboral en España"
        title="Registro de jornada normativa: cumple la ley con un sistema fiable"
        lead="La normativa obliga a registrar la jornada diaria de cada trabajador. TimeCor digitaliza el control horario, conserva el historial y genera informes listos para inspecciones."
        heroVisual={<LandingHeroVisual images={HERO_IMAGES} />}
        onDemoClick={() => setDemoFormOpen(true)}
        ctaTitle="Digitaliza tu registro de jornada con TimeCor"
        ctaLead="Prueba 15 días gratis. Sin tarjeta. Empieza a cumplir la normativa hoy."
      >
        <section className="seo-landing__section" aria-labelledby="normativa-que-es">
          <div className="landing-container">
            <h2 id="normativa-que-es" className="seo-landing__section-title">
              ¿Qué es el registro de jornada normativa?
            </h2>
            <div className="seo-landing__prose">
              <p>
                El <strong>registro de jornada</strong> es la obligación legal de documentar,
                cada día, la hora de inicio y fin de la jornada de cada trabajador. La empresa
                debe conservar ese registro durante cuatro años y facilitarlo a empleados,
                representantes legales y la <strong>Inspección de Trabajo</strong>.
              </p>
              <p>
                Un software de <strong>control horario</strong> como TimeCor automatiza ese
                registro mediante <Link to={LANDING_ROUTES.seoFichajeDigital}>fichaje digital</Link>.
                Si buscas una solución adaptada a equipos pequeños, consulta también el{' '}
                <Link to={LANDING_ROUTES.seoControlHorarioPymes}>
                  control horario para pymes
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section
          className="seo-landing__section seo-landing__section--alt"
          aria-labelledby="normativa-beneficios"
        >
          <div className="landing-container">
            <h2 id="normativa-beneficios" className="seo-landing__section-title">
              Cómo TimeCor te ayuda a cumplir la normativa
            </h2>
            <p className="seo-landing__section-intro">
              Herramientas concretas para el registro de jornada exigido por la legislación laboral.
            </p>
            <ul className="seo-landing__grid">
              {BENEFITS.map(({ icon, title, text }) => (
                <li key={title} className="seo-landing__card">
                  <span className="seo-landing__card-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <h3 className="seo-landing__card-title">{title}</h3>
                  <p className="seo-landing__card-text">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="seo-landing__section" aria-labelledby="normativa-como-funciona">
          <div className="landing-container">
            <h2 id="normativa-como-funciona" className="seo-landing__section-title">
              Pasos para cumplir el registro de jornada con TimeCor
            </h2>
            <p className="seo-landing__section-intro">
              De la obligación legal a la evidencia documentada en tres pasos.
            </p>
            <ol className="seo-landing__steps">
              {STEPS.map(({ title, text }) => (
                <li key={title} className="seo-landing__step">
                  <h3 className="seo-landing__step-title">{title}</h3>
                  <p className="seo-landing__step-text">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="seo-landing__section seo-landing__section--alt"
          aria-labelledby="normativa-faq"
        >
          <div className="landing-container">
            <h2 id="normativa-faq" className="seo-landing__section-title">
              Preguntas frecuentes sobre registro de jornada y normativa
            </h2>
            <div className="seo-landing__faq-list">
              {FAQ_ITEMS.map(({ question, answer }) => (
                <article key={question} className="seo-landing__faq-item">
                  <h3 className="seo-landing__faq-question">{question}</h3>
                  <p className="seo-landing__faq-answer">{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </SeoLandingLayout>

      <LandingDemoFormModal open={demoFormOpen} onClose={() => setDemoFormOpen(false)} />
    </>
  );
};

export default RegistroJornadaNormativaPage;
