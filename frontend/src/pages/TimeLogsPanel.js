import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Button, Typography, Row, Col, Modal, Form, Input, TimePicker, message, Select, DatePicker, Checkbox } from 'antd';
import {  eliminarRegistro,crearPeticionEdicion,crearPeticionCierreMes,getPeticionesByIdUsuario,getPeticionesByIdEmpresa } from "../features/fichaje/fichajeService";
import { getDatosUsuarioById } from "../features/fichaje/fichajeService";
import { descargarExcelDesdeAPI } from "../features/user/usuarioService";
import { crearAusencia } from "../features/ausencias/ausenciasService";

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'; // Importa el plugin UTC
import timezone from 'dayjs/plugin/timezone'; // Importa el plugin Timezone
import moment from 'moment';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'; // <-- Importa el plugin

dayjs.extend(utc); // Extiende el uso de UTC
dayjs.extend(timezone); // Extiende el uso de Timezone
dayjs.extend(isSameOrBefore); // <-- Extiende dayjs

const { Title } = Typography;
const { Option } = Select;

const TimeLogsPanel = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);  // Estado para habilitar/deshabilitar el botón Enviar
    const [fichajesConPeticion, setFichajesConPeticion] = useState([]);
    const [mesesCerrados, setMesesCerrados] = useState([]);

const [mesesCierre, setMesesCierre] = useState([]);
const [exportModalVisible, setExportModalVisible] = useState(false);
const [absenceModalVisible, setAbsenceModalVisible] = useState(false);

const [exportDateRange, setExportDateRange] = useState(null);
const [id_usuario, setIdUsuario] = useState(null);
const [comentario, setComentario] = useState("");

const [selectedEntrada, setSelectedEntrada] = useState(null);
  const [todoElDia, setTodoElDia] = useState(false);
  const [horaDesde, setHoraDesde] = useState(null);
  const [horaHasta, setHoraHasta] = useState(null);
const entradas = ['Vacaciones','Baja','Asuntos Propios','Otros']

    const setVisibleModalExportar =  (id_usuario)=> {
        setIdUsuario(id_usuario);
        setExportModalVisible(true);
    }

    
 
// Método para añadir ausencia
const anadirAusencia = async () => {
  try {
    const idUsuario = parseInt(sessionStorage.getItem("idUsuario"));
    const idEmpresa = parseInt(sessionStorage.getItem("idEmpresa"));
    const usuario_alta = sessionStorage.getItem("usuario"); // o como lo tengas en sesión

    if (!exportDateRange || exportDateRange.length !== 2) {
      return message.error("Por favor, selecciona un rango de fechas válido.");
    }

    const [fechaDesde, fechaHasta] = exportDateRange;

    const fecha_desde = fechaDesde.format("DD-MM-YYYY");
    const fecha_hasta = fechaHasta.format("DD-MM-YYYY");

    // Si "todo el día" está marcado, se envían null las horas
    const hora_ausencia_desde = todoElDia ? null : horaDesde?.format("HH:mm:ss");
    const hora_ausencia_hasta = todoElDia ? null : horaHasta?.format("HH:mm:ss");

    const datos = await crearAusencia(
      idUsuario,
      idEmpresa,
      fecha_desde,
      fecha_hasta,
      hora_ausencia_desde,
      hora_ausencia_hasta,
      comentario,
      usuario_alta,
      selectedEntrada // tipo de ausencia
    );

    message.success("Ausencia añadida correctamente");

    // Cerrar modal y limpiar
    setAbsenceModalVisible(false);
    setExportDateRange(null);
    setHoraDesde(null);
    setHoraHasta(null);
    setTodoElDia(false);
    setSelectedEntrada(null);
    setComentario("");

    return datos;
  } catch (error) {
    console.error("Error añadiendo ausencia:", error);
    message.error("Error al añadir ausencia");
  }
};
    const handleExport = () => {

        const idUsuario = parseInt(sessionStorage.getItem('idUsuario')); 


    
        if (!exportDateRange || exportDateRange.length !== 2) {
            return message.error('Por favor, selecciona un rango de meses válido.');
        }
    
        const [startMonth, endMonth] = exportDateRange;
    
        if (startMonth && endMonth) {
            const startDate = startMonth.startOf('month').format('YYYY-MM-DD');
            const endDate = endMonth.endOf('month').format('YYYY-MM-DD');
    
            descargarExcelDesdeAPI(startDate, endDate, idUsuario);
            setExportModalVisible(false);
        } else {
            message.error('Los meses seleccionados no son válidos.');
        }
    };

