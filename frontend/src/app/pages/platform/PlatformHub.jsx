import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Typography } from 'antd';
import { HistoryOutlined, ShopOutlined, UserSwitchOutlined, RightOutlined } from '@ant-design/icons';
import { APP_ROUTES } from '../../../constants/routes';
import './Platform.css';

const { Text } = Typography;

const hubCards = [
  {
    key: 'accesos',
    title: 'Accesos a la plataforma',
    description: 'Últimos inicios de sesión, rutas visitadas, IP y navegador.',
    icon: <HistoryOutlined />,
    path: APP_ROUTES.platformAccesos,
  },
  {
    key: 'acceder',
    title: 'Acceder a cuenta',
    description: 'Acceso temporal por correo para ver la app como otro usuario.',
    icon: <UserSwitchOutlined />,
    path: APP_ROUTES.platformAcceder,
  },
  {
    key: 'empresas',
    title: 'Empresas',
    description: 'Alta y administración de empresas cliente.',
    icon: <ShopOutlined />,
    path: APP_ROUTES.companies,
  },
];

const PlatformHub = () => {
  const navigate = useNavigate();

  return (
    <Row gutter={[16, 16]} className="platform-hub">
      {hubCards.map((card) => (
        <Col xs={24} sm={12} lg={8} key={card.key}>
          <Card
            className="platform-hub__card"
            hoverable
            onClick={() => navigate(card.path)}
          >
            <div className="platform-hub__icon">{card.icon}</div>
            <Text strong className="platform-hub__title">
              {card.title}
            </Text>
            <Text type="secondary" className="platform-hub__desc">
              {card.description}
            </Text>
            <span className="platform-hub__link">
              Entrar <RightOutlined />
            </span>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default PlatformHub;
