import React, { useState, useEffect } from 'react';
import { Layout, Calendar, Modal, Input, Form, message, Badge } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import locale from 'antd/locale/es_ES';
import { ConfigProvider } from 'antd';
import {
  getFestivosByIdEmpresa,
  guardarFestivoEmpresa,
  eliminarFestivoEmpresa
} from '../features/calendario/CalendarioService';
import './Calendario.css';

dayjs.locale('es');

const Calendario = () => {
  const [festivos, setFestivos] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchFestivos = async () => {
      const data = await getFestivosByIdEmpresa();
      if (Array.isArray(data)) {
        // Filtrar festivos activos
        setFestivos(data.filter(f => f.fecha_baja === null));
      } else {
        message.error('Error al cargar los festivos');
      }
    };

    fetchFestivos();
  }, []);

  const showModal = (date) => {
    setSelectedDate(date);
    const yaEsFestivo = festivos.find(f => f.fecha === date.format('YYYY-MM-DD'));

    if (yaEsFestivo) {
      Modal.confirm({
        title: '¿Deseas eliminar este festivo?',
        content: `Festivo: ${yaEsFestivo.descripcion}`,
        okText: 'Eliminar',
        cancelText: 'Cancelar',
        onOk: async () => {
          const result = await eliminarFestivoEmpresa(yaEsFestivo.id_festivo);
          if (result?.message) {
            setFestivos(prev => prev.filter(f => f.id_festivo !== yaEsFestivo.id_festivo));
            message.success('Festivo eliminado');
          } else {
            message.error('Error al eliminar festivo');
          }
        }
      });
    } else {
      setIsModalVisible(true);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const descripcion = values.descripcion;
      const fecha = selectedDate.format('YYYY-MM-DD');

      const result = await guardarFestivoEmpresa({ fecha, descripcion });

      if (result && result.id_festivo) {
        setFestivos([...festivos, result]);
        message.success('Festivo guardado correctamente');
        setIsModalVisible(false);
        form.resetFields();
      } else {
        message.error('Error al guardar festivo');
      }
    } catch (error) {
      console.error(error);
      message.error('Error al validar el formulario');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const dateCellRender = (value) => {
    const festivo = festivos.find(f => f.fecha === value.format('YYYY-MM-DD'));
    if (festivo) {
      return <Badge status="error" text={festivo.descripcion} />;
    }
    return null;
  };

  return (
    <ConfigProvider locale={locale}>
      <Layout className="calendario-layout">
        <Calendar
          fullscreen
          cellRender={dateCellRender}
          onSelect={showModal}
        />

        <Modal
          title={`Agregar festivo para ${selectedDate?.format('D [de] MMMM [de] YYYY')}`}
          open={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          okText="Guardar"
          cancelText="Cancelar"
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="descripcion"
              label="Descripción del festivo"
              rules={[{ required: true, message: 'Por favor, ingrese una descripción' }]}
            >
              <Input placeholder="Ej. Día de la Constitución" />
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default Calendario;
