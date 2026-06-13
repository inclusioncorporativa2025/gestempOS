import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Typography } from 'antd';
import { APP_ROUTES } from '../../../constants/routes';
import './Configuracion.css';

const { Title, Paragraph } = Typography;

const opciones = [
  {
    key: 'empresa',
    title: 'Empresa',
    description: 'Datos de la empresa: nombre, alias, identificador fiscal y licencias.',
    path: APP_ROUTES.settingsEmpresa,
  },
  {
    key: 'jornada',
    title: 'Jornada',
    description: 'Tipos de jornada laboral y sus registros asociados.',
    path: APP_ROUTES.settingsJornada,
  },
];

const ConfiguracionHub = () => {
  const navigate = useNavigate();

  return (
    <Row gutter={[24, 24]} className="config-hub-grid">
      {opciones.map((opcion) => (
        <Col key={opcion.key} xs={24} md={12} lg={10}>
          <Card
            className="config-hub-card"
            onClick={() => navigate(opcion.path)}
            tabIndex={0}
            role="button"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(opcion.path);
              }
            }}
          >
            <Title level={4} className="config-hub-card__title">
              {opcion.title}
            </Title>
            <Paragraph className="config-hub-card__desc">{opcion.description}</Paragraph>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default ConfiguracionHub;
