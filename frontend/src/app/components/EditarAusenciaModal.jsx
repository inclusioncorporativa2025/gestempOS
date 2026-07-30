import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, Row, Col, DatePicker, TimePicker, Checkbox, Input, Radio, Typography, message,
} from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { editarAusencia } from '../../features/ausencias/ausenciasService';
import { previewDiasAusencia } from '../../features/convenios/convenioService';
import {
  esTipoVacaciones,
  requiereComentarioAusencia,
} from '../../constants/tiposAusencia';
import './SolicitarAusenciaModal.css';

dayjs.extend(customParseFormat);

const { Text } = Typography;

const parseFechaAusencia = (valor) =>
  dayjs(valor, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);

const parseHora = (valor) => {
  if (!valor) return null;
  const hora = dayjs(String(valor).slice(0, 8), 'HH:mm:ss', true);
  return hora.isValid() ? hora : null;
};

const EditarAusenciaModal = ({ open, onClose, onSuccess, ausencia }) => {
  const [enviando, setEnviando] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
  const [fraccionDia, setFraccionDia] = useState('completo');
  const [todoElDia, setTodoElDia] = useState(true);
  const [horaDesde, setHoraDesde] = useState(null);
  const [horaHasta, setHoraHasta] = useState(null);
  const [comentario, setComentario] = useState('');
  const [previewDias, setPreviewDias] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const tipo = String(ausencia?.tipo || '').trim();
  const esVacaciones = esTipoVacaciones(tipo);
  const esUnSoloDia = Boolean(
    fechaDesde
    && (!fechaHasta || fechaDesde.isSame(fechaHasta, 'day')),
  );
  const mostrarFraccionVacaciones = esVacaciones && esUnSoloDia;
  const esRangoVariosDias = Boolean(
    esVacaciones && fechaDesde && fechaHasta && !fechaDesde.isSame(fechaHasta, 'day'),
  );

  useEffect(() => {
    if (!open || !ausencia) return;

    const desde = parseFechaAusencia(ausencia.fecha_desde);
    const hasta = parseFechaAusencia(ausencia.fecha_hasta);
    const horaDesdeParsed = parseHora(ausencia.hora_ausencia_desde);
    const horaHastaParsed = parseHora(ausencia.hora_ausencia_hasta);
    const fraccion = String(ausencia.fraccion_dia || 'completo').toLowerCase();

    setFechaDesde(desde.isValid() ? desde : null);
    setFechaHasta(hasta.isValid() ? hasta : null);
    setFraccionDia(['completo', 'manana', 'tarde'].includes(fraccion) ? fraccion : 'completo');
    setTodoElDia(!horaDesdeParsed && !horaHastaParsed);
    setHoraDesde(horaDesdeParsed);
    setHoraHasta(horaHastaParsed);
    setComentario(ausencia.comentarios || '');
    setPreviewDias(null);
  }, [open, ausencia]);

  useEffect(() => {
    if (!open || !esVacaciones || !fechaDesde || !ausencia?.id_usuario) {
      setPreviewDias(null);
      return undefined;
    }

    const fechaHastaPreview = fechaHasta || fechaDesde;
    let cancelado = false;

    const cargarPreview = async () => {
      setPreviewLoading(true);
      try {
        const usarFraccion = fechaDesde.isSame(fechaHastaPreview, 'day');
        const data = await previewDiasAusencia({
          idUsuario: ausencia.id_usuario,
          fecha_desde: fechaDesde.format('DD-MM-YYYY'),
          fecha_hasta: fechaHastaPreview.format('DD-MM-YYYY'),
          fraccion_dia: usarFraccion ? fraccionDia : 'completo',
          hora_ausencia_desde: (!todoElDia && !usarFraccion) ? horaDesde?.format('HH:mm:ss') : null,
          hora_ausencia_hasta: (!todoElDia && !usarFraccion) ? horaHasta?.format('HH:mm:ss') : null,
          tipo,
        });
        if (!cancelado) setPreviewDias(data);
      } catch {
        if (!cancelado) setPreviewDias(null);
      } finally {
        if (!cancelado) setPreviewLoading(false);
      }
    };

    const timer = setTimeout(cargarPreview, 350);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [
    open,
    esVacaciones,
    fechaDesde,
    fechaHasta,
    fraccionDia,
    todoElDia,
    horaDesde,
    horaHasta,
    ausencia?.id_usuario,
    tipo,
  ]);

  const tituloModal = useMemo(() => {
    const nombre = ausencia?.nombre_usuario;
    if (nombre) return `Editar ausencia de ${nombre}`;
    return 'Editar ausencia aprobada';
  }, [ausencia?.nombre_usuario]);

  const handleClose = () => {
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!ausencia?.id_ausencia) return;
    if (!fechaDesde) {
      message.error('Selecciona la fecha desde y la fecha hasta');
      return;
    }

    const fechaHastaEnvio = fechaHasta || fechaDesde;
    if (requiereComentarioAusencia(tipo) && !String(comentario || '').trim()) {
      message.error('Indica el motivo en el comentario');
      return;
    }

    const usarFraccionVacaciones = esVacaciones && fechaDesde.isSame(fechaHastaEnvio, 'day');

    setEnviando(true);
    try {
      await editarAusencia({
        idAusencia: ausencia.id_ausencia,
        fecha_desde: fechaDesde.format('DD-MM-YYYY'),
        fecha_hasta: fechaHastaEnvio.format('DD-MM-YYYY'),
        hora_ausencia_desde: (todoElDia || usarFraccionVacaciones) ? null : horaDesde?.format('HH:mm:ss'),
        hora_ausencia_hasta: (todoElDia || usarFraccionVacaciones) ? null : horaHasta?.format('HH:mm:ss'),
        comentario,
        fraccion_dia: usarFraccionVacaciones ? fraccionDia : null,
      });
      message.success('Ausencia actualizada. Se ha notificado al otro extremo.');
      handleClose();
      onSuccess?.();
    } catch (error) {
      if (error?.code === 'SALDO_VACACIONES_INSUFICIENTE') {
        message.error(
          error.message
          || `Saldo insuficiente (${error.disponibles ?? '?'} disponibles, ${error.solicitados ?? '?'} solicitados)`,
          6,
        );
        return;
      }
      const detalle = error.detalle ? ` (${error.detalle})` : '';
      message.error((error.message || 'Error al editar la ausencia') + detalle, 6);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      title={tituloModal}
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      okText="Guardar cambios"
      cancelText="Cancelar"
      confirmLoading={enviando}
      destroyOnClose
      className="sol-ausencia-modal"
      width={520}
    >
      <Text strong className="sol-ausencia-modal__tipo-bloqueado">
        Tipo: {tipo || '—'}
      </Text>

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
              } else if (esVacaciones && date && (!fechaHasta || eraUnSoloDia)) {
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

      {esVacaciones && fechaDesde && (
        <Text type="secondary" className="sol-ausencia-modal__hint">
          {previewLoading
            ? 'Calculando días…'
            : previewDias?.dias != null
              ? `Consumirá ${previewDias.dias} día(s) (${previewDias.modo_conteo_etiqueta || 'días naturales'}).`
              : null}
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
        placeholder={
          requiereComentarioAusencia(tipo)
            ? 'Comentario (obligatorio para «Otros»)'
            : 'Comentario (opcional)'
        }
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        className="sol-ausencia-modal__comentario"
      />
    </Modal>
  );
};

export default EditarAusenciaModal;
