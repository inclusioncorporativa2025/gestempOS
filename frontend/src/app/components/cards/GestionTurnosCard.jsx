import React, { useState } from 'react';
import { Card, Typography, Table, Button, Row, Col, Modal, Form, Input, message, Popconfirm, TimePicker } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import moment from 'moment';
import './GestionTurnosCard.css';

const { Title } = Typography;

const GestionTurnosCard = () => {
    const [turnos, setTurnos] = useState([
        {
            id: 1,
            nombre: 'Turno 1',
            tipoJornada: 'Completa',
            horaEntrada: '08:00',
            horaSalidaComida: '12:00',
            horaEntradaComida: '13:00',
            horaSalida: '17:00',
        },
        {
            id: 2,
            nombre: 'Turno 2',
            tipoJornada: 'Media Jornada',
            horaEntrada: '14:00',
            horaSalidaComida: '—',
            horaEntradaComida: '—',
            horaSalida: '20:00',
        },
    ]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingTurno, setEditingTurno] = useState(null);
    const [form] = Form.useForm();

    const handleAddOrEditTurno = async () => {
        try {
            const values = await form.validateFields();
            const formattedValues = {
                ...values,
                horaEntrada: values.horaEntrada.format('HH:mm'),
                horaSalidaComida: values.horaSalidaComida ? values.horaSalidaComida.format('HH:mm') : '—',
                horaEntradaComida: values.horaEntradaComida ? values.horaEntradaComida.format('HH:mm') : '—',
                horaSalida: values.horaSalida.format('HH:mm'),
            };
            if (editingTurno) {
                // Edit existing turno
                setTurnos((prev) =>
                    prev.map((turno) => (turno.id === editingTurno.id ? { ...turno, ...formattedValues } : turno))
                );
                message.success('Turno editado correctamente.');
            } else {
                // Add new turno
                setTurnos((prev) => [...prev, { id: Date.now(), ...formattedValues }]);
                message.success('Nuevo turno añadido.');
            }
            form.resetFields();
            setEditingTurno(null);
            setIsModalVisible(false);
        } catch (error) {
            message.error('Error al guardar los datos del turno.');
        }
    };

    const handleDeleteTurno = (id) => {
        setTurnos((prev) => prev.filter((turno) => turno.id !== id));
        message.success('Turno eliminado correctamente.');
    };

    const openModal = (turno = null) => {
        setEditingTurno(turno);
        if (turno) {
            form.setFieldsValue({
                ...turno,
                horaEntrada: moment(turno.horaEntrada, 'HH:mm'),
                horaSalidaComida: turno.horaSalidaComida !== '—' ? moment(turno.horaSalidaComida, 'HH:mm') : null,
                horaEntradaComida: turno.horaEntradaComida !== '—' ? moment(turno.horaEntradaComida, 'HH:mm') : null,
                horaSalida: moment(turno.horaSalida, 'HH:mm'),
            });
        } else {
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setEditingTurno(null);
        setIsModalVisible(false);
    };

    const columns = [
        { title: 'Nombre del Turno', dataIndex: 'nombre', key: 'nombre' },
        { title: 'Tipo Jornada', dataIndex: 'tipoJornada', key: 'tipoJornada' },
        { title: 'Hora Entrada', dataIndex: 'horaEntrada', key: 'horaEntrada' },
        { title: 'Hora Salida Comida', dataIndex: 'horaSalidaComida', key: 'horaSalidaComida' },
        { title: 'Hora Entrada Comida', dataIndex: 'horaEntradaComida', key: 'horaEntradaComida' },
        { title: 'Hora Salida', dataIndex: 'horaSalida', key: 'horaSalida' },
        {
            title: 'Acciones',
            key: 'acciones',
            render: (_, record) => (
                <Row gutter={16} justify="start">
                    <Col>
                        <Button
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => openModal(record)}
                        >
                            Editar
                        </Button>
                    </Col>
                    <Col>
                        <Popconfirm
                            title="¿Estás seguro de eliminar este turno?"
                            onConfirm={() => handleDeleteTurno(record.id)}
                            okText="Sí"
                            cancelText="No"
                        >
                            <Button type="link" icon={<DeleteOutlined />} danger>
                                Eliminar
                            </Button>
                        </Popconfirm>
                    </Col>
                </Row>
            ),
        },
    ];

    return (
        <Card title={<Title level={2}>Gestionar Turnos</Title>} className="gturnos-card">
            <Table
                dataSource={turnos}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                scroll={{ x: '100%' }}
            />
            <Row justify="center" className="gturnos-add-row">
                <Col xs={24} sm={12} md={8} lg={6} xl={4} xxl={4}>
                    <Button 
                        className="colorPrincipal gturnos-add-btn"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openModal()}
                    >
                        Añadir Turno
                    </Button>
                </Col>
            </Row>

            <Modal
                title={editingTurno ? 'Editar Turno' : 'Añadir Turno'}
                open={isModalVisible}
                onCancel={closeModal}
                onOk={handleAddOrEditTurno}
                okText="Guardar"
                cancelText="Cancelar"
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="nombre"
                        label="Nombre del Turno"
                        rules={[{ required: true, message: 'Por favor, ingresa el nombre del turno' }]}
                    >
                        <Input placeholder="Ej. Turno Mañana" />
                    </Form.Item>
                    <Form.Item
                        name="tipoJornada"
                        label="Tipo Jornada"
                        rules={[{ required: true, message: 'Por favor, selecciona el tipo de jornada' }]}
                    >
                        <Input placeholder="Ej. Completa, Media Jornada" />
                    </Form.Item>
                    <Form.Item
                        name="horaEntrada"
                        label="Hora Entrada"
                        rules={[{ required: true, message: 'Por favor, selecciona la hora de entrada' }]}
                    >
                        <TimePicker format="HH:mm" />
                    </Form.Item>
                    <Form.Item
                        name="horaSalidaComida"
                        label="Hora Salida Comida"
                    >
                        <TimePicker format="HH:mm" />
                    </Form.Item>
                    <Form.Item
                        name="horaEntradaComida"
                        label="Hora Entrada Comida"
                    >
                        <TimePicker format="HH:mm" />
                    </Form.Item>
                    <Form.Item
                        name="horaSalida"
                        label="Hora Salida"
                        rules={[{ required: true, message: 'Por favor, selecciona la hora de salida' }]}
                    >
                        <TimePicker format="HH:mm" />
                    </Form.Item>
                    <Form.Item
                        name="totalHoras"
                        label="Horas Totales"
                        className="gturnos-total"
                        rules={[{ required: true, message: 'Por favor, selecciona la hora de salida' }]}
                    >
                        <Input placeholder="Ej. Turno Mañana" />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default GestionTurnosCard;
