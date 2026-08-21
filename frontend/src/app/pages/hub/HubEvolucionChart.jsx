import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { Typography } from 'antd';
import { etiquetaEtapaVenta } from '../../../utils/hubAccess';

dayjs.locale('es');

const { Text } = Typography;

const SERIES = [
  { key: 'total', label: 'Total altas', color: '#722ed1' },
  { key: 'activas', label: () => etiquetaEtapaVenta('activa'), color: '#52c41a' },
  { key: 'trial', label: () => etiquetaEtapaVenta('trial'), color: '#faad14' },
  { key: 'registradas', label: () => etiquetaEtapaVenta('registrada'), color: '#1677ff' },
];

const capitalizar = (texto) => {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const EvolucionTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const mesCompleto = payload[0]?.payload?.mesCompleto;

  return (
    <div className="hub-evolucion-tooltip">
      <div className="hub-evolucion-tooltip__title">{mesCompleto}</div>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="hub-evolucion-tooltip__row"
          style={{ color: entry.color }}
        >
          <span>{entry.name}</span>
          <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
};

const HubEvolucionChart = ({ evolucion = [] }) => {
  const datos = useMemo(() => {
    const porMes = new Map((evolucion || []).map((item) => [item.mes, item]));
    const filas = [];

    for (let i = 11; i >= 0; i -= 1) {
      const fecha = dayjs().subtract(i, 'month').startOf('month');
      const mes = fecha.format('YYYY-MM');
      const item = porMes.get(mes);

      filas.push({
        mes,
        mesLabel: capitalizar(fecha.format('MMM')),
        mesCompleto: capitalizar(fecha.format('MMMM YYYY')),
        total: Number(item?.total ?? 0),
        activas: Number(item?.activas ?? 0),
        trial: Number(item?.trial ?? 0),
        registradas: Number(item?.registradas ?? 0),
      });
    }

    return filas;
  }, [evolucion]);

  const hayDatos = datos.some(
    (fila) => fila.total > 0 || fila.activas > 0 || fila.trial > 0 || fila.registradas > 0,
  );

  if (!hayDatos) {
    return <Text type="secondary">Sin datos en el periodo</Text>;
  }

  return (
    <div className="hub-evolucion-chart">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={datos} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#eef0f4" vertical={false} />
          <XAxis
            dataKey="mesLabel"
            tick={{ fill: '#8c8c8c', fontSize: 12 }}
            axisLine={{ stroke: '#e8e8e8' }}
            tickLine={false}
            dy={8}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#8c8c8c', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<EvolucionTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ paddingTop: 16, fontSize: 13 }}
          />
          {SERIES.map(({ key, label, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={typeof label === 'function' ? label() : label}
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HubEvolucionChart;
