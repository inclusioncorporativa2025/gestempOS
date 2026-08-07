import React, { useState } from 'react';
import { Modal, DatePicker, Input, Button, Typography, message } from 'antd';
import { MailOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import GradientButton from './shared/GradientButton';
import { descargarExcelDesdeAPI, enviarRegistrosHorariosPorEmail } from '../../features/user/usuarioService';

const { Text } = Typography;

const ExportRegistrosModal = ({
  open,
  onClose,
  idUsuario,
  requireUser = false,
}) => {
  const [exportDateRange, setExportDateRange] = useState(null);
  const [emailDestino, setEmailDestino] = useState('');
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const resetAndClose = () => {
    if (loadingDownload || loadingEmail) return;
    setExportDateRange(null);
    setEmailDestino('');
    onClose();
  };

  const obtenerRangoFechas = () => {
    if (!exportDateRange || exportDateRange.length !== 2) {
      message.error('Selecciona un rango de meses válido.');
      return null;
    }

    const [startMonth, endMonth] = exportDateRange;
    if (!startMonth || !endMonth) {
      message.error('Los meses seleccionados no son válidos.');
      return null;
    }

    return {
      startDate: startMonth.startOf('month').format('YYYY-MM-DD'),
      endDate: endMonth.endOf('month').format('YYYY-MM-DD'),
    };
  };

  const handleDownload = async () => {
    if (requireUser && !idUsuario) {
      message.error('Selecciona un usuario para exportar.');
      return;
    }

    const rango = obtenerRangoFechas();
    if (!rango) return;

    setLoadingDownload(true);
    try {
      await descargarExcelDesdeAPI(rango.startDate, rango.endDate, idUsuario);
      resetAndClose();
    } finally {
      setLoadingDownload(false);
    }
  };

  const handleSendEmail = async () => {
    if (requireUser && !idUsuario) {
      message.error('Selecciona un usuario para exportar.');
      return;
    }

    const destino = emailDestino.trim();
    if (!destino) {
      message.error('Indica el correo de destino.');
      return;
    }

    const rango = obtenerRangoFechas();
    if (!rango) return;

    setLoadingEmail(true);
    try {
      await enviarRegistrosHorariosPorEmail({
        idUsuario,
        startDate: rango.startDate,
        endDate: rango.endDate,
        email: destino,
      });
      message.success('Registros enviados por correo correctamente');
      resetAndClose();
    } catch (error) {
      message.error(error.message || 'No se pudo enviar el correo');
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <Modal
      title="Exportar registros horarios"
      open={open}
      onCancel={resetAndClose}
      footer={null}
      destroyOnClose
      centered
      width={520}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Selecciona el periodo y descarga el Excel o envíalo a un correo externo
        (gestoría, asesoría, etc.).
      </Text>

      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Periodo</Text>
        <DatePicker.RangePicker
          picker="month"
          style={{ width: '100%' }}
          format="MM/YYYY"
          value={exportDateRange}
          onChange={(dates) => setExportDateRange(dates)}
          disabledDate={(current) => current && current > dayjs()}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Correo externo</Text>
        <Input
          type="email"
          placeholder="ejemplo@gestoria.com"
          value={emailDestino}
          onChange={(e) => setEmailDestino(e.target.value)}
          disabled={loadingDownload || loadingEmail}
        />
        <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
          Puedes indicar varios correos separados por comas.
        </Text>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <Button onClick={resetAndClose} disabled={loadingDownload || loadingEmail}>
          Cancelar
        </Button>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          loading={loadingDownload}
          disabled={loadingEmail}
        >
          Descargar Excel
        </Button>
        <GradientButton
          text="Enviar por correo"
          iconStart={<MailOutlined />}
          onClick={handleSendEmail}
          loading={loadingEmail}
          disabled={loadingDownload}
        />
      </div>
    </Modal>
  );
};

export default ExportRegistrosModal;
