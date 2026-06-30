import React, { useMemo } from 'react';
import { Card, Typography, Table, Descriptions, Tag } from 'antd';
import {
  formatearMinutosHoras,
  minutosSemanalesJornadaFija,
  minutosTramosDia,
} from '../../../utils/jornadaHoras';
import './RegistroDiaCard.css';

const { Text } = Typography;

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

const labelTipoJornada = (tipo) => {
  const n = Number(tipo);
  if (n === 1) return 'Fija';
  if (n === 2) return 'Flexible';
  return 'Desconocido';
};

const labelTipoHora = (tipoHora) => {
  const n = Number(tipoHora);
  if (n === 1) return 'Extra';
  if (n === 2) return 'Complementaria';
  if (n === 3) return 'Bolsa de horas';
  return 'Desconocido';
};

const labelTipoHorarioDia = (value) => {
  const n = Number(value);
  if (n === 1) return 'Horario continuo';
  if (n === 2) return 'Horario partido';
  return '—';
};

const ORDEN_DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

const ordenarDiasSemana = (dias) =>
  [...dias].sort(
    (a, b) => ORDEN_DIAS_SEMANA.indexOf(a.dia) - ORDEN_DIAS_SEMANA.indexOf(b.dia),
  );

const RegistroDiaCard = ({ tipo }) => {
  const config = useMemo(() => parseColumn1(tipo), [tipo]);
  const esFlexible = Number(tipo.tipo) === 2;
  const dias = Array.isArray(config.dias) ? config.dias : [];
  const diasLaborables = useMemo(
    () => ordenarDiasSemana(dias.filter((dia) => minutosTramosDia(dia) > 0)),
    [dias],
  );
  const horasMensuales = config.horasMensuales ?? tipo.horasMensuales ?? '';
  const minutosSemanales = useMemo(
    () => (esFlexible ? 0 : minutosSemanalesJornadaFija(diasLaborables)),
    [diasLaborables, esFlexible],
  );

  const columns = [
    { title: 'Hora entrada', dataIndex: 'hora_entrada', key: 'hora_entrada' },
    { title: 'Hora salida', dataIndex: 'hora_salida', key: 'hora_salida' },
    {
      title: 'Tipo de horario',
      dataIndex: 'tipo_horario',
      key: 'tipo_horario',
      render: (value) => labelTipoHorarioDia(value),
    },
  ];

  return (
    <div className="registro-dia">
      <Descriptions
        className="registro-dia-meta"
        size="small"
        column={{ xs: 1, sm: 2, md: 3 }}
        bordered
      >
          <Descriptions.Item label="Tipo de jornada">
            <Tag color={esFlexible ? 'purple' : 'blue'}>{labelTipoJornada(tipo.tipo)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Tipo de hora">
            {labelTipoHora(tipo.tipo_hora)}
          </Descriptions.Item>
          {esFlexible ? (
            <Descriptions.Item label="Horas mensuales">
              {horasMensuales !== '' && horasMensuales != null ? (
                <Text strong>{horasMensuales} h</Text>
              ) : (
                <Text type="secondary">No definidas</Text>
              )}
            </Descriptions.Item>
          ) : (
            <>
              <Descriptions.Item label="Días laborables">
                {diasLaborables.length > 0 ? diasLaborables.length : 'Ninguno'}
              </Descriptions.Item>
              <Descriptions.Item label="Horas semanales">
                {minutosSemanales > 0 ? (
                  <Text strong>{formatearMinutosHoras(minutosSemanales)}</Text>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Descriptions.Item>
            </>
          )}
        </Descriptions>

      {!esFlexible && (
        <div className="registro-dia-dias">
          {diasLaborables.length === 0 ? (
            <Text type="secondary">No hay días ni horarios configurados.</Text>
          ) : (
            diasLaborables.map((dia, index) => (
              <Card key={`${dia.dia}-${index}`} className="registro-card" size="small">
                <div className="registro-dia-nombre-row">
                  <Text strong className="registro-dia-nombre">
                    {dia.dia}
                  </Text>
                  {minutosTramosDia(dia) > 0 && (
                    <Text type="secondary" className="registro-dia-horas">
                      {formatearMinutosHoras(minutosTramosDia(dia))}
                    </Text>
                  )}
                </div>
                {Array.isArray(dia.horario) && dia.horario.length > 0 ? (
                  <Table
                    className="registro-dia-tabla"
                    columns={columns}
                    dataSource={dia.horario.map((horarioItem, idx) => ({
                      key: `${dia.dia}-${idx}`,
                      hora_entrada: horarioItem.horaEntrada || '—',
                      hora_salida: horarioItem.horaSalida || '—',
                      tipo_horario: dia.tipo_horario,
                    }))}
                    pagination={false}
                    size="small"
                  />
                ) : (
                  <Text type="secondary">Sin tramos horarios para este día.</Text>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RegistroDiaCard;