const fetchData = async () => {
  try {
    const idUsuario = parseInt(sessionStorage.getItem("idUsuario"));

    const registros = await getDatosUsuarioById(idUsuario);

   const mergedData = (registros.info || []).map((item, index) => {
  const fechaBase = item.fecha_original || item.fecha_entrada || item.fecha_desde;
  const fechaEntrada = item.fecha_entrada ? dayjs.utc(item.fecha_entrada).tz('Europe/Madrid') : null;
  const fechaSalida = item.fecha_salida ? dayjs.utc(item.fecha_salida).tz('Europe/Madrid') : null;
  const fecha = fechaBase ? dayjs(fechaBase) : null;

  let totalHoras = "";
  if (
    item.tipo === "fichaje" &&
    fechaEntrada &&
    fechaSalida &&
    fechaEntrada.isValid() &&
    fechaSalida.isValid()
  ) {
    const diffMs = fechaSalida.diff(fechaEntrada);
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMin = Math.floor((diffMs / (1000 * 60)) % 60);
    totalHoras = `${diffHrs}h ${diffMin}min`;
  }

  return {
    key: `${item.tipo || "registro"}-${item.id_fichaje || item.id_ausencia || item.id_descanso || index}`,
    tipo:
      item.tipo === "fichaje"
        ? "Fichaje"
        : item.tipo === "ausencia"
        ? "Ausencia"
        : item.tipo === "descanso"
        ? "Descanso"
        : "Registro",
    date: fecha && fecha.isValid() ? fecha.format("DD/MM/YYYY") : "",
    checkIn:
      item.sin_hora
        ? ""
        : fechaEntrada && fechaEntrada.isValid()
        ? fechaEntrada.format("HH:mm")
        : "",
    dateOut:
      fechaSalida && fechaSalida.isValid()
        ? fechaSalida.format("DD/MM/YYYY")
        : fecha && fecha.isValid()
        ? fecha.format("DD/MM/YYYY")
        : "",
    checkOut:
      item.sin_hora
        ? ""
        : fechaSalida && fechaSalida.isValid()
        ? fechaSalida.format("HH:mm")
        : "",
    totalH: totalHoras,
    ubicacionEntrada: item.ubicacion_entrada,
    ubicacionSalida: item.ubicacion_salida,
    comentarios: item.comentarios,
  };
});

    // Ordenar por fecha más reciente
    const sortedData = mergedData.sort((a, b) => {
      const fechaA = dayjs(a.date, "DD/MM/YYYY");
      const fechaB = dayjs(b.date, "DD/MM/YYYY");
      return fechaB.valueOf() - fechaA.valueOf();
    });

    setData(sortedData);
    setFilteredData(sortedData);
  } catch (error) {
    console.error("Error al cargar los datos:", error);
    message.error("Error al cargar los datos");
  }
};
    
const getPeticionesEmpresa =  async () => {
    try{
        const peticiones = await getPeticionesByIdEmpresa();
    }catch(error){
        message.error('Error obteniendo peticiones empresa');

    }
    
}

const crearPeticionMensual = async () => {
  try {
    if (!selectedMonth || !selectedMonth.isValid()) {
      message.error('Mes no válido');
      return;
    }

    const mesFormateado = selectedMonth.format('YYYY-MM');

    const data = await crearPeticionCierreMes(mesFormateado);

    if (data?.error) {
      message.error('No se pudo crear la petición');
    } else {
      message.success('Petición creada exitosamente');
    }

  } catch (error) {
    message.error('Error al crear petición');
    console.error(error);
  }
};

    useEffect(() => {
        fetchData();
    }, []);

    const showEditModal = (record) => {
        setEditingRecord(record);
        form.setFieldsValue({
            date: dayjs(record.date, 'DD/MM/YYYY'),
            checkIn: moment(record.checkIn, 'HH:mm'),
            checkInType: record.checkInType,
            dateOut: dayjs(record.dateOut, 'DD/MM/YYYY'),
            checkOut: record.checkOut ? moment(record.checkOut, 'HH:mm') : null,
            exitType: record.exitType,
        });
        setIsModalOpen(true);
    };


    const getPeticionesUsuario = async () => {
        const peticiones = await getPeticionesByIdUsuario();
        return peticiones;

    }
 const handleEditSubmit = async () => {
    try {
        const values = await form.validateFields();

        if (!values.checkIn) {
            throw new Error('Hora de entrada no válida');
        }
        if (!values.checkOut) {
            throw new Error('Hora de salida no válida');
        }

        // Validar que la hora de entrada sea anterior a la salida
        const entrada = dayjs(values.date).hour(values.checkIn.hour()).minute(values.checkIn.minute());
        const salida = dayjs(values.dateOut).hour(values.checkOut.hour()).minute(values.checkOut.minute());


        if (entrada.isAfter(salida)) {
            message.error('La hora de entrada debe ser anterior a la hora de salida');
            return;
        }

        // Crear el payload
        const peticionPayload = {
            id_fichaje: editingRecord.key.replace('fichaje-', ''),
            fecha: entrada.format(),       // formato ISO
            fechaSalida: salida.format(),  // formato ISO
            hora_entrada: entrada.format('HH:mm'),
            hora_salida: salida.format('HH:mm'),
            justificacion: values.justificacion,
        };

        await crearPeticionEdicion(peticionPayload);

        const updatedData = data.map((item) => {
            if (item.key === editingRecord.key) {
                return {
                    ...item,
                    checkIn: values.checkIn,
                    checkOut: values.checkOut,
                    justificacion: values.justificacion,
                };
            }
            return item;
        });

        setFichajesConPeticion(prev => [...prev, editingRecord.key]);
        setData(updatedData);
        setFilteredData(updatedData);
        message.success('Registro actualizado correctamente');
        setIsModalOpen(false);
        setEditingRecord(null);
    } catch (error) {
        console.error('Error en el envío:', error);
        message.error('Error al enviar la solicitud');
    }
};

    
    
    const handleDelete = async (key) => {
        const result = await eliminarRegistro(key);
        const updatedData = data.filter((item) => item.key !== key);
        setData(updatedData);
        setFilteredData(updatedData);
        message.success('Registro eliminado correctamente');
    };

