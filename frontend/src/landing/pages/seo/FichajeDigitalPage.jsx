import React, { useEffect, useState } from 'react';
import {
  MobileOutlined,
  SafetyCertificateOutlined,
  FileProtectOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import LandingHeroVisual from '../../components/LandingHeroVisual';
import LandingDemoFormModal from '../../components/LandingDemoFormModal';
import SeoLandingLayout from './SeoLandingLayout';
import { LANDING_ROUTES } from '../../../constants/routes';
import { Link } from 'react-router-dom';
import './SeoLandingLayout.css';

const HERO_IMAGES = [
  {
    src: '/landing/hero.png',
    alt: 'Pantalla de fichaje digital en TimeCor',
  },
  {
    src: '/landing/hero-gestion-tiempo.png',
    alt: 'Control horario en tiempo real con TimeCor',
  },
];

const BENEFITS = [
  {
    icon: <MobileOutlined />,
    title: 'Fichaje desde el móvil',
    text: 'Entrada, salida y pausas desde el smartphone o el ordenador. Registro horario accesible para todo el equipo.',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: 'Conforme a la normativa',
    text: 'Registro de jornada laboral adaptado a la legislación española de control horario obligatorio.',
  },
  {
    icon: <FileProtectOutlined />,
    title: 'Listo para inspecciones',
    text: 'Informes y exportaciones para la Inspección de Trabajo y para el departamento de RR. HH.',
  },
  {
    icon: <TeamOutlined />,
    title: 'Gestión por roles',
    text: 'Personal, supervisores e inspectores con permisos diferenciados en un mismo panel.',
  },
  {
    icon: <ClockCircleOutlined />,
    title: 'Sin hojas de cálculo',
    text: 'Centraliza fichajes, permisos y festivos. Olvídate de Excel y registros manuales propensos a errores.',
  },
  {
    icon: <BarChartOutlined />,
    title: 'Informes al instante',
    text: 'Consulta jornadas, horas extra y ausencias con datos fiables para tomar decisiones.',
  },
];

const STEPS = [
  {
    title: 'Registra tu empresa',
    text: 'Crea la cuenta en minutos, configura horarios y da de alta a tu equipo sin instalaciones.',
  },
  {
    title: 'El personal ficha digitalmente',
    text: 'Cada trabajador registra entrada, salida y pausas desde la app web, con trazabilidad completa.',
  },
  {
    title: 'Supervisa y exporta',
    text: 'Revisa fichajes, aprueba ausencias y genera informes cuando los necesites.',
  },
];

const FAQ_ITEMS = [
  {
    question: '¿Es obligatorio el fichaje digital en España?',
    answer:
      'Sí. La normativa de registro de jornada obliga a las empresas a registrar la jornada laboral de forma diaria, fiable y accesible. Un software de fichaje digital como TimeCor facilita cumplir este requisito sin procesos manuales.',
  },
  {
    question: '¿TimeCor sirve para pymes y autónomos con empleados?',
    answer:
      'Sí. TimeCor está pensado para empresas que necesitan control horario sin contratar una suite RRHH completa. Puedes empezar con pocos usuarios y escalar según crece tu plantilla.',
  },
  {
    question: '¿Se puede fichar desde el móvil?',
    answer:
      'Sí. TimeCor funciona en navegador desde móvil, tablet u ordenador. No hace falta instalar una app nativa para registrar la jornada.',
  },
  {
    question: '¿Qué pasa si me inspeccionan?',
    answer:
      'TimeCor genera listados e informes de jornada que puedes exportar para acreditar el cumplimiento del registro horario ante la Inspección de Trabajo.',
  },
  {
    question: '¿Hay periodo de prueba?',
    answer:
      'Sí. Puedes probar TimeCor 15 días gratis sin tarjeta de crédito y comprobar si encaja con tu forma de trabajar.',
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

const FichajeDigitalPage = () => {
  const [demoFormOpen, setDemoFormOpen] = useState(false);

  useEffect(() => {
    const scriptId = 'seo-fichaje-digital-faq-schema';
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
        eyebrow="Software de fichaje digital en España"
        title="Fichaje digital para empresas: cumple la normativa sin una suite RRHH"
        lead="TimeCor centraliza el registro de jornada laboral, el control horario y los informes para inspecciones. Simple para el personal, potente para tu negocio. Desde 2,50 €/usuario al mes."
        heroVisual={<LandingHeroVisual images={HERO_IMAGES} />}
        onDemoClick={() => setDemoFormOpen(true)}
        ctaTitle="Prueba el fichaje digital de TimeCor gratis"
        ctaLead="15 días sin compromiso. Configura tu empresa y empieza a registrar jornadas hoy."
      >
        <section className="seo-landing__section" aria-labelledby="fichaje-que-es">
          <div className="landing-container">
            <h2 id="fichaje-que-es" className="seo-landing__section-title">
              ¿Qué es el fichaje digital y por qué lo necesitas?
            </h2>
            <div className="seo-landing__prose">
              <p>
                El <strong>fichaje digital</strong> sustituye el registro manual de jornada por un
                sistema electrónico donde cada empleado registra entrada, salida y pausas. En España,
                el <strong>control horario</strong> es obligatorio: la empresa debe conservar un
                registro fiable y accesible de la jornada laboral.
              </p>
              <p>
                Con un software de <strong>registro de jornada laboral</strong> evitas errores,
                multas y pérdida de tiempo. TimeCor te permite cumplir la normativa sin pagar por
                funcionalidades de RRHH que no necesitas. Consulta también el{' '}
                <Link to={LANDING_ROUTES.seoControlHorarioPymes}>control horario para pymes</Link>
                {' '}y la guía sobre{' '}
                <Link to={LANDING_ROUTES.seoRegistroJornadaNormativa}>
                  registro de jornada normativa
                </Link>
                , o visita la <Link to={LANDING_ROUTES.home}>página principal de TimeCor</Link>.
              </p>
            </div>
          </div>
        </section>

        <section
          className="seo-landing__section seo-landing__section--alt"
          aria-labelledby="fichaje-beneficios"
        >
          <div className="landing-container">
            <h2 id="fichaje-beneficios" className="seo-landing__section-title">
              Ventajas del fichaje digital con TimeCor
            </h2>
            <p className="seo-landing__section-intro">
              Todo lo que una pyme necesita para digitalizar el control horario y ganar tranquilidad
              ante inspecciones.
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

        <section className="seo-landing__section" aria-labelledby="fichaje-como-funciona">
          <div className="landing-container">
            <h2 id="fichaje-como-funciona" className="seo-landing__section-title">
              Cómo funciona el fichaje digital en TimeCor
            </h2>
            <p className="seo-landing__section-intro">
              Tres pasos para pasar del registro en papel al control horario digital.
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
          aria-labelledby="fichaje-faq"
        >
          <div className="landing-container">
            <h2 id="fichaje-faq" className="seo-landing__section-title">
              Preguntas frecuentes sobre fichaje digital
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

export default FichajeDigitalPage;
