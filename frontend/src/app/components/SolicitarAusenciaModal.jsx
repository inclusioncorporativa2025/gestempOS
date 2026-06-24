import React, { useMemo, useState } from 'react';
import {
  Modal, Row, Col, DatePicker, TimePicker, Checkbox, Select, Input, Radio, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import { crearAusencia } from '../../features/ausencias/ausenciasService';
import { getIdEmpresa, getIdUsuario } from '../../utils/authSession';
import usePlan from '../../hooks/usePlan';
import { planIncluyeFeature } from '../../constants/plans';
import './SolicitarAusenciaModal.css';

const { Text } = Typography;

const SolicitarAusenciaModal = ({ open, onClose, onSuccess }) => {
  const { planId } = usePlan();
  const [enviando, setEnviando] = useState(false);
  const [selectedEntrada, setSelectedEntrada] = useState(null);
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
  const [fraccionDia, setFraccionDia] = useState('completo');
  const [todoElDia, setTodoElDia] = useState(true);
  const [horaDesde, setHoraDesde] = useState(null);
  const [horaHasta, setHoraHasta] = useState(null);
  const [comentario, setComentario] = useState('');

  const entradasAusencia = useMemo(() => {
    const tipos = ['Baja', 'Asuntos Propios', 'Otros'];
    if (planIncluyeFeature(planId, 'vacaciones')) {
      return ['Vacaciones', ...tipos];
    }
    return tipos;
  }, [planId]);

  const esVacaciones = selectedEntrada === 'Vacaciones';
  const esUnSoloDia = Boolean(
    fechaDesde
    && (!fechaHasta || fechaDesde.isSame(fechaHasta, 'day')),
  );
  const mostrarFraccionVacaciones = esVacaciones && esUnSoloDia;
  const esRangoVariosDias = Boolean(
    esVacaciones && fechaDesde && fechaHasta && !fechaDesde.isSame(fechaHasta, 'day'),
  );

  const resetForm = () => {
    setSelectedEntrada(null);
    setFechaDesde(null);
    setFechaHasta(null);
    setFraccionDia('completo');
    setTodoElDia(true);
    setHoraDesde(null);
    setHoraHasta(null);
    setComentario('');
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!selectedEntrada) {
      message.error('Selecciona el tipo de ausencia');
      return;
    }
    if (!fechaDesde) {
      message.error('Selecciona la fecha desde y la fecha hasta');
      return;
    }

    const fechaHastaEnvio = fechaHasta || fechaDesde;
    if (!fechaHastaEnvio) {
      message.error('Selecciona la fecha hasta');
      return;
    }

    const idUsuario = getIdUsuario();
    const idEmpresa = getIdEmpresa();
    const usarFraccionVacaciones = esVacaciones && fechaDesde.isSame(fechaHastaEnvio, 'day');

    setEnviando(true);
    try {
      const datos = await crearAusencia(
        idUsuario,
        idEmpresa,
        fechaDesde.format('DD-MM-YYYY'),
        fechaHastaEnvio.format('DD-MM-YYYY'),
        (todoElDia || usarFraccionVacaciones) ? null : horaDesde?.format('HH:mm:ss'),
        (todoElDia || usarFraccionVacaciones) ? null : horaHasta?.format('HH:mm:ss'),
        comentario,
        idUsuario,
        selectedEntrada,
        usarFraccionVacaciones ? fraccionDia : null,
      );

      message.success(
        datos?.pendiente_aprobacion
          ? 'Solicitud enviada. Recibirás aviso cuando se resuelva.'
          : 'Ausencia registrada correctamente',
      );
      handleClose();
      onSuccess?.();
    } catch (error) {
      const detalle = error.detalle ? ` (${error.detalle})` : '';
      message.error((error.message || 'Error al solicitar ausencia') + detalle, 6);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      title="Solicitar ausencia"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      okText="Solicitar"
      cancelText="Cancelar"
      confirmLoading={enviando}
      destroyOnClose
      className="sol-ausencia-modal"
      width={520}
    >
      <Select
        placeholder="Tipo de ausencia"
        className="sol-ausencia-modal__select"
        value={selectedEntrada}
        onChange={(value) => {
          setSelectedEntrada(value);
          if (value !== 'Vacaciones') {
            setFraccionDia('completo');
            return;
          }
          if (fechaDesde && !fechaHasta) {
            setFechaHasta(fechaDesde);
          }
        }}
        options={entradasAusencia.map((t) => ({ value: t, label: t }))}
      />

      <Row gutter={[12, 12]} className="sol-ausencia-modal__fechas">
        <Col span={12}>
          <DatePicker
            className="sol-ausencia-modal__full"
            format="DD/MM/YYYY"
            placeholder="Desde"
            value={fechaDesde}
            onChange={(date) => {
              const eraUnSoloDia = Boolean(
                fechaDesde && fechaHasta && fechaDesde.isSame(fechaHasta, 'day'),
              );
              setFechaDesde(date);
              if (date && fechaHasta && fechaHasta.isBefore(date, 'day')) {
                setFechaHasta(null);
              } else if (selectedEntrada === 'Vacaciones' && date && (!fechaHasta || eraUnSoloDia)) {
                setFechaHasta(date);
              }
            }}
          />
        </Col>
        <Col span={12}>
          <DatePicker
            className="sol-ausencia-modal__full"
            format="DD/MM/YYYY"
            placeholder="Hasta"
            value={fechaHasta}
            disabled={!fechaDesde}
            disabledDate={(current) => fechaDesde && current.isBefore(fechaDesde, 'day')}
            onChange={setFechaHasta}
          />
        </Col>
      </Row>

      {mostrarFraccionVacaciones && (
        <div className="sol-ausencia-modal__fraccion">
          <Text type="secondary">Duración del día</Text>
          <Radio.Group
            value={fraccionDia}
            onChange={(e) => setFraccionDia(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="completo">Día completo</Radio.Button>
            <Radio.Button value="manana">Mañana</Radio.Button>
            <Radio.Button value="tarde">Tarde</Radio.Button>
          </Radio.Group>
        </div>
      )}

      {esRangoVariosDias && (
        <Text type="secondary" className="sol-ausencia-modal__hint">
          Para medio día (mañana o tarde), indica la misma fecha en Desde y Hasta.
        </Text>
      )}

      {!esVacaciones && (
        <>
          <Row gutter={12}>
            <Col span={12}>
              <TimePicker
                disabled={todoElDia}
                placeholder="Hora desde"
                format="HH:mm"
                className="sol-ausencia-modal__full"
                value={horaDesde}
                onChange={setHoraDesde}
              />
            </Col>
            <Col span={12}>
              <TimePicker
                disabled={todoElDia}
                placeholder="Hora hasta"
                format="HH:mm"
                className="sol-ausencia-modal__full"
                value={horaHasta}
                onChange={setHoraHasta}
              />
            </Col>
          </Row>
          <Checkbox
            checked={todoElDia}
            onChange={(e) => {
              setTodoElDia(e.target.checked);
              if (e.target.checked) {
                setHoraDesde(null);
                setHoraHasta(null);
              }
            }}
          >
            Todo el día
          </Checkbox>
        </>
      )}

      <Input.TextArea
        placeholder="Comentario (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        className="sol-ausencia-modal__comentario"
      />
    </Modal>
  );
};

export default SolicitarAusenciaModal;
