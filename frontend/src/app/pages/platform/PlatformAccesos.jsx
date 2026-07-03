import React, { useCallback, useEffect, useState } from 'react';
import { Input, Select, Table, Tag, Tooltip, Typography, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { listarAccesos } from '../../../features/platform/platformService';
import './Platform.css';

const { Text } = Typography;

const TIPO_LABELS = {
  login: { label: 'Login', color: 'green' },
  navegacion: { label: 'Navegación', color: 'blue' },
  suplantacion: { label: 'Suplantación', color: 'orange' },
};

const MAX_ACCESOS_UI = 3000;

const PlatformAccesos = () => {
  const [accesos, setAccesos] = useState([]);
  const [total, setTotal] = useState(0);
  const [truncado, setTruncado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [limite] = useState(50);
  const [tipoFiltro, setTipoFiltro] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setBusquedaDebounced(busqueda.trim()), 400);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const cargarAccesos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarAccesos({
        pagina,
        limite,
        tipo: tipoFiltro || undefined,
        q: busquedaDebounced || undefined,
      });
      setAccesos(data.accesos || []);
      setTotal(data.total || 0);
      setTruncado(Boolean(data.truncado));
    } catch (error) {
      message.error(error.message || 'Error al cargar accesos');
    } finally {
      setLoading(false);
    }
  }, [pagina, limite, tipoFiltro, busquedaDebounced]);

  useEffect(() => {
    cargarAccesos();
  }, [cargarAccesos]);

  useEffect(() => {
    setPagina(1);
  }, [tipoFiltro, busquedaDebounced]);

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 160,
      render: (fecha) => dayjs(fecha).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Usuario',
      key: 'usuario',
      render: (_, row) => (
        <div>
          <Text strong>{row.nombre}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.email}
          </Text>
        </div>
      ),
    },
    {
      title: 'Evento',
      dataIndex: 'tipo_evento',
      key: 'tipo_evento',
      width: 120,
      render: (tipo) => {
        const meta = TIPO_LABELS[tipo] || { label: tipo, color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Ruta',
      dataIndex: 'ruta',
      key: 'ruta',
      ellipsis: true,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      render: (ip) => ip || '—',
    },
    {
      title: 'Navegador',
      dataIndex: 'user_agent',
      key: 'user_agent',
      ellipsis: true,
      render: (ua) =>
        ua ? (
          <Tooltip title={ua}>
            <span>{ua}</span>
          </Tooltip>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="platform-accesos">
      <div className="platform-accesos__filters">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Buscar por nombre o email"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="platform-accesos__search"
        />
        <Select
          allowClear
          placeholder="Tipo de evento"
          value={tipoFiltro}
          onChange={setTipoFiltro}
          className="platform-accesos__tipo"
          options={[
            { value: 'login', label: 'Login' },
            { value: 'navegacion', label: 'Navegación' },
            { value: 'suplantacion', label: 'Suplantación' },
          ]}
        />
      </div>

      <Text type="secondary" className="platform-accesos__limite">
        Se muestran como máximo los
        {' '}
        {MAX_ACCESOS_UI.toLocaleString('es-ES')}
        {' '}
        accesos más recientes.
        {truncado && (
          <>
            {' '}
            Existen más registros en la base de datos; para consultar el histórico completo use una consulta SQL directa.
          </>
        )}
      </Text>

      <Table
        rowKey="id_acceso"
        columns={columns}
        dataSource={accesos}
        loading={loading}
        pagination={{
          current: pagina,
          pageSize: limite,
          total,
          showSizeChanger: false,
          showTotal: (t) => `${t.toLocaleString('es-ES')} registros`,
          onChange: (p) => setPagina(p),
        }}
        scroll={{ x: 900 }}
      />
    </div>
  );
};

export default PlatformAccesos;
