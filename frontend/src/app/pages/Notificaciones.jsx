import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Col, Row, Button, Table, Layout, Modal,
  Typography, message, Popconfirm, Tooltip, DatePicker, Input
} from 'antd';
import GradientButton from '../components/shared/GradientButton';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
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
} from '../../features/fichaje/fichajeService';
import { notifyNotificacionesActualizadas } from '../../hooks/useNotificacionesPendientes';
import { parseFechaFichaje } from '../../utils/fechaFichaje';

import {
   getHorasTotalesMesByIdUsuario,

} from '../../features/user/usuarioService';
import './Notificaciones.css';

dayjs.locale('es');
dayjs.extend(utc);
dayjs.extend(timezone);

const { Title } = Typography;
const { RangePicker } = DatePicker;

const filtrarPorRango = (items, campoFecha, rango) => {
  if (!rango?.[0] || !rango?.[1]) return items;
  const desde = rango[0].startOf('day');
  const hasta = rango[1].endOf('day');
  return items.filter((item) => {
    const fecha = dayjs(item[campoFecha]);
    return (
      fecha.isValid()
      && !fecha.isBefore(desde)
      && !fecha.isAfter(hasta)
    );
  });
};

const ordenarPorReciente = (items, campoFecha) =>
  [...items].sort(
    (a, b) => dayjs(b[campoFecha]).valueOf() - dayjs(a[campoFecha]).valueOf(),
  );

const normalizarTexto = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const filtrarPorNombre = (items, obtenerNombre, termino) => {
  const busqueda = normalizarTexto(termino);
  if (!busqueda) return items;
  return items.filter((item) => normalizarTexto(obtenerNombre(item)).includes(busqueda));
};

const Notificaciones = () => {
const [peticiones, setPeticiones] = useState([]);
const [cierresMensuales, setCierresMensuales] = useState([]);
const [loading, setLoading] = useState(true);
const [visible, setVisible] = useState(false);
const [registroHoras, setRegistroHoras] = useState([]);
const [totalHoras, setTotalHoras] = useState('');
const [totalHorasEsperadas, setTotalHorasEsperadas] = useState(0);
const [rangoFechas, setRangoFechas] = useState(null);
const [busquedaNombre, setBusquedaNombre] = useState('');

  const peticionesFiltradas = useMemo(
    () => ordenarPorReciente(
      filtrarPorNombre(
        filtrarPorRango(peticiones, 'fecha_alta', rangoFechas),
        (item) => item.fichaje?.usuario?.nombre,
        busquedaNombre,
      ),
      'fecha_alta',
    ),
    [peticiones, rangoFechas, busquedaNombre],
  );

  const cierresFiltrados = useMemo(
    () => ordenarPorReciente(
      filtrarPorNombre(
        filtrarPorRango(cierresMensuales, 'fecha_alta', rangoFechas),
        (item) => item.nombre_usuario_alta,
        busquedaNombre,
      ),
      'fecha_alta',
    ),
    [cierresMensuales, rangoFechas, busquedaNombre],
  );

  const limpiarFiltros = () => {
    setRangoFechas(null);
    setBusquedaNombre('');
  };

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
      const horaEntrada = parseFechaFichaje(item.fecha_entrada);
      const horaSalida = item.fecha_salida ? parseFechaFichaje(item.fecha_salida) : null;

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
      notifyNotificacionesActualizadas();
    } catch (error) {
      message.error('Error al procesar la petición');
    }
  };

  const handleRespuestaCierre = async (peticion, estado) => {
    try {
      await responderPeticionCierre(peticion, estado);
      message.success(`Cierre mensual ${estado === 2 ? 'aprobado' : 'rechazado'}`);
      fetchCierresMensuales();
      notifyNotificacionesActualizadas();
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
      title: 'Fecha solicitud',
      dataIndex: 'fecha_alta',
      key: 'fecha_alta',
      render: (fecha) => formatearFecha(fecha),
      sorter: (a, b) => dayjs(a.fecha_alta).valueOf() - dayjs(b.fecha_alta).valueOf(),
      defaultSortOrder: 'descend',
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
          <div className="notif-acciones">
            <Popconfirm
              title="¿Aprobar esta petición?"
              onConfirm={() => handleRespuesta(record, 2)}
              okText="Sí"
              cancelText="No"
            >
              <GradientButton text="Aprobar" size="small" className="notif-btn-compact" />
            </Popconfirm>
            <Popconfirm
              title="¿Rechazar esta petición?"
              onConfirm={() => handleRespuesta(record, 3)}
              okText="Sí"
              cancelText="No"
            >
              <Button danger size="small" className="notif-btn-compact">
                Rechazar
              </Button>
            </Popconfirm>
          </div>
        ) : (
          <span className="notif-procesada">Ya procesada</span>
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
      sorter: (a, b) => dayjs(a.fecha_alta).valueOf() - dayjs(b.fecha_alta).valueOf(),
      defaultSortOrder: 'descend',
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
          <div className="notif-acciones">
            <Popconfirm
              title="¿Aprobar este cierre?"
              onConfirm={() => handleRespuestaCierre(record, 2)}
              okText="Sí"
              cancelText="No"
            >
              <GradientButton text="Aprobar" size="small" className="notif-btn-compact" />
            </Popconfirm>
            <Popconfirm
              title="¿Rechazar este cierre?"
              onConfirm={() => handleRespuestaCierre(record, 3)}
              okText="Sí"
              cancelText="No"
            >
              <Button danger size="small" className="notif-btn-compact">
                Rechazar
              </Button>
            </Popconfirm>
            <Button
              icon={<EyeOutlined />}
              size="small"
              className="notif-btn-compact"
              onClick={() => setVisibleModalDetalles(record)}
            />
          </div>
        ) : (
          <span className="notif-procesada">Ya procesado</span>
        );
      }
    }
  ];

  return (
    <Layout className="notif-layout">
      <Card className="notif-card" title={<Title level={2}>Notificaciones</Title>}>
        <div className="notif-filtros">
          <Input
            className="notif-filtro-nombre"
            placeholder="Buscar por nombre"
            prefix={<SearchOutlined />}
            value={busquedaNombre}
            onChange={(e) => setBusquedaNombre(e.target.value)}
            allowClear
            aria-label="Buscar por nombre"
          />
          <RangePicker
            value={rangoFechas}
            onChange={setRangoFechas}
            format="DD/MM/YYYY"
            placeholder={['Desde', 'Hasta']}
            allowClear
            aria-label="Filtrar por rango de fechas"
          />
          {(rangoFechas || busquedaNombre.trim()) && (
            <Button type="link" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          )}
        </div>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Solicitudes de Corrección de Horario">
              <Table
                columns={columnsCorreccion}
                dataSource={peticionesFiltradas}
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
                dataSource={cierresFiltrados}
                loading={loading}
                rowKey={(record) => `${record.empresa_id}-${record.id_mes_cierre}`}
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
            className="notif-modal"
            destroyOnClose
        >
            <Card title={<Title className="notif-modal-title" level={2}>Registro mensual</Title>}>
        
             <Table
                columns={columnsDetalles}
                dataSource={registroHoras}
                rowKey="fecha"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
                />
                <div className="notif-totales">
                    <span className="notif-total-sep">Total de horas trabajadas: {totalHoras}</span>
                    <span>Total de horas esperadas: {totalHorasEsperadas}</span>
                </div>
            </Card>
        </Modal>
    </Layout>
  );
};

export default Notificaciones;
