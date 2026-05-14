import React, { useState } from 'react';
import { Layout, Card, Table, Button, Typography, Row, Col, Modal, Form, Input, TimePicker, message, Select, DatePicker } from 'antd';

const { Title } = Typography;
const { Content } = Layout;
const { Option } = Select;

const FirmarHoras = () => {

    return (
        <Layout style={{ backgroundColor: 'transparent', maxWidth: '90vw', margin: '0 auto', height: '100vh' }}>
            <Card title={<Title level={2} style={{ textAlign: 'center' }}>Firmar Mes</Title>}>
                <Row justify="end" style={{ marginBottom: '20px' }}>
                    <Col>
                        
                    </Col>
                </Row>
                <Row justify="center" style={{ marginBottom: '20px' }}>
                    <Col span={24}>
                        
                    </Col>
                </Row>
            </Card>


        </Layout>
    );
};

export default FirmarHoras;
