import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Table,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  descargarNomina,
  misNominas,
} from '../../features/nominas/nominasService';
import './MisNominasPanel.css';

const { Text } = Typography;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const etiquetaPeriodo = (mes, anio) => `${MESES[mes - 1] || mes} ${anio}`;

const formatearEuros = (valor) => {
  if (valor == null) return '—';
  return Number(valor).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
};

const formatearFecha = (fecha) => (
  fecha && dayjs(fecha).isValid() ? dayjs(fecha).format('DD/MM/YYYY') : '—'
);

const MisNominasPanel = () => {
  const [loading, setLoading] = useState(true);
  const [soportado, setSoportado] = useState(true);
  const [documentos, setDocumentos] = useState([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await misNominas();
      setSoportado(data.soportado !== false);
      setDocumentos(data.documentos || []);
    } catch (error) {
      message.error(error.message || 'No se pudieron cargar tus nóminas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleDescargar = async (doc) => {
    try {
      await descargarNomina(doc.id_documento, doc.nombre_archivo);
      await cargar();
    } catch (error) {
      message.error(error.message || 'No se pudo descargar la nómina');
    }
  };

  if (!soportado) {
    return (
      <Card>
        <Text type="secondary">
          El módulo de nóminas no está disponible en el servidor.
        </Text>
      </Card>
    );
  }

  const ultimoLiquido = documentos.find((d) => d.importe_liquido != null)?.importe_liquido;

  const columnas = [
    {
      title: 'Periodo',
      key: 'periodo',
      render: (_, row) => etiquetaPeriodo(row.periodo_mes, row.periodo_anio),
    },
    {
      title: 'Bruto oficial',
      dataIndex: 'importe_bruto',
      key: 'importe_bruto',
      render: formatearEuros,
    },
    {
      title: 'Deducciones',
      dataIndex: 'importe_deducciones',
      key: 'importe_deducciones',
      render: formatearEuros,
    },
    {
      title: 'Líquido a percibir',
      dataIndex: 'importe_liquido',
      key: 'importe_liquido',
      render: (v) => <Text strong>{formatearEuros(v)}</Text>,
    },
    {
      title: 'Publicada',
      dataIndex: 'fecha_publicacion',
      key: 'fecha_publicacion',
      render: formatearFecha,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, row) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          onClick={() => handleDescargar(row)}
        >
          Descargar PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="mis-nominas-panel">
      <Text type="secondary" className="mis-nominas-panel__hint">
        Aquí puedes consultar y descargar tus nóminas oficiales (PDF).
        El importe líquido figura cuando la empresa lo ha registrado al subir el documento.
      </Text>

      {ultimoLiquido != null && (
        <Card size="small" className="mis-nominas-panel__ultimo">
          <Text type="secondary">Último líquido registrado: </Text>
          <Text strong>{formatearEuros(ultimoLiquido)}</Text>
        </Card>
      )}

      <Table
        loading={loading}
        columns={columnas}
        dataSource={documentos}
        rowKey={(row) => `${row.empresa_id}-${row.id_documento}`}
        pagination={{ pageSize: 8 }}
        locale={{
          emptyText: (
            <Empty description="Aún no hay nóminas publicadas para tu usuario" />
          ),
        }}
        scroll={{ x: 720 }}
      />
    </div>
  );
};

export default MisNominasPanel;
