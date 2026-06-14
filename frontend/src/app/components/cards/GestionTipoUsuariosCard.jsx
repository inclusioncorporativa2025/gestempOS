import React, { useState, useEffect } from 'react';
import { Tooltip,Card, Table, Button, Collapse, Modal, Form, Input, TimePicker, message, Checkbox, Select, Row, Col } from 'antd';
import GradientButton from '../shared/GradientButton';
import { EditOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { crearJornada, editarJornada, obtenerJornadasByIdEmpresa } from "../../../features/jornada/jornadaService";
import dayjs from 'dayjs';
import 'dayjs/locale/es';  
import AnadirDiaCard from './AnadirDiaCard';
import RegistroDiaCard from './RegistroDiaCard';
import HorarioSemanalGenerador from './HorarioSemanalGenerador';
import './GestionTipoUsuariosCard.css';

dayjs.locale('es');  

const { Panel } = Collapse;
const { Option } = Select;
const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const parseColumn1 = (tipo) => {
    if (!tipo?.column1) return {};
    if (typeof tipo.column1 === 'string') {
        try {
            return JSON.parse(tipo.column1);
        } catch {
            return {};
        }
    }
    return tipo.column1;
};

const GestionTipoUsuariosCard = () => {
    const [tiposJornada, setTiposJornada] = useState([]);  // Cambiado para usar datos obtenidos de la API
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [tipoJornadaEdit, setTipoJornadaEdit] = useState('');
    const [diasSeleccionados, setDiasSeleccionados] = useState([]);
    const [tipoJornada, setTipoJornada] = useState('');
        const obtenerJornadasEmpresa = async () => {
            try {
              const response = await obtenerJornadasByIdEmpresa(); 
              if (response && response.jornadas) {
                setTiposJornada(response.jornadas); // Aquí seteamos las jornadas recuperadas
              }
            } catch (error) {
              console.error('Error al obtener las jornadas:', error);
            }
          };
          
    useEffect(() => {
        obtenerJornadasEmpresa();
    }, []);

    const handleEdit = (tipo) => {
        const config = parseColumn1(tipo);
        setTipoJornadaEdit(String(tipo.tipo));
        editForm.setFieldsValue({
            idJornada: tipo.id_jornada,
            nombreEdit: tipo.nombre,
            tipo_jornadaEdit: String(tipo.tipo),
            legalEdit: String(tipo.tipo_hora),
            horasMensualesEdit: config.horasMensuales || '',
        });
        setIsEditModalVisible(true);
    };

    const editJornadaSubmit = async () => {
        try {
            const values = await editForm.validateFields();
            await editarJornada({
                id_jornada: values.idJornada,
                nombre: values.nombreEdit,
                tipo_hora: values.legalEdit,
                horasMensuales: values.horasMensualesEdit,
            });
            message.success('Jornada actualizada correctamente');
            setIsEditModalVisible(false);
            handleReload();
        } catch (error) {
            if (error?.errorFields) return;
            message.error(error.message || 'Error al editar la jornada');
        }
    };

    const handleReload = () => {
        obtenerJornadasEmpresa();
    };
      
    const handleCancel = () => {
        setIsAddModalVisible(false);
    };
    const handleAdd = () => {
        addForm.validateFields().then((values) => {

            let valid = true; // Flag para validar
            var newTipo;
            if(values.tipo_jornada==='2'){
                newTipo = {
                    id: tiposJornada.length + 1, // ID generado dinámicamente
                    nombre: values.nombre,
                    tipo_jornada: tipoJornada, // Asignar tipo de jornada aquí
                    tipo_hora: values.legal ,
                    horasMensuales: values.horasMensuales ,  // Aquí se van a almacenar los registros de la jornada
                };
        
            }else{

            // Verificar si al menos uno de los días de la semana tiene registros
            const tieneDiasSeleccionados = diasSemana.some(dia => values[dia] && (Array.isArray(values[dia]) ? values[dia].length > 0 : true));
    
            // Si no hay días seleccionados con registros, no mostrar error
            if (!tieneDiasSeleccionados) {
                message.error('Debe seleccionar al menos un día con registros.');
                return; // Detener la ejecución si no hay días seleccionados
            }
    
            // Crear el nuevo tipo de jornada a partir de los valores del formulario
            newTipo = {
                id: tiposJornada.length + 1, // ID generado dinámicamente
                nombre: values.nombre,
                tipo_jornada: tipoJornada, // Asignar tipo de jornada aquí
                tipo_hora: values.legal ,
                registros: [],  // Aquí se van a almacenar los registros de la jornada
            };
    
    
            // Recorremos los días seleccionados
            diasSemana.forEach((dia) => {
                let registrosDia = values[dia];
    
                if (registrosDia) {
                    // Si no es un array, conviértelo en uno
                    if (!Array.isArray(registrosDia)) {
                        registrosDia = [registrosDia];
                    }
    
                    // Ordenar los registros para que la validación sea coherente
                    registrosDia = registrosDia.sort((a, b) => moment(a.entrada).isBefore(b.entrada) ? -1 : 1);
    
                    registrosDia.forEach((registro, index) => {
                        const horaEntrada = moment(new Date(registro.horarios[0].hora_entrada));
                        const horaSalida = moment(new Date(registro.horarios[0].hora_salida));
                        var horaEntrada2;
                        var horaSalida2;
                            if(registro.tipo_horario === '2'){
                                horaEntrada2 = moment(new Date(registro.horarios[0].hora_entrada2));
                                horaSalida2 = moment(new Date(registro.horarios[0].hora_salida2));

                                // Verificar que las horas de entrada y salida estén presentes
                            if (!horaEntrada2.isValid() || !horaSalida2.isValid()) {
                                message.error(`Por favor ingresa tanto la hora de entrada 2 como la hora de salida 2 para el día ${dia}, registro 2`);
                                valid = false;
                                return;
                            }
                            // Validar que la hora de salida sea posterior a la hora de entrada
                            if (horaEntrada2.isSameOrAfter(horaSalida2)) {
                                message.error(`La hora de salida 2 debe ser posterior a la hora de entrada 2 en el día ${dia}, registro 2`);
                                valid = false;
                                return;
                            }
                        }
                      

                        // Verificar que las horas de entrada y salida estén presentes
                        if (!horaEntrada.isValid() || !horaSalida.isValid()) {
                            message.error(`Por favor ingresa tanto la hora de entrada como la hora de salida para el día ${dia}, registro ${index + 1}`);
                            valid = false;
                            return;
                        }
    
                        // Validar que la hora de salida sea posterior a la hora de entrada
                        if (horaEntrada.isSameOrAfter(horaSalida)) {
                            message.error(`La hora de salida debe ser posterior a la hora de entrada en el día ${dia}, registro ${index + 1}`);
                            valid = false;
                            return;
                        }
    
                      
                        // Validar que la hora de entrada no sea anterior a la hora de salida del registro anterior
                        if (index > 0) {
                            const prevRegistro = registrosDia[index - 1];
                            const prevHoraSalida = moment(new Date(prevRegistro.salida));
    
                            if (horaEntrada.isBefore(prevHoraSalida)) {
                                message.error(`La hora de entrada del registro ${index + 1} debe ser posterior a la hora de salida del registro anterior en el día ${dia}`);
                                valid = false;
                                return;
                            }
                        }
    
                        // Validar que no se solapen los horarios con los registros anteriores en `newTipo.registros`
                        for (let i = 0; i < newTipo.registros.length; i++) {
                            const prevRegistro = newTipo.registros[i];
                            const prevHoraSalida = moment(prevRegistro.hora_salida);
                            const currHoraEntrada = moment(new Date(registro.entrada));
    
                            if (currHoraEntrada.isBefore(prevHoraSalida)) {
                                message.error(`Los horarios de los registros en el día ${dia} se solapan.`);
                                valid = false;
                                return;
                            }
                        }
    
                        // Si todo es válido, agregar el registro al nuevo tipo de jornada
                        newTipo.registros.push({
                            hora_entrada: horaEntrada?.format('HH:mm:ss'),
                            hora_salida: horaSalida?.format('HH:mm:ss'),
                            // Solo agregamos si existe el valor, de lo contrario no incluimos la propiedad
                            ...(horaEntrada2 ? { hora_entrada2: horaEntrada2.format('HH:mm:ss') } : {}),
                            ...(horaSalida2 ? { hora_salida2: horaSalida2.format('HH:mm:ss') } : {}),
                            dia: dia,
                            tipo_horario: registro.tipo_horario
                          });
                    });
                }
            });
        }
    
            if (valid) {
                crearJornada(newTipo)
                    .then(() => {
                        setTiposJornada([...tiposJornada, newTipo]);
                        setIsAddModalVisible(false);
                        message.success('Nuevo tipo de jornada añadido correctamente');
                        handleReload();
                    })
                    .catch((error) => {
                        message.error('Error al crear el tipo de jornada');
                        console.error(error);
                    });
            }
    
        }).catch((error) => {
            message.error('Faltan campos requeridos o validación fallida');
        });
    };
    

    const [editForm] = Form.useForm();
    const [addForm] = Form.useForm();
    return (
        <Card >
            <p>Aquí puedes gestionar los tipos de jornada y sus registros asociados.</p>

            <div className="gtu-add-btn-row">
                <GradientButton
                    text="Añadir"
                    iconStart={<PlusOutlined />}
                    size="small"
                    onClick={() => setIsAddModalVisible(true)}
                    className="gtu-add-btn"
                />
            </div>
            <Collapse className="gtu-jornada-collapse">
            {tiposJornada.map((tipo, index) => (
                <Panel
                    header={tipo.nombre}
                    key={tipo.id_jornada || `tipo-${index}`}
                    extra={
                        <Tooltip title="Editar jornada">
                            <Button
                                type="text"
                                className="gtu-panel-edit-btn"
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(tipo);
                                }}
                                aria-label="Editar jornada"
                            />
                        </Tooltip>
                    }
                >
                    <RegistroDiaCard tipo={tipo} />
                </Panel>
            ))}
            </Collapse>

            <Modal
                title="Añadir Nuevo Tipo de Jornada"
                open={isAddModalVisible}
                onOk={handleAdd}
                onCancel={handleCancel}
                okText="Añadir"
                cancelText="Cancelar"
                width="60%"
            >
                <Form
                    form={addForm}
                    layout="vertical"
                    name="generalForm"
                >
                    <Row gutter={24}>
                        <Col xs={24} sm={12} md={12} lg={12} xl={8} >
                            <Form.Item
                                label="Nombre"
                                name="nombre"
                                rules={[{ required: true, message: 'Por favor ingresa el nombre del tipo de jornada' }]} >
                                <Input placeholder="Ej. Jornada 1" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={12} lg={12} xl={8} >
                            <Form.Item
                                label="Tipo de Jornada"
                                name="tipo_jornada"
                                rules={[{ required: true, message: 'Por favor selecciona el tipo de jornada' }]} >
                                <Select
                                    placeholder="Selecciona el tipo de jornada"
                                    onChange={(value) => setTipoJornada(value)}  // Establecer el tipo de jornada seleccionado
                                >
                                    <Option value="1">Fija</Option>
                                    <Option value="2">Flexible</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                       
                    <Col xs={24} sm={12} md={12} lg={12} xl={8} >
                        <Form.Item
                            label={
                                <>
                                    Tipo de Hora
                                    <Tooltip title={ <>
                            <b>Extra:</b> para jornadas completas. <br />
                            <b>Complementaria:</b> para jornadas en tiempo parcial. <br />
                            <b>Bolsa:</b> para otros casos.
                        </>}>
                                        <InfoCircleOutlined className="gtu-info-icon" />
                                    </Tooltip>
                                </>
                            }
                            name="legal"
                            rules={[{ required: true, message: 'Por favor selecciona el tipo de hora extra/complementaria' }]}
                        >
                            <Select placeholder="Selecciona el tipo de hora extra/complementaria">
                                <Option value="1">Extra</Option>
                                <Option value="2">Complementaria</Option>
                                <Option value="3">Bolsa de horas</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    {tipoJornada === '1' && (
                    <Col>
                        <Form.Item
                        name="dias"
                        label="Selecciona los días de la semana"
                        rules={[{ required: true, message: "Por favor selecciona al menos un día" }]}
                        >
                        <Checkbox.Group
                            options={diasSemana}
                            onChange={(checkedValues) => setDiasSeleccionados(checkedValues)}
                        />
                        </Form.Item>

                    </Col>
                    )}
                    </Row>
                    {/* Mostrar el formulario item1 e item2 solo cuando se selecciona un tipo de jornada */}
                        <Card>
                            {/* Mostrar item1 si se selecciona "Continua" */}
                            {tipoJornada === '2' && (
                                <Form.Item>
                                    <Row gutter={24}>
                        
                                        <Col span={8}>
                                            <Form.Item
                                                label="Horas mensuales"
                                                name="horasMensuales"
                                                rules={[{ required: true, message: 'Por favor ingresa el nombre del registro' }]} >
                                                <Input type='number' placeholder="Ej.100" className="gtu-input-full" />
                                            </Form.Item>
                                        </Col>
                                        
                                    </Row>
                                </Form.Item>
                            )}
                            {/* Mostrar item1 e item2 si se selecciona "Partida" */}
                            {tipoJornada === '1' && (
                                <>
                                  <HorarioSemanalGenerador
                                    form={addForm}
                                    diasSeleccionados={diasSeleccionados}
                                  />
                                  {diasSeleccionados.map((d) => (
                                    <AnadirDiaCard key={d} dia={d} form={addForm} />
                                  ))}
                                </>
                            )}
                        </Card>
                </Form>
            </Modal>

            <Modal
                title="Editar jornada"
                open={isEditModalVisible}
                onOk={editJornadaSubmit}
                onCancel={() => setIsEditModalVisible(false)}
                okText="Guardar"
                cancelText="Cancelar"
                destroyOnClose
            >
                <Form form={editForm} layout="vertical">
                    <Form.Item name="idJornada" hidden>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Nombre"
                        name="nombreEdit"
                        rules={[{ required: true, message: 'Introduce el nombre de la jornada' }]}
                    >
                        <Input placeholder="Ej. Jornada 1" />
                    </Form.Item>
                    <Form.Item label="Tipo de jornada" name="tipo_jornadaEdit">
                        <Select disabled>
                            <Option value="1">Fija</Option>
                            <Option value="2">Flexible</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        label="Tipo de hora"
                        name="legalEdit"
                        rules={[{ required: true, message: 'Selecciona el tipo de hora' }]}
                    >
                        <Select placeholder="Tipo de hora">
                            <Option value="1">Extra</Option>
                            <Option value="2">Complementaria</Option>
                            <Option value="3">Bolsa de horas</Option>
                        </Select>
                    </Form.Item>
                    {tipoJornadaEdit === '2' && (
                        <Form.Item
                            label="Horas mensuales"
                            name="horasMensualesEdit"
                            rules={[{ required: true, message: 'Introduce las horas mensuales' }]}
                        >
                            <Input type="number" placeholder="Ej. 160" className="gtu-input-full" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
                    
        </Card>
    );
};

export default GestionTipoUsuariosCard;
