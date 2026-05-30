import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Button, Input, Table, Form, Layout, Typography, message, Popconfirm, Modal, Checkbox } from 'antd';
import {  editEmpresa, eliminarEmpresa,getEmpresasUsuarios } from '../../features/empresas/empresasService';
import './BuscadorEmpresa.css';

const { Title } = Typography;

const BuscadorEmpresa = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [editingRecord, setEditingRecord] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        fetchEmpresas();
    }, []);

    const fetchEmpresas = async () => {
        setLoading(true);
        try {
            const response = await getEmpresasUsuarios();
            const lista = Array.isArray(response) ? response : [];
            setData(lista);
            setFilteredData(lista);
        } catch (error) {
            message.error('Error al cargar las empresas');
        } finally {
            setLoading(false);
        }
    };

    // Función para formatear la fecha en formato español
    const formatDate = (date) => {
        if (!date) return ''; // Si no hay fecha, devuelve un string vacío
        return new Intl.DateTimeFormat('es-ES').format(new Date(date));
    };

    const handleSearch = (values) => {
        const { nombre_empresa,email, identificador_fiscal } = values;
        const filtered = data.filter((empresa) =>
            (!nombre_empresa || empresa.nombre.toLowerCase().includes(nombre_empresa.toLowerCase())) &&
            (!email || empresa.email.toLowerCase().includes(email.toLowerCase())) &&
            (!identificador_fiscal || empresa.identificador_fiscal.toLowerCase().includes(identificador_fiscal.toLowerCase()))
        );
        setFilteredData(filtered);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleSave = async () => {
        try {
            const updatedValues = await form.validateFields();
            await editEmpresa(editingRecord.id_empresa, updatedValues);

            setData((prevData) =>
                prevData.map((item) => (item.id_empresa === editingRecord.id_empresa ? { ...item, ...updatedValues } : item))
            );
            setFilteredData((prevFiltered) =>
                prevFiltered.map((item) => (item.id_empresa === editingRecord.id_empresa ? { ...item, ...updatedValues } : item))
            );
            setEditingRecord(null);
            setIsModalVisible(false);
            message.success('Empresa actualizada correctamente');
        } catch (error) {
            message.error(`Error al guardar los cambios: ${error.message}`);
        }
    };

    const handleDelete = async (id_empresa) => {
        try {
            await eliminarEmpresa(id_empresa);
            setData((prevData) => prevData.filter((item) => item.id_empresa !== id_empresa));
            setFilteredData((prevFiltered) => prevFiltered.filter((item) => item.id_empresa !== id_empresa));
            message.success('Empresa dada de baja correctamente');
        } catch (error) {
            message.error('Error al dar de baja la empresa');
        }
    };

    const handleCancelModal = () => {
        setEditingRecord(null);
        setIsModalVisible(false);
    };

    return (
        <Layout className="be-layout">
            <Card title={<Title level={2}>Administrar Empresas</Title>}>
                <Form layout="vertical" onFinish={handleSearch}>
                    <Row gutter={16} align="bottom">
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="nombre_empresa" label="Nombre de la empresa">
                                <Input placeholder="Buscar por nombre" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="email" label="Email responsable">
                                <Input placeholder="Buscar por email" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="identificador_fiscal" label="Identificador Fiscal">
                                <Input placeholder="Buscar por identificador fiscal" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading} className="be-full-width">
                                    Buscar
                                </Button>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            <Card className="be-card-table">
                <Table
                    dataSource={Array.isArray(filteredData) ? filteredData : []}
                    loading={loading}
                    rowKey="id_empresa"
                    pagination={{ pageSize: 6 }}
                    scroll={{ x: 600 }}
                    columns={[
                        { title: 'Nombre Empresa', dataIndex: 'nombre', key: 'nombre' },
                        { title: 'Identificador Fiscal', dataIndex: 'identificador_fiscal', key: 'identificador_fiscal' },
                        { title: 'Email Responsable', dataIndex: 'email', key: 'email' },
                        { title: 'Licencias', dataIndex: 'licencias', key: 'licencias' },
                        { title: 'Fecha Alta',dataIndex: 'fecha_alta',key: 'fecha_alta',
                            render: (fecha_alta) => formatDate(fecha_alta), // Formatear la fecha aquí
                        },
                        {title: 'Activo',dataIndex: 'activo',key: 'activo',render: (checked, record) => (
                                <Checkbox checked={checked} disabled />
                            ),
                        },
                        {
                            title: 'Acciones',
                            key: 'acciones',
                            render: (_, record) => (
                                <Row gutter={16}>
                                    <Col>
                                        <Button type="link" onClick={() => handleEdit(record)}>
                                            Editar
                                        </Button>
                                    </Col>
                                    <Col>
                                        <Popconfirm
                                            title="¿Estás seguro de dar de baja esta empresa?"
                                            onConfirm={() => handleDelete(record.id_empresa)}
                                            okText="Sí"
                                            cancelText="No"
                                        >
                                            <Button type="link" danger>
                                                Dar de Baja
                                            </Button>
                                        </Popconfirm>
                                    </Col>
                                </Row>
                            ),
                        },
                    ]}
                />
            </Card>

            <Modal
                title="Editar Empresa"
                open={isModalVisible}
                onCancel={handleCancelModal}
                footer={null}
                centered
                className="be-edit-modal"
                styles={{
                    body: {
                        padding: '16px',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                    },
                }}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="nombre"
                                label="Nombre"
                                rules={[{ required: true, message: 'Campo requerido' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="identificador_fiscal"
                                label="Identificador Fiscal"
                                rules={[{ required: true, message: 'Campo requerido' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        
                    </Row>
                    <Row gutter={16}>
                        <Col xs={12}>
                            <Form.Item
                                name="licencias"
                                label="Licencias"
                                rules={[{ required: true, message: 'Campo requerido' }]}
                            >
                                <Input type="number" />
                            </Form.Item>
                        </Col>
                        <Col xs={12}>
                            <Form.Item
                                name="alias"
                                label="Alias"
                                rules={[{ required: true, message: 'Campo requerido' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24}>
                            <Form.Item
                                name="activo"
                                valuePropName="checked"
                                label="Activo"
                            >
                                <Checkbox>Activo</Checkbox>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Button type="primary" htmlType="submit" className="be-full-width">
                                Guardar
                            </Button>
                        </Col>
                        <Col span={12}>
                            <Button onClick={handleCancelModal} className="be-full-width">
                                Cancelar
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </Layout>
    );
};

export default BuscadorEmpresa;
