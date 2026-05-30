import React, { useState, useEffect } from 'react';
import { Tag, Card, Table, Input, Button, Modal, Tooltip, Popconfirm, Form, message, Typography, DatePicker, Switch, Select, ConfigProvider } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { getUsuariosEmpresa, deleteUsuario, editUsuario, getHorasTotalesMesByIdUsuario, descargarExcelDesdeAPI } from "../features/user/usuarioService";
import { getDatosUsuarioById } from '../features/fichaje/fichajeService';
import { obtenerJornadas } from "../features/jornada/jornadaService";

import dayjs from 'dayjs';
import 'dayjs/locale/es';
import esES from 'antd/es/locale/es_ES';
import { getTipoUsuario } from '../utils/authSession';
import './BuscadorUsuarios.css';
dayjs.locale('es');

const { Title } = Typography;

const BuscarUsuarios = () => {
    const tipoUsuario = getTipoUsuario();
    const [usuarios, setUsuarios] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();
    const [visible, setVisible] = useState(false);
    const [registroHoras, setRegistroHoras] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(dayjs().startOf('month'));
    const [totalHoras, setTotalHoras] = useState(0);
    const [totalHorasEsperadas, setTotalHorasEsperadas] = useState(0);
    const [jornadas, setJornadas] = useState([]);
    const [jornadasCargadas, setJornadasCargadas] = useState(false);
    const [id_usuario, setIdUsuario] = useState(null);
    const [showOnlyActivos, setShowOnlyActivos] = useState(false);
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [exportDateRange, setExportDateRange] = useState(null);

    const formatDate = (date) => dayjs(date).format('DD/MM/YYYY');

    const fetchUsuarios = async () => {
        const usuarios = await getUsuariosEmpresa();
        setUsuarios(usuarios);
    };

    useEffect(() => {
        const obtenerJornadasEmpresa = async () => {
            const jornadasEmpresa = await obtenerJornadas();
            setJornadas(jornadasEmpresa);
        };
        fetchUsuarios();
        obtenerJornadasEmpresa();
    }, []);

    const filteredUsuarios = usuarios.filter((usuario) => {
        const matchesSearch =
            usuario.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
            usuario.email.toLowerCase().includes(searchText.toLowerCase()) ||
            usuario.dni.toLowerCase().includes(searchText.toLowerCase());

        const matchesActivo = showOnlyActivos ? usuario.activo : true;

        return matchesSearch && matchesActivo;
    });

    const handleSearch = (e) => setSearchText(e.target.value);

    const calcularHorasTotales = async (registroHoras,id_usuario) => {
        let total = 0;
        registroHoras.forEach((registro) => {
            const horaEntrada = dayjs(registro.hora_entrada, 'HH:mm');
            const horaSalida = registro.hora_salida ? dayjs(registro.hora_salida, 'HH:mm') : null;
            if (horaSalida && horaEntrada.isValid() && horaSalida.isValid()) {
                const diferencia = horaSalida.diff(horaEntrada, 'minute');
                total += diferencia;
            }
        });
        const horas = Math.floor(total / 60);
        const minutos = total % 60;
        setTotalHoras(`${horas}h ${minutos}m`);
        const jornadaUsuario = await getHorasTotalesMesByIdUsuario(selectedMonth.format('YYYY-MM'),id_usuario);
        setTotalHorasEsperadas(jornadaUsuario.horasMensuales);
    };

    const handleMonthChange = (date, dateString) => {
        if (!dateString) {
            message.error('Por favor, selecciona un mes');
            return;
        }
        const selectedDate = dayjs(dateString, 'MM/YYYY').startOf('month');
        if (!selectedDate.isValid()) {
            setSelectedMonth(null);
            setRegistroHoras([]);
            return;
        }
        setSelectedMonth(selectedDate);

        getDatosUsuarioById(editingRecord.id_usuario).then((result) => {
            const filteredHoras = result.info.filter((item) => {
                const fechaEntrada = dayjs(item.fecha_entrada);
                return fechaEntrada.isSame(selectedDate, 'month');
            });
            const registrosConDetalles = filteredHoras.map((item) => {
                const horaEntrada = dayjs(item.fecha_entrada);
                const horaSalida = item.fecha_salida ? dayjs(item.fecha_salida) : null;
                let dif_tiempo = 'No registrada';
                if (horaSalida && horaEntrada.isValid() && horaSalida.isValid()) {
                    const diffMinutes = horaSalida.diff(horaEntrada, 'minute');
                    const horas = Math.floor(diffMinutes / 60);
                    const minutos = diffMinutes % 60;
                    dif_tiempo = `${horas}h ${minutos}m`;
                }
                return {
                    fecha: horaEntrada.format('DD/MM/YYYY'),
                    hora_entrada: horaEntrada.format('HH:mm'),
                    hora_salida: horaSalida ? horaSalida.format('HH:mm') : 'No registrada',
                    tipo_entrada: item.tipo_entrada,
                    tipo_salida: item.tipo_salida,
                    dif_tiempo,
                };
            });
            
            registrosConDetalles.sort((a, b) => dayjs(b.fecha, 'DD/MM/YYYY').valueOf() - dayjs(a.fecha, 'DD/MM/YYYY').valueOf());
            setRegistroHoras(registrosConDetalles);
            calcularHorasTotales(registrosConDetalles,editingRecord.id_usuario);
        });
    };

    const handleViewDetailsDrawer = (record) => {
        setVisible(true);
        setEditingRecord(record);
        getDatosUsuarioById(record.id_usuario).then((result) => {
            const filteredHoras = result.info.filter((item) => {
                const fechaEntrada = dayjs(item.fecha_entrada);
                return fechaEntrada.isSame(dayjs(), 'month');
            });
            const registrosConDetalles = filteredHoras.map((item) => {
                const horaEntrada = dayjs(item.fecha_entrada);
                const horaSalida = item.fecha_salida ? dayjs(item.fecha_salida) : null;
                let dif_tiempo = 'No registrada';
                if (horaSalida && horaEntrada.isValid() && horaSalida.isValid()) {
                    const diffMinutes = horaSalida.diff(horaEntrada, 'minute');
                    const horas = Math.floor(diffMinutes / 60);
                    const minutos = diffMinutes % 60;
                    dif_tiempo = `${horas}h ${minutos}m`;
                }
                return {
                    fecha: horaEntrada.format('DD/MM/YYYY'),
                    hora_entrada: horaEntrada.format('HH:mm'),
                    hora_salida: horaSalida ? horaSalida.format('HH:mm') : 'No registrada',
                    tipo_entrada: item.tipo_entrada,
                    tipo_salida: item.tipo_salida,
                    dif_tiempo,
                    tipo : item.tipo
                };
            });
        registrosConDetalles.sort((a, b) => dayjs(b.fecha, 'DD/MM/YYYY').valueOf() - dayjs(a.fecha, 'DD/MM/YYYY').valueOf());
            setRegistroHoras(registrosConDetalles);
            calcularHorasTotales(registrosConDetalles,record.id_usuario);
        });
    };

    const handleEdit = async (record) => {
        setEditingRecord(record);
        const jornada = record.jornadas[0];
        var jornadaNombre;
        if(jornada){
            jornadaNombre = jornadas.find(j => j.id_jornada === jornada.id_jornada)?.nombre;
        }
    
        form.setFieldsValue({
            id_usuario:record.id_usuario,
            nombre: record.nombre,
            dni: record.dni,
            fechaAlta: dayjs(record.fecha_alta),
            activo: record.activo,
            tipoUsuario: record.tipo_usuario === "5" || record.tipo_usuario === "4" ? record.tipo_usuario : "3",
            horario: jornadaNombre? jornadaNombre:""
        });
    
        setJornadasCargadas(true);
        setIsModalVisible(true);
    };
    

    const handleSaveEdit = async () => {
        try {
            const values = await form.validateFields();
            const jornadaSeleccionada = jornadas.find(jornada => jornada.nombre === values.horario);
            if (jornadaSeleccionada) {
                values.horario = jornadaSeleccionada.id_jornada;
            } else {
                message.error('Jornada no encontrada');
                return;
            }

            
            await editUsuario(editingRecord.id_usuario, values);
            message.success("Usuario modificado correctamente");
            setIsModalVisible(false);
            setEditingRecord(null);
            form.resetFields();
            await fetchUsuarios();
        } catch (error) {
            console.error("Error al guardar los cambios:", error);
            message.error("Error al guardar los cambios");
        }
    };

    const handleDelete = async (key) => {
        await deleteUsuario(key);
        message.success("Usuario eliminado correctamente");
        await fetchUsuarios();
    };

    const columnsDetalles = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
        { title: 'Hora Entrada', dataIndex: 'hora_entrada', key: 'hora_entrada' },
        { title: 'Hora Salida', dataIndex: 'hora_salida', key: 'hora_salida' },
        { title: 'Dif. Tiempo', dataIndex: 'dif_tiempo', key: 'dif_tiempo' },
        { 
                title: 'Tipo', 
                dataIndex: 'tipo', 
                key: 'tipo',
                render: (tipo) => {
                    const config = {
                        fichaje:  { color: 'green',  label: 'Fichaje' },
                        ausencia: { color: 'red',    label: 'Ausencia' },
                        descanso: { color: 'orange', label: 'Descanso' },
                    };
                    const { color, label } = config[tipo];
                    return <Tag color={color}>{label}</Tag>;
                }
            },
        
    ];

    const columns = [
        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'DNI', dataIndex: 'dni', key: 'dni' },
        {
            title: 'Fecha Alta',
            dataIndex: 'fecha_alta',
            key: 'fecha_alta',
            render: (fecha_alta) => formatDate(fecha_alta),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            render: (activo) => (activo ? 'Sí' : 'No'),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            render: (_, record) => (
                <div className="bu-acciones">
                    {tipoUsuario !== 6 && (
                        <Tooltip title="Editar">
                            <Button icon={<EditOutlined />} type="primary" size="small" onClick={() => handleEdit(record)} />
                        </Tooltip>
                    )}
                    {tipoUsuario !== 6 && (
                        <Tooltip title="Eliminar">
                            <Popconfirm
                                title="¿Seguro que deseas eliminar este usuario?"
                                onConfirm={() => handleDelete(record.id_usuario)}
                                okText="Sí"
                                cancelText="No"
                            >
                                <Button icon={<DeleteOutlined />} type="danger" size="small" />
                            </Popconfirm>
                        </Tooltip>
                    )}
                    <Tooltip title="Detalles">
                        <Button icon={<EyeOutlined />} type="default" size="small" onClick={() => handleViewDetailsDrawer(record)} />
                    </Tooltip>
                    <Tooltip title="Exportar">
                        <Button icon={<DownloadOutlined />} type="default" size="small" onClick={() => setVisibleModalExportar(record.id_usuario)} />
                    </Tooltip>
                </div>
            ),
        },
    ];


    const setVisibleModalExportar =  (id_usuario)=> {
        setIdUsuario(id_usuario);
        setExportModalVisible(true);
    }
    const handleExport = () => {
        if (!id_usuario) {
            return message.error('Por favor, selecciona un usuario para exportar.');
        }
    
        if (!exportDateRange || exportDateRange.length !== 2) {
            return message.error('Por favor, selecciona un rango de meses válido.');
        }
    
        const [startMonth, endMonth] = exportDateRange;
    
        if (startMonth && endMonth) {
            const startDate = startMonth.startOf('month').format('YYYY-MM-DD');
            const endDate = endMonth.endOf('month').format('YYYY-MM-DD');
    
            descargarExcelDesdeAPI(startDate, endDate, id_usuario);
            setExportModalVisible(false);
        } else {
            message.error('Los meses seleccionados no son válidos.');
        }
    };

    return (
        <ConfigProvider locale={esES}>
            <Card>
                <div className="bu-toolbar">
                    <Input
                        placeholder="Buscar por nombre, correo o DNI"
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={handleSearch}
                        className="bu-search"
                    />

                    <div className="bu-activos">
                        <span className="bu-activos-label">Solo activos</span>
                        <Switch checked={showOnlyActivos} onChange={setShowOnlyActivos} />
                    </div>
                </div>

                {/* Modal de exportación */}
                <Modal
                    title="Exportar datos"
                    open={exportModalVisible}
                    onCancel={() => setExportModalVisible(false)}
                    onOk={handleExport}
                    okText="Descargar"
                    cancelText="Cancelar"
                >
                    <DatePicker.RangePicker
                        picker="month"
                        className="bu-full-width"
                        format="MM/YYYY"
                        onChange={(dates) => setExportDateRange(dates)}
                        disabledDate={(current) => current && current > dayjs()}
                    />
                </Modal>

                {/* Modal de detalles */}
                <Modal
                    open={visible}
                    onCancel={() => setVisible(false)}
                    footer={null}
                    width="80%"
                    className="bu-detalles-modal"
                    destroyOnClose
                >
                    <Card title={<Title className="bu-modal-title" level={2}>Registro mensual</Title>}>
                        <DatePicker
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            picker="month"
                            className="bu-month-picker"
                            format="MM/YYYY"
                            disabledDate={(current) => current && current > dayjs()}
                            placeholder="Selecciona un mes"
                        />
                        <Table
                            columns={columnsDetalles}
                            dataSource={registroHoras}
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 800 }}
                        />
                        <div className="bu-totales">
                            <span className="bu-total-sep">Total de horas trabajadas: {totalHoras}</span>
                            <span>Total de horas esperadas: {totalHorasEsperadas}</span>
                        </div>
                    </Card>
                </Modal>

                {/* Tabla de usuarios */}
                <Table
                    dataSource={filteredUsuarios}
                    columns={columns}
                    pagination={{ pageSize: 5 }}
                    scroll={{ x: 800 }}
                    rowKey="id_usuario"
                />

                {/* Modal de edición */}
                <Modal
                    title="Editar Usuario"
                    open={isModalVisible && jornadasCargadas}
                    onOk={handleSaveEdit}
                    onCancel={() => setIsModalVisible(false)}
                    okText="Guardar"
                    cancelText="Cancelar"
                >
                    <Form form={form} layout="vertical">
                        <Form.Item label="Nombre" name="nombre" rules={[{ required: true, message: 'Por favor, introduce el nombre' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="DNI" name="dni" rules={[{ required: true, message: 'Por favor, introduce el DNI' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Fecha Alta" name="fechaAlta">
                            <Input value={form.getFieldValue('fechaAlta') ? formatDate(form.getFieldValue('fechaAlta')) : ''} disabled />
                        </Form.Item>
                        <Form.Item label="Tipo Usuario" name="tipoUsuario">
                        <Select disabled={editingRecord?.tipo_usuario === "3"}>
                            {editingRecord?.tipo_usuario === "3" ? (
                            <Select.Option value="3">Administrador</Select.Option>
                            ) : (
                            <>
                                <Select.Option value="5">Empleado</Select.Option>
                                <Select.Option value="4">Supervisores</Select.Option>
                            </>
                            )}
                        </Select>
                        </Form.Item>
                        <Form.Item label="Activo" name="activo" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                        <Form.Item label="Horario" name="horario">
                            <Select>
                                {jornadas.map((jornada) => (
                                    <Select.Option key={jornada.id_jornada} value={jornada.nombre}>
                                        {jornada.nombre}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>
            </Card>
        </ConfigProvider>
    );
};

export default BuscarUsuarios;
