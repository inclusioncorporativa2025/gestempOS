import React, { useEffect, useMemo } from 'react';
import { Collapse, Row, Col, Form, TimePicker, Select } from 'antd';
import './AnadirDiaCard.css';

const { Panel } = Collapse;
const { Option } = Select;

const AnadirDiaCard = ({ dia, form }) => {
  // Escuchar el valor actual de tipo_horario desde el formulario
  const tipoHorario = Form.useWatch([dia, 'tipo_horario'], form);

  // Si no hay valor definido, usamos '1' como predeterminado
  const tipoHorarioValue = useMemo(() => tipoHorario || '1', [tipoHorario]);

  // Asignamos un valor por defecto si no existe aún
  useEffect(() => {
    const currentValue = form.getFieldValue([dia, 'tipo_horario']);
    if (!currentValue) {
      form.setFieldValue([dia, 'tipo_horario'], '1');
    }
  }, [dia, form]);

  const getInitialFormListValue = () => {
    return tipoHorarioValue === '1' ? [{}] : [{}, {}];
  };

  return (
    <Collapse className="anadir-dia-collapse">
      <Panel header={dia}>
        {/* Selector de tipo de horario */}
        <Form.Item
          label="Tipo de horario"
          name={[dia, 'tipo_horario']}
          initialValue="1"
        >
          <Select>
            <Option value="1">Continuo</Option>
            <Option value="2">Partido</Option>
          </Select>
        </Form.Item>

        {/* Campos de horarios */}
        <Form.List
          name={[dia, 'horarios']}
          initialValue={getInitialFormListValue()}
          rules={[
            {
              validator: async (_, names) => {
                if (!names || names.length < 1) {
                  return Promise.reject(new Error('Debe agregar al menos un registro'));
                }
              },
            },
          ]}
        >
          {(fields) => (
            <>
              {tipoHorarioValue === '1' && (
                <>
                  {fields.map((field) => (
                    <Row gutter={[16, 16]} justify="center" key={field.key}>
                      <Col xs={24} sm={12} md={8} lg={6}>
                        <Form.Item
                          label="Hora Entrada"
                          name={[field.name, 'hora_entrada']}
                          rules={[{ required: true, message: 'Por favor ingresa la hora de entrada' }]}
                          className="anadir-dia-time"
                        >
                          <TimePicker format="HH:mm:ss" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8} lg={6}>
                        <Form.Item
                          label="Hora Salida"
                          name={[field.name, 'hora_salida']}
                          rules={[{ required: true, message: 'Por favor ingresa la hora de salida' }]}
                          className="anadir-dia-time"
                        >
                          <TimePicker format="HH:mm:ss" />
                        </Form.Item>
                      </Col>
                    </Row>
                  ))}
                </>
              )}

              {tipoHorarioValue === '2' && (
                <>
                  {fields.map((field) => (
                    <Row gutter={[16, 16]} justify="center" key={field.key}>
                      <Col xs={0} sm={0} md={0} lg={6}></Col>

                      <Col xs={24} sm={12} md={12} lg={6}>
                        <Form.Item
                          label="Hora Entrada"
                          name={[field.name, 'hora_entrada']}
                          rules={[{ required: true, message: 'Por favor ingresa la hora de entrada' }]}
                          className="anadir-dia-time"
                        >
                          <TimePicker format="HH:mm:ss" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={12} lg={6}>
                        <Form.Item
                          label="Hora Salida"
                          name={[field.name, 'hora_salida']}
                          rules={[{ required: true, message: 'Por favor ingresa la hora de salida' }]}
                          className="anadir-dia-time"
                        >
                          <TimePicker format="HH:mm:ss" />
                        </Form.Item>
                      </Col>

                      <Col xs={0} sm={0} md={0} lg={6}></Col>

                      <Col xs={24} sm={12} md={12} lg={6}>
                        <Form.Item
                          label="Hora Entrada 2"
                          name={[field.name, 'hora_entrada2']}
                          rules={[{ required: true, message: 'Por favor ingresa la hora de entrada' }]}
                          className="anadir-dia-time"
                        >
                          <TimePicker format="HH:mm:ss" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={12} lg={6}>
                        <Form.Item
                          label="Hora Salida 2"
                          name={[field.name, 'hora_salida2']}
                          rules={[{ required: true, message: 'Por favor ingresa la hora de salida' }]}
                          className="anadir-dia-time"
                        >
                          <TimePicker format="HH:mm:ss" />
                        </Form.Item>
                      </Col>
                    </Row>
                  ))}
                </>
              )}
            </>
          )}
        </Form.List>
      </Panel>
    </Collapse>
  );
};

export default AnadirDiaCard;