const handleMonthChange = (date, dateString) => {
    setSelectedMonth(date);

    if (date) {
        // Filtrar datos por mes seleccionado
        const filtered = data.filter(item => {
            const itemDate = moment(item.date, 'DD/MM/YYYY');
            return itemDate.month() === date.month() && itemDate.year() === date.year();
        });
        setFilteredData(filtered);

        // Verificar si el mes ya existe en mesesCierre
        const mesFormateado = date.format('YYYY-MM');
        const existeMes = mesesCierre.some(mc => mc.mes === mesFormateado);

        // Nuevo: comprobar si es mes actual
        const hoy = moment();
        const esMesActual = date.month() === hoy.month() && date.year() === hoy.year();

        // Habilitar botón solo si NO existe el mes y NO es mes actual
        setIsSubmitDisabled(existeMes || esMesActual);
    } else {
        setFilteredData(data);
        setIsSubmitDisabled(true);
    }
};



    // Función para mostrar el modal de confirmación
    const enviarRegistro = () => {
        Modal.confirm({
            title: '¿Desea cerrar el periodo de trabajo y enviar el registro de trabajo?',
            content: '',
            okText: 'Sí',
            cancelText: 'No',
            onOk: () => { crearPeticionMensual(); },
            onCancel: () => {
                // Si el usuario cancela, no se hace nada
            },
        });
    };

    const columns = [
        {
        title: 'Tipo',
        dataIndex: 'tipo',
        key: 'tipo',
        },
        {
            title: 'Fecha',
            dataIndex: 'date',
            key: 'date',
        },
        {
            title: 'Hora Entrada',
            dataIndex: 'checkIn',
            key: 'checkIn',
        },
        {
            title: 'Hora Salida',
            dataIndex: 'checkOut',
            key: 'checkOut',
        },
        {
            title: 'Dif. Tiempo',
            dataIndex: 'totalH',
            key: 'totalH',
        },
        
        {
            title: 'Acciones',
            key: 'actions',
             render: (record) => {
      // Solo habilitar acciones si es un fichaje
      if (record.tipo === "Fichaje") {
        const mesSeleccionadoFormateado =
          selectedMonth != null && selectedMonth ? selectedMonth.format('YYYY-MM') : null;
        const mesCerrado = mesesCierre.some(mc => mc.mes === mesSeleccionadoFormateado);

        const isEditable =
          !fichajesConPeticion.includes(record.key) &&
          !!record.checkOut &&
          (!mesSeleccionadoFormateado || !mesCerrado);

        return (
          <>
            <Button type="link" onClick={() => showEditModal(record)} disabled={!isEditable}>
              Editar
            </Button>
            <Button type="link" danger onClick={() => handleDelete(record.key)}>
              Eliminar
            </Button>
          </>
        );
      }

      // Si es ausencia, no mostrar botones
      return null;
    },
  },
];

    return (
        <Layout style={{ marginTop: '5vh', backgroundColor: '#f5f5f5', margin: '0 auto' }}>
            <Card title={<Title style={{ textAlign: 'center' }} level={2}>Registro de Horas</Title>}>
                <Row>
                    <Col span={24}>
                        <DatePicker
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            picker="month"
                            style={{ width: 150, marginBottom: '16px' }}
                            format="MM/YYYY"
                            disabledDate={(current) => current && current > moment()}
                            placeholder="Selecciona un mes"
                        />
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={filteredData}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 800 }}
                />

                {/* Botón Enviar */}
                <Row justify="start" style={{ marginTop: 16 }}>
                    <Button
                    style={{marginRight:'10px'}}
                        type="primary"
                        disabled={isSubmitDisabled} // Habilitar/deshabilitar el botón
                        onClick={enviarRegistro}
                    >
                        Enviar
                    </Button>
                      <Button
                        type="primary"
                        onClick={setVisibleModalExportar}
                    >
                        Exportar
                    </Button>

                      <Button
                        style={{marginLeft:'40px'}}

                        type="primary"
                        onClick={() => setAbsenceModalVisible(true)}
                    >
                        Añadir ausencia
                    </Button>
                </Row>

                <Modal
                    title="Editar Registro"
                    open={isModalOpen}
                    onOk={handleEditSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    okText="Enviar Solicitud"
                    cancelText="Cancelar"
                >
                    <Form form={form} layout="vertical">
                        <Form.Item label="Fecha Entrada" name="date"
                         rules={[{ required: true, message: 'Por favor, ingresa la fecha de entrada' }]}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            label="Hora Entrada"
                            name="checkIn"
                            rules={[{ required: true, message: 'Por favor, ingresa la hora de entrada' }]} 
                        >
                            <TimePicker format="HH:mm" />
                        </Form.Item>
                        <Form.Item label="Fecha Salida" name="dateOut" rules={[{ required: true, message: 'Por favor, ingresa la fecha de entrada' }]} >
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />

                        </Form.Item>
                        <Form.Item
                            label="Hora Salida"
                            name="checkOut"
                            rules={[{ required: true, message: 'Por favor, ingresa la hora de salida' }]}
                        >
                            <TimePicker format="HH:mm" />
                        </Form.Item>
                        <Form.Item
                            label="Justificación"
                            name="justificacion"
                            rules={[{ required: true, message: 'Por favor, ingrese una justificación' }]}
                        >
                            <Input />
                        </Form.Item>
                    </Form>
                </Modal>
            </Card>
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
                        style={{ width: '100%' }}
                        format="MM/YYYY"
                        onChange={(dates) => setExportDateRange(dates)}
                        disabledDate={(current) => current && current > dayjs()}
                    />
                </Modal>

                       {/* Modal de ausencia */}
                <Modal
                    title="Añadir ausencia"
                    open={absenceModalVisible}
                    onCancel={() => setAbsenceModalVisible(false)}
                    onOk={anadirAusencia}
                    okText="Añadir"
                    cancelText="Cancelar"
                >
                    <Row>
                    <Col xs={24} sm={24} md={24} lg={24} xl={24}>
                         <DatePicker.RangePicker
                        picker="day"
                        style={{ width: '100%' }}
                        format="DD/MM/YYYY"
                        onChange={(dates) => setExportDateRange(dates)}
                        placeholder={"Desde-Hasta"}
                        
                        />
                    </Col>
                    
                    <Col xs={12} sm={12} md={12} lg={12} xl={12}>
                        <TimePicker
                        disabled={todoElDia}
                        placeholder="Hora desde"
                        format="HH:mm:ss"
                        style={{ width: "100%", marginTop: "5px" }}
                        value={horaDesde}
                        onChange={(value) => setHoraDesde(value)}
                        />
                    </Col>
                    <Col xs={12} sm={12} md={12} lg={12} xl={12}>
                        <TimePicker
                        disabled={todoElDia}
                        placeholder="Hora hasta"
                        format="HH:mm:ss"
                        style={{ width: "100%", marginTop: "5px" }}
                        value={horaHasta}
                        onChange={(value) => setHoraHasta(value)}
                        />
                    </Col>
                    <Col>
                   <Checkbox
                        checked={todoElDia}
                        style={{ marginTop: "10px" }}
                        onChange={(e) => {
                            setTodoElDia(e.target.checked);
                            if (e.target.checked) {
                            setHoraDesde(null);
                            setHoraHasta(null);
                            }
                        }}
                        >
                        Todo el día
                        </Checkbox>

                    </Col>

                    </Row>
                   


                        <Select
                        placeholder="Selecciona el tipo de registro"
                        style={{
                            width: '80%',
                            maxWidth: '400px',
                            marginTop:'20px',
                            marginBottom:'20px',
                        }}
                        value={selectedEntrada}
                        onChange={(value) => setSelectedEntrada(value)}
                            dropdownStyle={{
                            maxHeight: '250px',
                            overflowY: 'auto',
                            whiteSpace: 'nowrap',
                        }}
                        
                        optionLabelProp="label"
                        >
                             {entradas.map((entrada) => (
                        <Select.Option key={entrada} value={entrada}>
                        {entrada}
                        </Select.Option>
                    ))}
                        </Select>
                        <Input
                        placeholder="Comentario"
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        />                    
                </Modal>
        </Layout>

        
    );
};

export default TimeLogsPanel;
