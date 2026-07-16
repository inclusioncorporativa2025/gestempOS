import React from 'react';
import { Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { etiquetaTipoHora } from '../../utils/tipoHora';

export const CREAR_PRIMERA_JORNADA_VALUE = '__crear_primera_jornada__';
export const CREAR_PRIMERA_JORNADA_LABEL = 'Crea tu primera jornada';

const JornadaLaboralSelect = ({
  jornadas = [],
  value,
  onChange,
  onNavigateAway,
  valueKey = 'id',
  showTipoHoraSuffix = false,
  ...selectProps
}) => {
  const navigate = useNavigate();
  const sinJornadas = jornadas.length === 0;

  const handleChange = (nextValue) => {
    if (nextValue === CREAR_PRIMERA_JORNADA_VALUE) {
      onChange?.(undefined);
      onNavigateAway?.();
      navigate(APP_ROUTES.settingsJornada, { state: { openCreateJornada: true } });
      return;
    }
    onChange?.(nextValue);
  };

  const resolveOptionValue = (jornada) => (
    valueKey === 'nombre' ? jornada.nombre : jornada.id_jornada
  );

  return (
    <Select
      {...selectProps}
      value={value}
      onChange={handleChange}
      placeholder={sinJornadas ? CREAR_PRIMERA_JORNADA_LABEL : 'Selecciona la jornada laboral'}
    >
      {sinJornadas ? (
        <Select.Option value={CREAR_PRIMERA_JORNADA_VALUE}>
          {CREAR_PRIMERA_JORNADA_LABEL}
        </Select.Option>
      ) : (
        jornadas.map((jornada) => (
          <Select.Option key={jornada.id_jornada} value={resolveOptionValue(jornada)}>
            {jornada.nombre}
            {showTipoHoraSuffix && jornada.tipo_hora
              ? ` (${etiquetaTipoHora(jornada.tipo_hora)})`
              : ''}
          </Select.Option>
        ))
      )}
    </Select>
  );
};

export default JornadaLaboralSelect;
