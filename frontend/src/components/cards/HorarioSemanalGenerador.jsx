import React, { useState } from 'react';
import { Button, Select, TimePicker, Typography, message } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './HorarioSemanalGenerador.css';

const { Text } = Typography;
const { Option } = Select;

const clonarHorario = (horario) => ({
  hora_entrada: horario?.hora_entrada?.clone?.() ?? horario?.hora_entrada ?? null,
  hora_salida: horario?.hora_salida?.clone?.() ?? horario?.hora_salida ?? null,
  hora_entrada2: horario?.hora_entrada2?.clone?.() ?? horario?.hora_entrada2 ?? null,
  hora_salida2: horario?.hora_salida2?.clone?.() ?? horario?.hora_salida2 ?? null,
});

const HorarioSemanalGenerador = ({ form, diasSeleccionados }) => {
  const [tipoHorario, setTipoHorario] = useState('1');
  const [horaEntrada, setHoraEntrada] = useState(dayjs('08:00:00', 'HH:mm:ss'));
  const [horaSalida, setHoraSalida] = useState(dayjs('16:00:00', 'HH:mm:ss'));
  const [horaEntrada2, setHoraEntrada2] = useState(null);
  const [horaSalida2, setHoraSalida2] = useState(null);

  if (!diasSeleccionados?.length) return null;

  const aplicarPlantillaATodos = () => {
    if (!horaEntrada || !horaSalida) {
      message.warning('Indica la hora de entrada y de salida.');
      return;
    }
    if (tipoHorario === '2' && (!horaEntrada2 || !horaSalida2)) {
      message.warning('En horario partido, indica también el segundo tramo.');
      return;
    }

    const bloque = {
      hora_entrada: horaEntrada,
      hora_salida: horaSalida,
      ...(tipoHorario === '2'
        ? { hora_entrada2: horaEntrada2, hora_salida2: horaSalida2 }
        : {}),
    };

    const payload = {};
    diasSeleccionados.forEach((dia) => {
      payload[dia] = {
        tipo_horario: tipoHorario,
        horarios: [clonarHorario(bloque)],
      };
    });

    const actual = form.getFieldsValue(true);
    form.setFieldsValue({ ...actual, ...payload });
    message.success(`Horario aplicado a ${diasSeleccionados.length} día(s).`);
  };

  const botonAplicar = (
    <div className="horario-generador__action">
      <Button type="primary" icon={<ThunderboltOutlined />} onClick={aplicarPlantillaATodos}>
        Aplicar a días seleccionados
      </Button>
    </div>
  );

  return (
    <div className="horario-generador">
      <div className="horario-generador__header">
        <ThunderboltOutlined className="horario-generador__icon" />
        <div>
          <Text strong>Generador de horario</Text>
          <Text type="secondary" className="horario-generador__hint">
            Rellena la plantilla y aplícala a todos los días marcados.
          </Text>
        </div>
      </div>

      <div className="horario-generador__fields">
        <div className="horario-generador__field horario-generador__field--tipo">
          <label className="horario-generador__label">Tipo de horario</label>
          <Select
            value={tipoHorario}
            onChange={setTipoHorario}
            className="horario-generador__full"
          >
            <Option value="1">Continuo</Option>
            <Option value="2">Partido</Option>
          </Select>
        </div>
        <div className="horario-generador__field horario-generador__field--time">
          <label className="horario-generador__label">Entrada</label>
          <TimePicker
            value={horaEntrada}
            onChange={setHoraEntrada}
            format="HH:mm:ss"
            className="horario-generador__full"
          />
        </div>
        <div className="horario-generador__field horario-generador__field--time">
          <label className="horario-generador__label">Salida</label>
          <TimePicker
            value={horaSalida}
            onChange={setHoraSalida}
            format="HH:mm:ss"
            className="horario-generador__full"
          />
        </div>
        {tipoHorario === '1' && botonAplicar}
        {tipoHorario === '2' && (
          <>
            <div className="horario-generador__field horario-generador__field--time">
              <label className="horario-generador__label">Entrada 2</label>
              <TimePicker
                value={horaEntrada2}
                onChange={setHoraEntrada2}
                format="HH:mm:ss"
                className="horario-generador__full"
              />
            </div>
            <div className="horario-generador__field horario-generador__field--time">
              <label className="horario-generador__label">Salida 2</label>
              <TimePicker
                value={horaSalida2}
                onChange={setHoraSalida2}
                format="HH:mm:ss"
                className="horario-generador__full"
              />
            </div>
            {botonAplicar}
          </>
        )}
      </div>
    </div>
  );
};

export default HorarioSemanalGenerador;
