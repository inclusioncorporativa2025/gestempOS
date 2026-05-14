import { Content } from 'antd/es/layout/layout';
import React, { useState } from 'react';
import { Card, Col, Typography, Form, Input, Row, Button, Layout, message ,InputNumber} from 'antd';
import { crearEmpresa } from "../../features/empresas/empresasService";


const { Title } = Typography;

const AltaEmpresa = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm(); // Referencia del formulario

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            await crearEmpresa(values);
            message.success(`Empresa creada correctamente`);
            form.resetFields(); // Resetea todos los campos del formulario

        } catch (error) {
            message.error(error.message || 'Error al crear empresa');
        } finally {
            setLoading(false);
        }

    };

    const handleReset = () => {
        form.resetFields(); // Resetea todos los campos del formulario
    };

    return (
        <Layout style={{ backgroundColor: 'transparent' }}>
            <Content
                style={{ height: '84vh', justifyContent: 'center', alignItems: 'start', display: 'flex' }}
            >
                <Layout>
                    <Card
                        style={{}}
                        title={<Title level={2} style={{ textAlign: 'center' }}>Alta Nueva Empresa</Title>}>
                        <Form
                            form={form} // Asocia la referencia del formulario
                            name="altaEmpresa"
                            onFinish={handleSubmit}
                            layout="vertical"
                        >
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12} md={12} lg={12} xl={12} xxl={12}>
                                    <Form.Item
                                        name={'nombre_empresa'}
                                        label={'Nombre de la empresa'}
                                        rules={[{ required: true, message: 'Campo requerido!' }]}
                                    >
                                        <Input placeholder="Ej. Empresa.SA"></Input>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={12} lg={12} xl={12} xxl={12}>
                                    <Form.Item
                                        name={'alias'}
                                        label={'Alias de la empresa'}
                                        rules={[{ required: true, message: 'Campo requerido!' }]}
                                    >
                                        <Input placeholder="Ej. Empresa1"></Input>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={12} lg={12} xl={12} xxl={12}>
                                    <Form.Item
                                        name={'CIF'}
                                        label={'CIF'}
                                        rules={[{ required: true, message: 'Campo requerido!' }]}
                                    >
                                        <Input placeholder="Ej.12345678A"></Input>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={12} lg={12} xl={12} xxl={12}>
                                    <Form.Item
                                        name={'Administrador'}
                                        label={'Administrador'}
                                        rules={[{ required: true, message: 'Campo requerido!' }]}
                                    >
                                        <Input placeholder="Nombre Completo"></Input>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={12} lg={12} xl={12} xxl={12}>
                                    <Form.Item
                                        name={'numLicencias'}
                                        label={'Numero de licencias'}
                                        type="number"
                                        rules={[{ required: true, message: 'Campo requerido!' }]}
                                    >
                                <InputNumber min={1} style={{ width: '100%' }} />
                                </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={12} lg={12} xl={12} xxl={12}>
                                    <Form.Item
                                        name={'email'}
                                        label={'Email contacto'}
                                        rules={[{ required: true, message: 'Campo requerido!' }]}
                                    >
                                        <Input placeholder="Ej. ejemplo@ejemplo.com"></Input>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={12} lg={12} xl={12} xxl={12}>
                                    <Form.Item
                                        name={'dni'}
                                        label={'DNI'}
                                        rules={[{ required: true, message: 'Campo requerido!' }]}

                                    >
                                        <Input placeholder="Ej. 12345678A"></Input>
                                    </Form.Item>
                                </Col>
                                <Col></Col>
                                <Col xs={24} sm={12} md={12} lg={12} xl={12} xxl={12}>
                                    <div>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={loading}
                                            style={{ marginRight: '15px' }}
                                        >
                                            Continuar
                                        </Button>
                                        <Button onClick={handleReset}>Limpiar</Button>
                                    </div>
                                </Col>
                            </Row>
                        </Form>
                    </Card>
                </Layout>
            </Content>
        </Layout>
    );
};

export default AltaEmpresa;
