import React, { useState } from 'react';
import { Upload, Tag, message } from 'antd';
import { LoadingOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons';
import {
  subirJustificanteAusencia,
  descargarJustificanteAusencia,
  listarJustificantesAusencia,
} from '../../features/ausencias/ausenciasService';
import { requiereJustificanteParaAprobar } from '../../constants/tiposAusencia';
import './JustificanteAusenciaAcciones.css';

const JustificanteAusenciaAcciones = ({
  ausencia,
  compact = false,
  onActualizado,
}) => {
  const [subiendo, setSubiendo] = useState(false);

  if (!ausencia?.id_ausencia) return null;

  const requiere = ausencia.requiere_justificante ?? requiereJustificanteParaAprobar(ausencia.tipo);
  if (!requiere) return <Tag color="default">No requerido</Tag>;

  const pendiente = !ausencia.fecha_aceptacion && !ausencia.fecha_cancelacion;
  const tiene = Boolean(ausencia.tiene_justificante);

  const handleUpload = async (file) => {
    setSubiendo(true);
    try {
      await subirJustificanteAusencia({ idAusencia: ausencia.id_ausencia, archivo: file });
      message.success('Justificante subido correctamente');
      onActualizado?.();
    } catch (error) {
      message.error(error.message || 'No se pudo subir el justificante');
    } finally {
      setSubiendo(false);
    }
    return false;
  };

  const handleDescargar = async () => {
    try {
      const { documentos } = await listarJustificantesAusencia(ausencia.id_ausencia);
      const doc = documentos?.[0];
      if (!doc) {
        message.warning('No hay justificante disponible');
        return;
      }
      await descargarJustificanteAusencia(doc.id_documento, doc.nombre_archivo);
    } catch (error) {
      message.error(error.message || 'No se pudo descargar el justificante');
    }
  };

  return (
    <div className="ja-acciones">
      <Tag color={tiene ? 'green' : 'orange'}>
        {tiene ? 'Adjunto' : 'Pendiente'}
      </Tag>
      {pendiente && (
        <Upload
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          showUploadList={false}
          beforeUpload={handleUpload}
          disabled={subiendo}
        >
          <button type="button" className="ja-upload-btn" disabled={subiendo}>
            {subiendo ? <LoadingOutlined spin /> : <UploadOutlined />}
            {compact ? 'Subir' : 'Subir justificante'}
          </button>
        </Upload>
      )}
      {tiene && (
        <button type="button" className="ja-ver-btn" onClick={handleDescargar}>
          <PaperClipOutlined />
          Ver
        </button>
      )}
    </div>
  );
};

export default JustificanteAusenciaAcciones;
