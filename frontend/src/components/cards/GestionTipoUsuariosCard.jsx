import React, { useState, useEffect } from 'react';
import { Tooltip,Card, Typography, Table, Button, Collapse, Modal, Form, Input, TimePicker, message, Checkbox, Select, Row, Col } from 'antd';
import { EditOutlined,InfoCircleOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';  // Iconos para los botones de editar, eliminar, añadir y guardar
import moment from 'moment';  // Importar moment.js para formatear fechas y horas correctamente
import { crearJornada,obtenerUsuariosJornadas, deleteJornada,editarJornada,obtenerJornadasByIdEmpresa } from "../../features/jornada/jornadaService";
import dayjs from 'dayjs';
import 'dayjs/locale/es';  
import AnadirDiaCard from './AnadirDiaCard'; // Importar el nuevo componente
import RegistroDiaCard from './RegistroDiaCard'; // Importar el nuevo componente
import './GestionTipoUsuariosCard.css';

dayjs.locale('es');  

const { Title } = Typography;
const { Panel } = Collapse;
const { Option } = Select;
const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const GestionTipoUsuariosCard = () => {
    const [tiposJornada, setTiposJornada] = useState([]);  // Cambiado para usar datos obtenidos de la API
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isModalEditReady, setIsModalEditReady] = useState(false);
    const [tipoJornadaEdit, setTipoJornadaEdit] = useState('');
    const [diasSeleccionados, setDiasSeleccionados] = useState([]);
    const [tipoJornada, setTipoJornada] = useState('');  // Estado para el tipo de jornada seleccionado
    const [tipoJornadaData, setTipoJornadaData] = useState(null); // Almacena los datos de tipo jornada


    const WeekDaysForm = () => {
        const [form] = Form.useForm();
      
        };
    
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

    useEffect(() => {
        
        if (tipoJornadaData && tipoJornadaData.registros) {
            
            const reg1 = tipoJornadaData.registros[0];
            const reg2 = tipoJornadaData.registros[1];
    
           
                // Inicializar los valores del formulario
                editForm.setFieldsValue({
                    nombreEdit: tipoJornadaData.jornada_nombre,
                    idJornada : tipoJornadaData.id_jornada,
                    tipo_jornadaEdit: tipoJornadaData.tipo, // Verifica si 'tipo' está disponible en tipoJornadaData
                    legalEdit: tipoJornadaData.tipo_hora,
                    nombre1Edit: reg1.registro_nombre,
                    idRegistro1: reg1.id_registro_jornada,
                    hora_entrada1Edit: reg1.hora_entrada ? dayjs(reg1.hora_entrada, 'HH:mm:ss') : null,
                    hora_salida1Edit: reg1.hora_salida ? dayjs(reg1.hora_salida, 'HH:mm:ss') : null,
                    descansos1Edit: reg1.descansos,
                    nombre2Edit: reg2 ? reg2.registro_nombre : null,
                    idRegistro2: reg2.id_registro_jornada? reg2.id_registro_jornada : null,
                    hora_entrada2Edit: reg2 && reg2.hora_entrada ? dayjs(reg2.hora_entrada, 'HH:mm:ss') : null,
                    hora_salida2Edit: reg2 && reg2.hora_salida ? dayjs(reg2.hora_salida, 'HH:mm:ss') : null,
                    descansos2Edit: reg2 ? reg2.descansos : null,
                });

                setTipoJornadaEdit(tipoJornadaData.tipo);
                setIsModalEditReady(true);
                setIsEditModalVisible(true);
            
           
        }
    }, [tipoJornadaData]);  // Este useEffect se ejecuta cuando `tipoJornadaData` cambia
    
    const handleEdit = (tipo) => {
        setTipoJornadaData(tipo);  // Guarda los datos del tipo de jornada
    };

    const editJornada = async () => {
        // Obtener todos los valores del formulario de edición
        const formData = editForm.getFieldsValue();
        
        // Organizar los datos para enviarlos correctamente al backend
        const updatedJornada = {
            id_jornada: editForm?.getFieldValue('idJornada'), // ID de la jornada almacenado en `editFormData`
            jornada_nombre: formData.nombreEdit, // Nombre de la jornada del formulario
            tipo: formData.tipo_jornadaEdit, // Tipo de jornada (Continua o Partida)
            tipo_hora: formData.legalEdit, // Tipo de hora (Extra, Complementaria, Bolsa)
            registros: [
                {
                    id_registro: formData.idRegistro1, // ID del primer registro
                    registro_nombre: formData.nombre1Edit, // Nombre del primer registro
                    hora_entrada: formData.hora_entrada1Edit ? formData.hora_entrada1Edit.format('HH:mm:ss') : null,
                    hora_salida: formData.hora_salida1Edit ? formData.hora_salida1Edit.format('HH:mm:ss') : null,
                    descansos: formData.descansos1Edit, // Número de descansos para el primer registro
                },
                formData.nombre2Edit && {
                    id_registro: formData.idRegistro2, // ID del segundo registro (si existe)
                    registro_nombre: formData.nombre2Edit, // Nombre del segundo registro
                    hora_entrada: formData.hora_entrada2Edit ? formData.hora_entrada2Edit.format('HH:mm:ss') : null,
                    hora_salida: formData.hora_salida2Edit ? formData.hora_salida2Edit.format('HH:mm:ss') : null,
                    descansos: formData.descansos2Edit, // Número de descansos para el segundo registro
                }
            ].filter(Boolean), // Filtra los registros vacíos
        };
    
        try {
            // Llamar al servicio de editar jornada con los datos organizados
            await editarJornada(updatedJornada);
    
            // Cerrar el modal y actualizar la vista
            message.success('Jornada editada correctamente');
            setIsEditModalVisible(false);
            handleReload(); // Asumimos que tienes esta función para recargar la vista
        } catch (error) {
            console.error('Error al editar jornada:', error);
            message.error('Error al editar la jornada');
        }
    };
    
    const handleDeleteTipo = async (tipoId) => {

        const usuJornadas = await obtenerUsuariosJornadas();
        if(usuJornadas && usuJornadas.length > 0){
            message.error('Existen usuarios asignados a esta jornada');
            return;

        }
        const data = await deleteJornada(tipoId);

        const updatedTiposJornada = tiposJornada.filter((tipo) => tipo.id !== tipoId);
        setTiposJornada(updatedTiposJornada);
        if(!data){
            message.error('Error eliminando jornada');

        }else{
            message.success('Tipo de jornada eliminado correctamente');
            handleReload();

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
            <Title level={2}>Gestionar Tipos de Jornada</Title>
            <p>Aquí puedes gestionar los tipos de jornada y sus registros asociados.</p>

            <Button
                type="Success"
                icon={<PlusOutlined />}
                onClick={() => setIsAddModalVisible(true)}
                className="gtu-add-btn"
            >
                Añadir Tipo de Jornada
            </Button>
            <Collapse>
            {tiposJornada.map((tipo, index) => (
                <Panel header={tipo.nombre} key={tipo.id || `tipo-${index}`}>
                    <RegistroDiaCard  
                    tipo={tipo} 
                    onEdit={handleEdit} 
                    onDelete={handleDeleteTipo} 
                    />
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
                                  {diasSeleccionados.map((d) => (
                                    <AnadirDiaCard key={d} dia={d} form={addForm} />
                                    ))}


                                </>
                            )}
                        </Card>
                </Form>
            </Modal>  
                    
        </Card>
    );
};

export default GestionTipoUsuariosCard;
