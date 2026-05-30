import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Switch, Button, Modal, Input, Popconfirm, Select, Row, Col, message } from 'antd';
import { getTipoRegistro, guardarTipoAcceso } from '../../features/empresas/empresasService'; 
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import './GestionTipoAccesoCard.css';

const { Title } = Typography;
const { Option } = Select;

export var datosOriginales = null;

const GestionTipoAccesoCard = () => {
    const [tiposDeAcceso, setTiposDeAcceso] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newNombre, setNewNombre] = useState('');
    const [newTipoAcceso, setNewTipoAcceso] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);

    useEffect(() => {
        const fetchTiposDeAcceso = async () => {
            try {
                const response = await getTipoRegistro();
                datosOriginales = response;
                const tiposConKey = response.map(item => ({
                    key: item.id_tipo_acceso,
                    nombre: item.nombre,
                    activo: item.activo,
                    tipoAcceso: item.tipo,
                    nombreTipo: item.tipo === '0' ? 'Entrada' : 'Salida'
                }));
                setTiposDeAcceso(tiposConKey);
            } catch (error) {
                console.error('Error al obtener los tipos de acceso:', error);
            }
        };

        fetchTiposDeAcceso();
    }, []);

    const handleAddTipoAcceso = () => {
        const newKey = tiposDeAcceso.length ? tiposDeAcceso[tiposDeAcceso.length - 1].key + 1 : 1;
        const newTipoAccesoObj = {
            key: newKey,
            nombre: newNombre,
            tipoAcceso: newTipoAcceso,
            activo: true,
        };
        setTiposDeAcceso([...tiposDeAcceso, newTipoAccesoObj]);
        setNewNombre('');
        setNewTipoAcceso(null);
        setIsModalVisible(false);
    };

    const handleSwitchChange = (checked, record) => {
        const updatedTipos = tiposDeAcceso.map((tipo) =>
            tipo.key === record.key ? { ...tipo, activo: checked } : tipo
        );
        setTiposDeAcceso(updatedTipos);
    };

    const handleDelete = (key) => {
        const updatedTipos = tiposDeAcceso.filter((tipo) => tipo.key !== key);
        setTiposDeAcceso(updatedTipos);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setNewNombre(record.nombre);
        setNewTipoAcceso(record.tipoAcceso);
        setIsModalVisible(true);
    };

    const handleSaveEdit = () => {
        const updatedTipos = tiposDeAcceso.map((tipo) =>
            tipo.key === editingRecord.key ? { ...tipo, nombre: newNombre, tipoAcceso: newTipoAcceso } : tipo
        );
        setTiposDeAcceso(updatedTipos);
        setNewNombre('');
        setNewTipoAcceso(null);
        setIsModalVisible(false);
        setEditingRecord(null);
    };

    const handleSaveChanges = async () => {
        try {
            await guardarTipoAcceso(tiposDeAcceso, datosOriginales);
            message.success('Cambios guardados exitosamente');
        } catch (error) {
            message.error('Error modificando registros');

        }
    };

    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
        },
        {
            title: 'Tipo Acceso',
            dataIndex: 'tipoAcceso',
            key: 'tipoAcceso',
            render: (tipoAcceso) => (tipoAcceso === 0 ? 'Entrada' : 'Salida'),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            render: (activo, record) => (
                <Switch checked={activo} onChange={(checked) => handleSwitchChange(checked, record)} />
            ),
        },
        {
            title: 'Acción',
            key: 'action',
            render: (_, record) => (
                <Row gutter={[8, 8]} justify="center">
                    <Col>
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            size="small"
                            className="gta-action-btn"
                            onClick={() => handleEdit(record)}
                        >
                            Editar
                        </Button>
                    </Col>
                    <Col>
                        <Popconfirm
                            title="¿Seguro que deseas eliminar este tipo de acceso?"
                            onConfirm={() => handleDelete(record.key)}
                            okText="Sí"
                            cancelText="No"
                        >
                            <Button
                                type="danger"
                                icon={<DeleteOutlined />}
                                size="small"
                                className="gta-action-btn"
                            >
                                Eliminar
                            </Button>
                        </Popconfirm>
                    </Col>
                </Row>
            ),
        },
    ];

    return (
        <Card className="gta-card">
            <Title level={2}>Gestionar Tipo Acceso</Title>
            <Table
                dataSource={tiposDeAcceso}
                columns={columns}
                pagination={{ responsive: true }}
                scroll={{ x: 600 }}
            />
            <Row gutter={[16, 16]} className="gta-actions-row">
                <Col>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        className="gta-main-btn"
                        onClick={() => setIsModalVisible(true)}
                    >
                        Añadir Tipo Acceso
                    </Button>
                </Col>
                <Col>
                    <Button
                        type="primary"
                        className="gta-main-btn"
                        onClick={handleSaveChanges}
                    >
                        Guardar Cambios
                    </Button>
                </Col>
            </Row>

            <Modal
                title={editingRecord ? 'Editar Tipo de Acceso' : 'Añadir Nuevo Tipo de Acceso'}
                open={isModalVisible}
                onOk={editingRecord ? handleSaveEdit : handleAddTipoAcceso}
                onCancel={() => setIsModalVisible(false)}
                okText={editingRecord ? 'Guardar Cambios' : 'Añadir'}
                cancelText="Cancelar"
            >
                <Input
                    placeholder="Nombre del tipo de acceso"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                />
                <Select
                    placeholder="Selecciona el Tipo de Acceso"
                    value={newTipoAcceso}
                    onChange={(value) => setNewTipoAcceso(value)}
                    className="gta-select"
                >
                    <Option value={0}>Entrada</Option>
                    <Option value={1}>Salida</Option>
                </Select>
            </Modal>
        </Card>
    );
};

export default GestionTipoAccesoCard;
