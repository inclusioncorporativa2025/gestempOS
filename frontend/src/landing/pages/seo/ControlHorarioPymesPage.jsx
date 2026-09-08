import React, { useEffect, useState } from 'react';
import {
  ShopOutlined,
  EuroOutlined,
  MobileOutlined,
  TeamOutlined,
  FileProtectOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import LandingHeroVisual from '../../components/LandingHeroVisual';
import LandingDemoFormModal from '../../components/LandingDemoFormModal';
import SeoLandingLayout from './SeoLandingLayout';
import { LANDING_ROUTES } from '../../../constants/routes';
import './SeoLandingLayout.css';

const HERO_IMAGES = [
  {
    src: '/landing/hero-personal.png',
    alt: 'Control horario para pymes con TimeCor',
  },
  {
    src: '/landing/hero-gestion-tiempo.png',
    alt: 'Panel de gestión de tiempo para equipos pequeños',
  },
];

const BENEFITS = [
  {
    icon: <EuroOutlined />,
    title: 'Precio adaptado a pymes',
    text: 'Desde 2,50 €/usuario al mes. Pagas solo por quien ficha, sin suites RRHH sobredimensionadas.',
  },
  {
    icon: <ShopOutlined />,
    title: 'Pensado para equipos pequeños',
    text: 'Ideal para negocios con pocos empleados que necesitan cumplir la normativa sin complicaciones.',
  },
  {
    icon: <MobileOutlined />,
    title: 'Fichaje en un clic',
    text: 'Entrada, salida y pausas desde móvil u ordenador. Sin hardware ni instalaciones.',
  },
  {
    icon: <TeamOutlined />,
    title: 'Roles claros',
    text: 'Administrador, supervisor e inspector con permisos diferenciados según el tamaño de tu empresa.',
  },
  {
    icon: <FileProtectOutlined />,
    title: 'Informes para inspecciones',
    text: 'Exporta registros de jornada cuando los necesites para RR. HH. o la Inspección de Trabajo.',
  },
  {
    icon: <RiseOutlined />,
    title: 'Crece contigo',
    text: 'Añade licencias a medida que incorporas personal. El control horario escala con tu pyme.',
  },
];

const STEPS = [
  {
    title: 'Alta en minutos',
    text: 'Registra la empresa, define jornadas y da de acceso al equipo sin formación técnica.',
  },
  {
    title: 'Control diario sencillo',
    text: 'Cada persona ficha al entrar y salir. Tú ves el estado del equipo en tiempo real.',
  },
  {
    title: 'Cumplimiento asegurado',
    text: 'Conserva el registro de jornada y genera informes cuando lo pidan auditores o gestoría.',
  },
];

const FAQ_ITEMS = [
  {
    question: '¿Qué pyme necesita un software de control horario?',
    answer:
      'Toda empresa con empleados en España debe registrar la jornada laboral. Si tienes personal en nómina —aunque sean pocas personas—, un software de control horario te ayuda a cumplir la normativa y evitar sanciones.',
  },
  {
    question: '¿TimeCor es caro para una empresa pequeña?',
    answer:
      'No. TimeCor está pensado para pymes que no quieren pagar por funcionalidades de RRHH que no usan. Hay planes desde 2,50 €/usuario al mes y 15 días de prueba gratis.',
  },
  {
    question: '¿Puedo usar TimeCor si solo tengo 3 o 4 empleados?',
    answer:
      'Sí. Puedes empezar con el número de licencias que necesites y ampliar cuando contrates más personal.',
  },
  {
    question: '¿Sustituye a un departamento de RRHH?',
    answer:
      'TimeCor cubre el registro de jornada, fichajes, ausencias e informes. No es una suite completa de nóminas, pero resuelve el control horario obligatorio de forma eficiente.',
  },
  {
    question: '¿Cómo empiezo?',
    answer:
      'Crea tu cuenta, configura la empresa y prueba 15 días sin tarjeta. Si prefieres ver primero el producto, visita la página principal de TimeCor.',
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

const ControlHorarioPymesPage = () => {
  const [demoFormOpen, setDemoFormOpen] = useState(false);

  useEffect(() => {
    const scriptId = 'seo-control-horario-pymes-faq-schema';
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
        eyebrow="Control horario para pymes en España"
        title="Control horario para pymes: cumple la normativa sin pagar de más"
        lead="TimeCor ofrece registro de jornada, fichaje digital e informes listos para inspecciones. Software ligero para equipos pequeños que no necesitan una suite RRHH completa."
        heroVisual={<LandingHeroVisual images={HERO_IMAGES} />}
        onDemoClick={() => setDemoFormOpen(true)}
        ctaTitle="Prueba el control horario para tu pyme"
        ctaLead="15 días gratis. Configura tu empresa y empieza a fichar hoy mismo."
      >
        <section className="seo-landing__section" aria-labelledby="pymes-que-es">
          <div className="landing-container">
            <h2 id="pymes-que-es" className="seo-landing__section-title">
              Control horario en pymes: qué exige la ley y cómo simplificarlo
            </h2>
            <div className="seo-landing__prose">
              <p>
                Las <strong>pymes con empleados</strong> están obligadas a llevar un{' '}
                <strong>registro de jornada</strong> diario, fiable y accesible. Muchas
                empresas pequeñas lo intentan con Excel o papel, pero eso complica las
                inspecciones y genera errores.
              </p>
              <p>
                Un software de <strong>control horario para pymes</strong> como TimeCor
                centraliza fichajes, pausas y ausencias en un solo panel. Si quieres profundizar
                en el registro legal, consulta nuestra guía sobre{' '}
                <Link to={LANDING_ROUTES.seoRegistroJornadaNormativa}>
                  registro de jornada y normativa
                </Link>
                , o descubre el{' '}
                <Link to={LANDING_ROUTES.seoFichajeDigital}>fichaje digital</Link> en detalle.
              </p>
            </div>
          </div>
        </section>

        <section
          className="seo-landing__section seo-landing__section--alt"
          aria-labelledby="pymes-beneficios"
        >
          <div className="landing-container">
            <h2 id="pymes-beneficios" className="seo-landing__section-title">
              Por qué las pymes eligen TimeCor
            </h2>
            <p className="seo-landing__section-intro">
              Funcionalidades esenciales de control horario, sin la complejidad de los ERP.
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

        <section className="seo-landing__section" aria-labelledby="pymes-como-funciona">
          <div className="landing-container">
            <h2 id="pymes-como-funciona" className="seo-landing__section-title">
              Cómo implantar el control horario en tu pyme
            </h2>
            <p className="seo-landing__section-intro">
              En tres pasos pasas del registro manual al control horario digital.
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
          aria-labelledby="pymes-faq"
        >
          <div className="landing-container">
            <h2 id="pymes-faq" className="seo-landing__section-title">
              Preguntas frecuentes sobre control horario en pymes
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

export default ControlHorarioPymesPage;
