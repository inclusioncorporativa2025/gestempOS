import React, { useMemo } from 'react';
import { Typography } from 'antd';
import {
  avisoMananaHorario,
  tarjetasDiasHorario,
} from '../../../utils/jornadaHoras';
import './JornadaSemanaCalendario.css';

const { Text } = Typography;

const ABREV_DIA = {
  Lunes: 'Lun',
  Martes: 'Mar',
  Miércoles: 'Mié',
  Jueves: 'Jue',
  Viernes: 'Vie',
  Sábado: 'Sáb',
  Domingo: 'Dom',
};

const JornadaSemanaCalendario = ({
  diasConfig,
  diasLaborables,
  contextoCalendario = null,
}) => {
  const tarjetas = useMemo(
    () => tarjetasDiasHorario(diasConfig),
    [diasConfig],
  );

  const avisoManana = useMemo(
    () => avisoMananaHorario(diasLaborables, contextoCalendario),
    [contextoCalendario, diasLaborables],
  );

  return (
    <div className="jornada-cal">
      {avisoManana ? (
        <div className="jornada-cal__aviso" role="status">
          <Text className="jornada-cal__aviso-texto">{avisoManana}</Text>
        </div>
      ) : null}

      <div className="jornada-cal__tarjetas-wrap">
        <div className="jornada-cal__tarjetas" role="list">
          {tarjetas.map((tarjeta) => (
          <div
            key={tarjeta.nombre}
            role="listitem"
            title={tarjeta.nombre}
            className={
              tarjeta.laborable
                ? 'jornada-cal__tarjeta jornada-cal__tarjeta--laborable'
                : 'jornada-cal__tarjeta jornada-cal__tarjeta--libre'
            }
          >
            <div className="jornada-cal__tarjeta-linea">
              <Text strong className="jornada-cal__tarjeta-dia">
                {ABREV_DIA[tarjeta.nombre] || tarjeta.nombre}
              </Text>
              {tarjeta.laborable ? (
                <Text className="jornada-cal__tarjeta-horas">{tarjeta.rango}</Text>
              ) : (
                <Text type="secondary" className="jornada-cal__tarjeta-libre">
                  —
                </Text>
              )}
            </div>
          </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JornadaSemanaCalendario;
