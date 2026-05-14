import React, { useState, useEffect } from 'react';
import { Modal, Form, Row, Col, TimePicker, Select, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

const { Option } = Select;

const EditDiaCard = ({ visible, onCancel, onSave, tipo, dia }) => {
  const [form] = Form.useForm();
  const [tipoHorario, setTipoHorario] = useState(dia.tipo_horario || '1'); // Default a '1' para 'Continuo'

  // Al abrir el modal, precargamos los datos
  useEffect(() => {
    if (visible) {
      const initialValues = {
        tipo_horario: dia.tipo_horario || '1', // '1' es el valor por defecto
        [dia.dia]: dia.horario.map(horario => ({
          hora_entrada: horario.horaEntrada,
          hora_salida: horario.horaSalida,
          hora_entrada2: horario.horaEntrada2,
          hora_salida2: horario.horaSalida2,
        })),
      };
      form.setFieldsValue(initialValues);
    }
  }, [visible, dia, form]);

  const handleTipoHorarioChange = (value) => {
    setTipoHorario(value);
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      const horarios = values[dia.dia].map((registro, idx) => ({
        hora_entrada: registro.hora_entrada,
        hora_salida: registro.hora_salida,
        hora_entrada2: registro.hora_entrada2 || '',
        hora_salida2: registro.hora_salida2 || '',
      }));

      const updatedDia = {
        ...dia,
        tipo_horario: values.tipo_horario,
        horario: horarios,
      };

      onSave(updatedDia);  // Devuelve los datos editados al componente padre
    });
  };

  return (
    <Modal
      title={`Editar Jornada: ${dia.dia}`}
      visible={visible}
      onCancel={onCancel}
      onOk={handleSave}
      okText="Guardar"
      cancelText="Cancelar"
      width={800}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Tipo de horario" name="tipo_horario">
          <Select
            value={tipoHorario}
            onChange={handleTipoHorarioChange}
            style={{ width: '100%' }}
          >
            <Option value="1">Continuo</Option>
            <Option value="2">Partido</Option>
          </Select>
        </Form.Item>

        <Form.List
          name={dia.dia}
          initialValue={dia.horario || [{}]}
        >
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Row gutter={[16, 16]} justify="center" key={field.key}>
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Form.Item
                      label="Hora Entrada"
                      name={[field.name, 'hora_entrada']}
                      rules={[{ required: true, message: 'Por favor ingresa la hora de entrada' }]}
                    >
                      <TimePicker format="HH:mm:ss" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Form.Item
                      label="Hora Salida"
                      name={[field.name, 'hora_salida']}
                      rules={[{ required: true, message: 'Por favor ingresa la hora de salida' }]}
                    >
                      <TimePicker format="HH:mm:ss" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>

                  {tipoHorario === '2' && (
                    <>
                      <Col xs={24} sm={12} md={8} lg={6}>
                        <Form.Item
                          label="Hora Entrada 2"
                          name={[field.name, 'hora_entrada2']}
                        >
                          <TimePicker format="HH:mm:ss" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8} lg={6}>
                        <Form.Item
                          label="Hora Salida 2"
                          name={[field.name, 'hora_salida2']}
                        >
                          <TimePicker format="HH:mm:ss" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  <Col>
                    <Button
                      icon={<CloseOutlined />}
                      onClick={() => remove(field.name)}
                      danger
                    >
                      Eliminar
                    </Button>
                  </Col>
                </Row>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block>
                  Agregar Horario
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default EditDiaCard;
