import React from 'react';
import { Card, Button, Popconfirm, Typography, Table } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const RegistroDiaCard = ({ tipo, onEdit, onDelete }) => {
  const isFormatoVariable = tipo.tipo===2;
  const dias = tipo.column1?.dias || [];

  const tipoHora = tipo.tipoHora || tipo.column1?.tipoHora || 'Desconocido';
  const nombreJornada = tipo.nombreJornada || tipo.column1?.nombreJornada || 'Sin nombre';
  const horasMensuales = tipo.horasMensuales || tipo.column1?.horasMensuales || 'N/A';

  const columns = [
    {
      title: 'Hora entrada',
      dataIndex: 'hora_entrada',
      key: 'hora_entrada',
    },
    {
      title: 'Hora salida',
      dataIndex: 'hora_salida',
      key: 'hora_salida',
    },
    {
      title: 'Tipo de hora',
      dataIndex: 'tipo_hora',
      key: 'tipo_hora',
      render: (value) => {
        switch (value) {
          case 1:
          case '1':
            return 'Extra';
          case 2:
          case '2':
            return 'Complementaria';
          case 3:
          case '3':
            return 'Bolsa de horas';
          default:
            return 'Desconocido';
        }
      },
    },
    {
      title: 'Tipo de jornada',
      dataIndex: 'tipo',
      key: 'tipo',
      render: (value) => {
        switch (value) {
          case '1':
            return 'Horario continuo';
          case '2':
            return 'Horario partido';
          default:
            return 'Desconocido';
        }
      },
    },
  ];

  // Si es tipo variable, solo mostramos horasMensuales
  if (isFormatoVariable) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <Text strong>Horas mensuales:</Text> {horasMensuales}
        <div style={{ marginTop: 16 }}>
          <Popconfirm
            title="¿Estás seguro de que deseas eliminar este tipo de jornada?"
            onConfirm={() => onDelete(tipo.id_jornada)}
            okText="Sí"
            cancelText="No"
          >
            <Button danger type="primary" icon={<DeleteOutlined />}>
              Eliminar jornada
            </Button>
          </Popconfirm>
        </div>
      </Card>
    );
  }

  // Render clásico
  return (
    <div>
      {dias.map((dia, index) => (
        <Card key={index} style={{ marginBottom: 16 }}>
          <Title level={4}>{dia.dia}</Title>

          {dia.horario && Array.isArray(dia.horario) && dia.horario.length > 0 ? (
            <Table
              columns={columns}
              dataSource={dia.horario.map((horarioItem, idx) => ({
                key: idx,
                tipo_hora: tipo.tipo_hora || tipoHora,
                tipo: dia.tipo_horario,
                hora_entrada: horarioItem.horaEntrada,
                hora_salida: horarioItem.horaSalida,
              }))}
              rowKey={(record) => record.key}
              pagination={false}
            />
          ) : (
            <p>No hay horarios disponibles.</p>
          )}

          {/* <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => onEdit(tipo)}
            style={{ marginRight: 8 }}
          >
            Editar
          </Button> */}
        </Card>
      ))}

      <Popconfirm
        title="¿Estás seguro de que deseas eliminar este tipo de jornada?"
        onConfirm={() => onDelete(tipo.id_jornada)}
        okText="Sí"
        cancelText="No"
      >
        <Button danger type="primary" icon={<DeleteOutlined />} style={{ marginBottom: 16 }}>
          Eliminar jornada
        </Button>
      </Popconfirm>
    </div>
  );
};

export default RegistroDiaCard;
