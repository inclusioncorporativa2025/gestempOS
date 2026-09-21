import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Empty, Typography } from 'antd';

const { Text } = Typography;

const COLOR_CUMPLIMIENTO = {
  ok: '#52c41a',
  warn: '#faad14',
  bad: '#ff4d4f',
};

const COLOR_DISTRIBUCION = {
  ok: '#52c41a',
  warn: '#faad14',
  bad: '#ff4d4f',
  sinJornada: '#d9d9d9',
};

const truncarNombre = (nombre, max = 14) => {
  const texto = String(nombre || '').trim();
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max - 1)}…`;
};

const colorCumplimiento = (valor) => {
  if (valor == null) return COLOR_CUMPLIMIENTO.bad;
  if (valor >= 95) return COLOR_CUMPLIMIENTO.ok;
  if (valor >= 85) return COLOR_CUMPLIMIENTO.warn;
  return COLOR_CUMPLIMIENTO.bad;
};

const minutosAHoras = (minutos) => Math.round((Number(minutos) / 60) * 10) / 10;

const ChartTooltip = ({ active, payload, labelFormatter, valueFormatter }) => {
  if (!active || !payload?.length) return null;

  const fila = payload[0]?.payload;

  return (
    <div className="productividad-chart-tooltip">
      <div className="productividad-chart-tooltip__title">
        {labelFormatter ? labelFormatter(fila) : fila?.nombre}
      </div>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="productividad-chart-tooltip__row"
          style={{ color: entry.color }}
        >
          <span>{entry.name}</span>
          <strong>
            {valueFormatter ? valueFormatter(entry.value, entry) : entry.value}
          </strong>
        </div>
      ))}
      {fila?.email ? (
        <div className="productividad-chart-tooltip__meta">{fila.email}</div>
      ) : null}
    </div>
  );
};

const ProductividadCharts = ({ empleados = [] }) => {
  const datosCumplimiento = useMemo(() => (
    empleados
      .filter((row) => row.jornada_configurada && row.cumplimiento_pct != null)
      .map((row) => ({
        id_usuario: row.id_usuario,
        nombre: row.nombre,
        nombreCorto: truncarNombre(row.nombre),
        email: row.email,
        cumplimiento: row.cumplimiento_pct,
        delta: row.delta,
      }))
      .sort((a, b) => b.cumplimiento - a.cumplimiento)
  ), [empleados]);

  const datosHoras = useMemo(() => (
    empleados
      .filter((row) => row.jornada_configurada && row.horas_pactadas_min > 0)
      .map((row) => ({
        id_usuario: row.id_usuario,
        nombre: row.nombre,
        nombreCorto: truncarNombre(row.nombre, 10),
        email: row.email,
        trabajadas: minutosAHoras(row.horas_trabajadas_min),
        pactadas: minutosAHoras(row.horas_pactadas_min),
      }))
      .sort((a, b) => b.trabajadas - a.trabajadas)
      .slice(0, 12)
  ), [empleados]);

  const datosDistribucion = useMemo(() => {
    const bandas = {
      ok: { name: '≥ 95%', value: 0, color: COLOR_DISTRIBUCION.ok },
      warn: { name: '85–94%', value: 0, color: COLOR_DISTRIBUCION.warn },
      bad: { name: '< 85%', value: 0, color: COLOR_DISTRIBUCION.bad },
      sinJornada: { name: 'Sin jornada', value: 0, color: COLOR_DISTRIBUCION.sinJornada },
    };

    empleados.forEach((row) => {
      if (!row.jornada_configurada || row.cumplimiento_pct == null) {
        bandas.sinJornada.value += 1;
        return;
      }
      if (row.cumplimiento_pct >= 95) bandas.ok.value += 1;
      else if (row.cumplimiento_pct >= 85) bandas.warn.value += 1;
      else bandas.bad.value += 1;
    });

    return Object.values(bandas).filter((item) => item.value > 0);
  }, [empleados]);

  const datosAbsentismo = useMemo(() => (
    empleados
      .filter((row) => row.absentismo_pct != null)
      .map((row) => ({
        id_usuario: row.id_usuario,
        nombre: row.nombre,
        nombreCorto: truncarNombre(row.nombre, 10),
        email: row.email,
        absentismo: row.absentismo_pct,
        dias: row.dias_ausencia,
      }))
      .sort((a, b) => b.absentismo - a.absentismo)
      .slice(0, 12)
  ), [empleados]);

  const datosRetraso = useMemo(() => (
    empleados
      .filter((row) => row.puntualidad_media_min != null && row.puntualidad_media_min > 0)
      .map((row) => ({
        id_usuario: row.id_usuario,
        nombre: row.nombre,
        nombreCorto: truncarNombre(row.nombre, 10),
        email: row.email,
        retraso: row.puntualidad_media_min,
      }))
      .sort((a, b) => b.retraso - a.retraso)
      .slice(0, 12)
  ), [empleados]);

  if (!empleados.length) {
    return (
      <Empty description="No hay datos para mostrar en gráficos" />
    );
  }

  const alturaCumplimiento = Math.max(280, datosCumplimiento.length * 36 + 48);

  return (
    <div className="productividad-charts">
      <div className="productividad-charts__grid">
        <div className="productividad-charts__panel productividad-charts__panel--wide">
          <Text strong className="productividad-charts__panel-title">
            Cumplimiento por empleado
          </Text>
          {datosCumplimiento.length ? (
            <ResponsiveContainer width="100%" height={alturaCumplimiento}>
              <BarChart
                data={datosCumplimiento}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="#eef0f4" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: '#8c8c8c', fontSize: 12 }}
                  axisLine={{ stroke: '#e8e8e8' }}
                  tickLine={false}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="nombreCorto"
                  width={96}
                  tick={{ fill: '#595959', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={(
                    <ChartTooltip
                      labelFormatter={(fila) => fila?.nombre}
                    />
                  )}
                />
                <Bar dataKey="cumplimiento" name="Cumplimiento (%)" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {datosCumplimiento.map((entry) => (
                    <Cell key={entry.id_usuario} fill={colorCumplimiento(entry.cumplimiento)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text type="secondary">Sin empleados con jornada configurada</Text>
          )}
        </div>

        <div className="productividad-charts__panel">
          <Text strong className="productividad-charts__panel-title">
            Distribución del equipo
          </Text>
          {datosDistribucion.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={datosDistribucion}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={92}
                  paddingAngle={2}
                >
                  {datosDistribucion.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} empleado(s)`, name]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Text type="secondary">Sin datos de distribución</Text>
          )}
        </div>

        <div className="productividad-charts__panel productividad-charts__panel--wide">
          <Text strong className="productividad-charts__panel-title">
            Horas trabajadas vs pactadas
          </Text>
          <Text type="secondary" className="productividad-charts__panel-subtitle">
            Top 12 empleados por horas trabajadas
          </Text>
          {datosHoras.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosHoras} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#eef0f4" vertical={false} />
                <XAxis
                  dataKey="nombreCorto"
                  tick={{ fill: '#8c8c8c', fontSize: 11 }}
                  axisLine={{ stroke: '#e8e8e8' }}
                  tickLine={false}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={64}
                />
                <YAxis
                  tick={{ fill: '#8c8c8c', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  unit="h"
                />
                <Tooltip
                  content={(
                    <ChartTooltip
                      labelFormatter={(fila) => fila?.nombre}
                    />
                  )}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 13 }}
                />
                <Bar dataKey="pactadas" name="Pactadas (h)" fill="#91caff" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="trabajadas" name="Trabajadas (h)" fill="#1677ff" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text type="secondary">Sin datos de horas</Text>
          )}
        </div>

        <div className="productividad-charts__panel">
          <Text strong className="productividad-charts__panel-title">
            Absentismo
          </Text>
          <Text type="secondary" className="productividad-charts__panel-subtitle">
            Top 12 por % del mes
          </Text>
          {datosAbsentismo.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={datosAbsentismo} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#eef0f4" vertical={false} />
                <XAxis
                  dataKey="nombreCorto"
                  tick={{ fill: '#8c8c8c', fontSize: 11 }}
                  axisLine={{ stroke: '#e8e8e8' }}
                  tickLine={false}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={64}
                />
                <YAxis
                  tick={{ fill: '#8c8c8c', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  unit="%"
                />
                <Tooltip
                  content={(
                    <ChartTooltip
                      labelFormatter={(fila) => `${fila?.nombre} (${fila?.dias} d.)`}
                    />
                  )}
                />
                <Bar dataKey="absentismo" name="Absentismo (%)" fill="#fa8c16" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text type="secondary">Sin datos de absentismo</Text>
          )}
        </div>

        {datosRetraso.length > 0 && (
          <div className="productividad-charts__panel productividad-charts__panel--wide">
            <Text strong className="productividad-charts__panel-title">
              Retraso medio en entrada
            </Text>
            <Text type="secondary" className="productividad-charts__panel-subtitle">
              Solo jornada fija · top 12
            </Text>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={datosRetraso} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#eef0f4" vertical={false} />
                <XAxis
                  dataKey="nombreCorto"
                  tick={{ fill: '#8c8c8c', fontSize: 11 }}
                  axisLine={{ stroke: '#e8e8e8' }}
                  tickLine={false}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={64}
                />
                <YAxis
                  tick={{ fill: '#8c8c8c', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  unit=" min"
                />
                <Tooltip
                  content={(
                    <ChartTooltip
                      labelFormatter={(fila) => fila?.nombre}
                    />
                  )}
                />
                <Bar dataKey="retraso" name="Retraso (min)" fill="#722ed1" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductividadCharts;
