import React, { useState, useEffect } from 'react';
import {
  Card, Col, Row, Button, Table, Layout,Modal,
  Typography, message, Popconfirm, Tooltip
} from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';

import {
  getPeticionesByIdEmpresa,
  responderPeticion,
  getCierresMensualesByIdEmpresa,
  getDatosUsuarioMes,
  responderPeticionCierre,
} from '../features/fichaje/fichajeService';

import {
   getHorasTotalesMesByIdUsuario,

} from '../features/user/usuarioService';

dayjs.locale('es');
dayjs.extend(utc);
dayjs.extend(timezone);

const { Title } = Typography;

const Notificaciones = () => {
const [peticiones, setPeticiones] = useState([]);
const [cierresMensuales, setCierresMensuales] = useState([]);
const [loading, setLoading] = useState(true);
const [visible, setVisible] = useState(false);
const [registroHoras, setRegistroHoras] = useState([]);
const [totalHoras, setTotalHoras] = useState('');
const [totalHorasEsperadas, setTotalHorasEsperadas] = useState(0);

  useEffect(() => {
    fetchPeticiones();
    fetchCierresMensuales();
  }, []);

  const fetchPeticiones = async () => {
    try {
      const response = await getPeticionesByIdEmpresa();
      setPeticiones(response.data);
    } catch (error) {
      message.error('Error al obtener peticiones');
    }
  };

const setVisibleModalDetalles = async (info) => {
  try {
    const response = await getDatosUsuarioMes(info.usuario_alta, info.mes);
    const registros = response.info || [];

    const registrosConDetalles = registros.map((item) => {
      const horaEntrada = dayjs(item.fecha_entrada);
      const horaSalida = item.fecha_salida ? dayjs(item.fecha_salida) : null;

      let dif_tiempo = 'No registrada';
      let minutosTrabajados = 0;

      if (horaSalida && horaEntrada.isValid() && horaSalida.isValid()) {
        const diffMinutes = horaSalida.diff(horaEntrada, 'minute');
        const horas = Math.floor(diffMinutes / 60);
        const minutos = diffMinutes % 60;
        minutosTrabajados = diffMinutes;
        dif_tiempo = `${horas}h ${minutos}m`;
      }

      return {
        fecha: horaEntrada.format('DD/MM/YYYY'),
        hora_entrada: horaEntrada.format('HH:mm'),
        hora_salida: horaSalida ? horaSalida.format('HH:mm') : 'No registrada',
        dif_tiempo,
        minutos: minutosTrabajados
      };
    });

    // Ordenar por fecha descendente
    registrosConDetalles.sort((a, b) => dayjs(b.fecha, 'DD/MM/YYYY').valueOf() - dayjs(a.fecha, 'DD/MM/YYYY').valueOf());

    // Calcular total horas trabajadas
    const minutosTotales = registrosConDetalles.reduce((sum, item) => sum + (item.minutos || 0), 0);
    const totalHorasTexto = `${Math.floor(minutosTotales / 60)}h ${minutosTotales % 60}m`;

  const jornadaUsuario = await getHorasTotalesMesByIdUsuario(info.mes,info.usuario_alta);
        setTotalHorasEsperadas(jornadaUsuario.horasMensuales);

    setRegistroHoras(registrosConDetalles);
    setTotalHoras(totalHorasTexto);
    setVisible(true);
  } catch (error) {
    message.error('Error al cargar los datos del usuario');
  }
};


//     const cargarDatosUsuario = (record) => {
//         setVisible(true);
//         setEditingRecord(record);
//         getDatosUsuarioById(record.id_usuario).then((result) => {
//             const filteredHoras = result.info.filter((item) => {
//                 const fechaEntrada = dayjs(item.fecha_entrada);
//                 return fechaEntrada.isSame(dayjs(), 'month');
//             });
//             const registrosConDetalles = filteredHoras.map((item) => {
//                 const horaEntrada = dayjs(item.fecha_entrada);
//                 const horaSalida = item.fecha_salida ? dayjs(item.fecha_salida) : null;
//                 let dif_tiempo = 'No registrada';
//                 if (horaSalida && horaEntrada.isValid() && horaSalida.isValid()) {
//                     const diffMinutes = horaSalida.diff(horaEntrada, 'minute');
//                     const horas = Math.floor(diffMinutes / 60);
//                     const minutos = diffMinutes % 60;
//                     dif_tiempo = `${horas}h ${minutos}m`;
//                 }
//                 return {
//                     fecha: horaEntrada.format('DD/MM/YYYY'),
//                     hora_entrada: horaEntrada.format('HH:mm'),
//                     hora_salida: horaSalida ? horaSalida.format('HH:mm') : 'No registrada',
//                     tipo_entrada: item.tipo_entrada,
//                     tipo_salida: item.tipo_salida,
//                     dif_tiempo,
//                 };
//             });
// registrosConDetalles.sort((a, b) => dayjs(b.fecha, 'DD/MM/YYYY').valueOf() - dayjs(a.fecha, 'DD/MM/YYYY').valueOf());
//             setRegistroHoras(registrosConDetalles);
//             calcularHorasTotales(registrosConDetalles,record.id_usuario);
//         });
//     };


  const fetchCierresMensuales = async () => {
    try {
      const response = await getCierresMensualesByIdEmpresa();
      setCierresMensuales(response.info);
    } catch (error) {
      message.error('Error al obtener cierres mensuales');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    return fecha ? dayjs(fecha).tz('Europe/Madrid').format('DD/MM/YYYY HH:mm') : '-';
  };

  const obtenerEstado = (record) => {
    if (record.fecha_aceptacion) return 'Aprobada';
    if (record.fecha_cancelacion) return 'Rechazada';
    return 'Pendiente';
  };

  const handleRespuesta = async (peticion, estado) => {
    try {
      await responderPeticion(peticion, estado);
      message.success(`Petición ${estado === 2 ? 'aprobada' : 'rechazada'} correctamente`);
      fetchPeticiones();
    } catch (error) {
      message.error('Error al procesar la petición');
    }
  };

  const handleRespuestaCierre = async (peticion, estado) => {
    try {
      await responderPeticionCierre(peticion, estado);
      message.success(`Cierre mensual ${estado === 2 ? 'aprobado' : 'rechazado'}`);
      fetchCierresMensuales();
    } catch (error) {
      message.error('Error al procesar el cierre mensual');
    }
  };

    const columnsDetalles = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
        { title: 'Hora Entrada', dataIndex: 'hora_entrada', key: 'hora_entrada' },
        { title: 'Hora Salida', dataIndex: 'hora_salida', key: 'hora_salida' },
        { title: 'Dif. Tiempo', dataIndex: 'dif_tiempo', key: 'dif_tiempo' }
    ];
  const columnsCorreccion = [
    {
      title: 'Nombre',
      key: 'nombre',
      render: (_, record) => record.fichaje?.usuario?.nombre || '-',
    },
    {
      title: 'Fecha Entrada Original',
      key: 'entrada_original',
      render: (_, record) => formatearFecha(record.fichaje?.fecha_entrada),
    },
    {
      title: 'Fecha Salida Original',
      key: 'salida_original',
      render: (_, record) => formatearFecha(record.fichaje?.fecha_salida),
    },
    {
      title: 'Fecha Entrada Solicitada',
      key: 'entrada_solicitada',
      render: (_, record) => formatearFecha(record.nueva_entrada),
    },
    {
      title: 'Fecha Salida Solicitada',
      key: 'salida_solicitada',
      render: (_, record) => formatearFecha(record.nueva_salida),
    },
    {
      title: 'Justificación',
      dataIndex: 'justificacion',
      key: 'justificacion',
      render: (text) => (
        <Tooltip title={text}>
          {text?.length > 40 ? `${text.slice(0, 40)}...` : text}
        </Tooltip>
      ),
    },
    {
      title: 'Estado',
      key: 'estado',
      render: (_, record) => obtenerEstado(record),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => {
        const estado = obtenerEstado(record);
        return estado === 'Pendiente' ? (
          <>
            <Popconfirm
              title="¿Aprobar esta petición?"
              onConfirm={() => handleRespuesta(record, 2)}
              okText="Sí"
              cancelText="No"
            >
              <Button type="primary" style={{ marginRight: 8 }}>Aprobar</Button>
            </Popconfirm>
            <Popconfirm
              title="¿Rechazar esta petición?"
              onConfirm={() => handleRespuesta(record, 3)}
              okText="Sí"
              cancelText="No"
            >
              <Button danger>Rechazar</Button>
            </Popconfirm>
          </>
        ) : (
          <span style={{ color: '#888' }}>Ya procesada</span>
        );
      }
    }
  ];

  const columnsCierreMensual = [
    {
    title: 'Usuario',
    dataIndex: 'nombre_usuario_alta',
    key: 'nombre_usuario_alta',
    },
    {
    title: 'DNI',
    dataIndex: 'dni_usuario_alta',
    key: 'dni_usuario_alta',
},
    {
      title: 'Mes',
      dataIndex: 'mes',
      key: 'mes',
      render: (mes) => dayjs(mes).format('MMMM [de] YYYY'),
    },
    {
      title: 'Fecha Petición',
      dataIndex: 'fecha_alta',
      key: 'fecha_alta',
      render: (fecha) => formatearFecha(fecha),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => {
        const estado = record.fecha_aceptacion
          ? 'Aprobado'
          : record.fecha_cancelacion
          ? 'Rechazado'
          : 'Pendiente';

        return estado === 'Pendiente' ? (
          <>
            <Popconfirm
              title="¿Aprobar este cierre?"
              onConfirm={() => handleRespuestaCierre(record, 2)}
              okText="Sí"
              cancelText="No"
            >
              <Button type="primary" size="small" style={{ marginRight: 8 }}>Aprobar</Button>
            </Popconfirm>
            <Popconfirm
              title="¿Rechazar este cierre?"
              onConfirm={() => handleRespuestaCierre(record, 3)}
              okText="Sí"
              cancelText="No"
            >
              <Button danger size="small" style={{ marginRight: 8 }}>Rechazar</Button>
            </Popconfirm>
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() =>setVisibleModalDetalles(record)}
            />
          </>
        ) : (
          <span style={{ color: '#888' }}>Ya procesado</span>
        );
      }
    }
  ];

  return (
    <Layout style={{ backgroundColor: 'transparent' }}>
      <Card style={{ marginTop: '16px', width: '100%' }} title={<Title level={2}>Notificaciones</Title>}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Solicitudes de Corrección de Horario">
              <Table
                columns={columnsCorreccion}
                dataSource={peticiones}
                loading={loading}
                rowKey="id_peticion"
                pagination={{ pageSize: 5 }}
              />
            </Card>
          </Col>
          <Col span={24}>
            <Card title="Solicitudes de Cierre Mensual">
              <Table
                columns={columnsCierreMensual}
                dataSource={cierresMensuales}
                loading={loading}
                rowKey="id_cierre"
                pagination={{ pageSize: 5 }}
              />
            </Card>
          </Col>
        </Row>
      </Card>
        <Modal
            open={visible}
            onCancel={() => setVisible(false)}
            footer={null}
            width="80%"
            style={{ top: 50 }}
            destroyOnClose
        >
            <Card title={<Title style={{ textAlign: 'center' }} level={2}>Registro mensual</Title>}>
        
             <Table
                columns={columnsDetalles}
                dataSource={registroHoras}
                rowKey="fecha"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
                />
                <div style={{ marginTop: '16px', fontWeight: 'bold' }}>
                    <span style={{ marginRight: '26px' }}>Total de horas trabajadas: {totalHoras}</span>
                    <span>Total de horas esperadas: {totalHorasEsperadas}</span>
                </div>
            </Card>
        </Modal>
    </Layout>
  );
};

export default Notificaciones;
