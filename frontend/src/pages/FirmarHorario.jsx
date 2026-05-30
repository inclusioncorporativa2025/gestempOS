import React from 'react';
import { Layout, Card, Typography, Row, Col } from 'antd';
import './FirmarHorario.css';

const { Title } = Typography;

const FirmarHoras = () => {

    return (
        <Layout className="firmar-layout">
            <Card title={<Title level={2} className="firmar-title">Firmar Mes</Title>}>
                <Row justify="end" className="firmar-row">
                    <Col>
                        
                    </Col>
                </Row>
                <Row justify="center" className="firmar-row">
                    <Col span={24}>
                        
                    </Col>
                </Row>
            </Card>


        </Layout>
    );
};

export default FirmarHoras;
