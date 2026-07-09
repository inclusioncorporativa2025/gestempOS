import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Card, Table, Input, Button, Modal, Tooltip, Popconfirm, Form, message, Typography, DatePicker, Switch, Select, ConfigProvider, Dropdown } from 'antd';
import GradientButton from '../components/shared/GradientButton';
import { SearchOutlined, EditOutlined, StopOutlined, EyeOutlined, DownloadOutlined, UserAddOutlined, UploadOutlined, MoreOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { getUsuariosEmpresa, deleteUsuario, editUsuario, getHorasTotalesMesByIdUsuario, descargarExcelDesdeAPI } from "../../features/user/usuarioService";
import { getDatosUsuarioById } from '../../features/fichaje/fichajeService';
import { obtenerJornadas } from "../../features/jornada/jornadaService";
import { parseFechaFichaje } from '../../utils/fechaFichaje';

import dayjs from 'dayjs';
import 'dayjs/locale/es';
import esES from 'antd/es/locale/es_ES';
import { getTipoUsuario, getIdUsuario } from '../../utils/authSession';
import {
  puedeVerFichaPersonal,
  esAdministradorEmpresa,
  esInspector,
  valorTipoUsuarioForm,
} from '../../utils/tipoUsuarioLabel';
import { opcionesTipoHora, tipoHoraFormValue } from '../../utils/tipoHora';
import AltaEmpleadoModal from '../components/AltaEmpleadoModal';
import './BuscadorUsuarios.css';
dayjs.locale('es');

const { Title } = Typography;

const esUsuarioActivo = (usuario) => usuario.activo !== false && usuario.activo !== 0;

const BuscarUsuarios = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const tipoUsuario = getTipoUsuario();
    const idUsuarioSesion = getIdUsuario();
    const verFichaPersonal = puedeVerFichaPersonal(tipoUsuario);
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
    const [filtroActivo, setFiltroActivo] = useState('activos');
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [exportDateRange, setExportDateRange] = useState(null);
    const [altaEmpleadoOpen, setAltaEmpleadoOpen] = useState(false);

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

    useEffect(() => {
        const q = location.state?.headerSearch;
        if (typeof q === 'string' && q.trim()) {
            setSearchText(q.trim());
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, location.pathname, navigate]);

    const contadores = useMemo(() => {
        const activos = usuarios.filter(esUsuarioActivo).length;
        return {
            activos,
            inactivos: usuarios.length - activos,
        };
    }, [usuarios]);

    const filteredUsuarios = usuarios.filter((usuario) => {
        const matchesSearch =
            usuario.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
            usuario.email.toLowerCase().includes(searchText.toLowerCase()) ||
            usuario.dni.toLowerCase().includes(searchText.toLowerCase());

        const activo = esUsuarioActivo(usuario);
        const matchesActivo = filtroActivo === 'activos' ? activo : !activo;

        return matchesSearch && matchesActivo;
    });

    const irAAltaUsuarios = (section) => {
        navigate(APP_ROUTES.usersAdd, { state: { section } });
    };

    const menuMasAcciones = {
        items: [
            {
                key: 'import',
                label: 'Importar usuarios',
                icon: <UploadOutlined />,
                onClick: () => irAAltaUsuarios('importUsers'),
            },
            {
                key: 'inspector',
                label: 'Invitar inspector',
                icon: <UserAddOutlined />,
                onClick: () => irAAltaUsuarios('addInspector'),
            },
        ],
    };

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
                const fechaEntrada = parseFechaFichaje(item.fecha_entrada);
                return fechaEntrada?.isSame(selectedDate, 'month');
            });
            const registrosConDetalles = filteredHoras.map((item) => {
                const horaEntrada = parseFechaFichaje(item.fecha_entrada);
                const horaSalida = item.fecha_salida ? parseFechaFichaje(item.fecha_salida) : null;
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

    const irAFichaPersonal = (record) => {
        navigate(`${APP_ROUTES.users}/${record.id_usuario}`);
    };

    const handleViewDetailsDrawer = (record) => {
        setVisible(true);
        setEditingRecord(record);
        getDatosUsuarioById(record.id_usuario).then((result) => {
            const filteredHoras = result.info.filter((item) => {
                const fechaEntrada = parseFechaFichaje(item.fecha_entrada);
                return fechaEntrada?.isSame(dayjs(), 'month');
            });
            const registrosConDetalles = filteredHoras.map((item) => {
                const horaEntrada = parseFechaFichaje(item.fecha_entrada);
                const horaSalida = item.fecha_salida ? parseFechaFichaje(item.fecha_salida) : null;
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
            tipoUsuario: valorTipoUsuarioForm(record.tipo_usuario),
            horario: jornadaNombre? jornadaNombre:"",
            tipoHora: tipoHoraFormValue(record.tipo_hora),
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

    const handleDarDeBaja = async (idUsuario) => {
        try {
            await deleteUsuario(idUsuario);
            message.success('Personal dado de baja correctamente');
            await fetchUsuarios();
        } catch (error) {
            console.error('Error al dar de baja al empleado:', error);
            message.error(error.message || 'No se pudo dar de baja al personal');
        }
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
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (nombre, record) => (
                verFichaPersonal ? (
                    <Button
                        type="link"
                        className="bu-nombre-link"
                        onClick={() => irAFichaPersonal(record)}
                    >
                        {nombre}
                    </Button>
                ) : nombre
            ),
        },
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
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                className="bu-accion-btn bu-accion-btn--edit"
                                onClick={() => handleEdit(record)}
                                aria-label="Editar"
                            />
                        </Tooltip>
                    )}
                    {tipoUsuario !== 6
                        && record.activo !== false
                        && record.activo !== 0
                        && Number(record.id_usuario) !== Number(idUsuarioSesion) && (
                        <Tooltip title="Dar de baja">
                            <Popconfirm
                                title="¿Dar de baja a este personal?"
                                description="No se borran sus datos ni sus fichajes; solo dejará de estar activo en la empresa."
                                onConfirm={() => handleDarDeBaja(record.id_usuario)}
                                okText="Dar de baja"
                                cancelText="Cancelar"
                            >
                                <Button
                                    type="text"
                                    danger
                                    icon={<StopOutlined />}
                                    className="bu-accion-btn"
                                    aria-label="Dar de baja"
                                />
                            </Popconfirm>
                        </Tooltip>
                    )}
                    <Tooltip title={verFichaPersonal ? 'Ver ficha' : 'Detalles'}>
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            className="bu-accion-btn"
                            onClick={() => (
                              verFichaPersonal
                                ? irAFichaPersonal(record)
                                : handleViewDetailsDrawer(record)
                            )}
                            aria-label={verFichaPersonal ? 'Ver ficha de personal' : 'Detalles'}
                        />
                    </Tooltip>
                    <Tooltip title="Exportar">
                        <Button
                            type="text"
                            icon={<DownloadOutlined />}
                            className="bu-accion-btn"
                            onClick={() => setVisibleModalExportar(record.id_usuario)}
                            aria-label="Exportar"
                        />
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
            <div className="bu-page">
            <Card>
                <div className="bu-stats">
                    <button
                        type="button"
                        className={`bu-stat bu-stat--activos ${filtroActivo === 'activos' ? 'bu-stat--selected' : ''}`}
                        onClick={() => setFiltroActivo('activos')}
                        aria-pressed={filtroActivo === 'activos'}
                    >
                        <span className="bu-stat-value">{contadores.activos}</span>
                        <span className="bu-stat-label">Activos</span>
                    </button>
                    <button
                        type="button"
                        className={`bu-stat bu-stat--inactivos ${filtroActivo === 'inactivos' ? 'bu-stat--selected' : ''}`}
                        onClick={() => setFiltroActivo('inactivos')}
                        aria-pressed={filtroActivo === 'inactivos'}
                    >
                        <span className="bu-stat-value">{contadores.inactivos}</span>
                        <span className="bu-stat-label">No activos</span>
                    </button>
                </div>

                <div className="bu-toolbar">
                    <Input
                        placeholder="Buscar por nombre, correo o DNI"
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={handleSearch}
                        className="bu-search"
                    />

                    <div className="bu-toolbar-actions">
                        <GradientButton
                            text="Agregar"
                            iconStart={<UserAddOutlined />}
                            className="bu-add-btn"
                            onClick={() => setAltaEmpleadoOpen(true)}
                        />
                        <Dropdown menu={menuMasAcciones} trigger={['click']} placement="bottomRight">
                            <Button
                                type="text"
                                className="bu-more-btn"
                                icon={<MoreOutlined />}
                                aria-label="Más acciones"
                            />
                        </Dropdown>
                    </div>
                </div>

                <AltaEmpleadoModal
                    open={altaEmpleadoOpen}
                    onClose={() => setAltaEmpleadoOpen(false)}
                    onSuccess={fetchUsuarios}
                />

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
                    pagination={{ pageSize: 8, hideOnSinglePage: true }}
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
                        <Select
                            disabled={
                              esAdministradorEmpresa(editingRecord?.tipo_usuario)
                              || esInspector(editingRecord?.tipo_usuario)
                            }
                        >
                            {esAdministradorEmpresa(editingRecord?.tipo_usuario) ? (
                            <Select.Option value="3">Administrador</Select.Option>
                            ) : esInspector(editingRecord?.tipo_usuario) ? (
                            <Select.Option value="6">Inspector</Select.Option>
                            ) : (
                            <>
                                <Select.Option value="5">Personal</Select.Option>
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
                        <Form.Item
                            label="Tipo de hora"
                            name="tipoHora"
                            tooltip="Heredar usa el tipo configurado en la jornada del empleado."
                        >
                            <Select options={opcionesTipoHora} />
                        </Form.Item>
                    </Form>
                </Modal>
            </Card>
            </div>
        </ConfigProvider>
    );
};

export default BuscarUsuarios;
