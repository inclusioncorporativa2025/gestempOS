import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import { message } from 'antd';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + 'ausencias'; 

// Servicio para crear una ausencia
export const crearAusencia = async (
  idUsuario,
      idEmpresa,
      fecha_desde,
      fecha_hasta,
      hora_ausencia_desde,
      hora_ausencia_hasta,
      comentario,
      usuario_alta,
      tipo
) => {
  try {
    const response = await fetch(API_BASE_URL + `/crearAusencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
       idUsuario,
      idEmpresa,
      fecha_desde,
      fecha_hasta,
      hora_ausencia_desde,
      hora_ausencia_hasta,
      comentario,
      usuario_alta,
      tipo
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear ausencia');
    }

    const data = await response.json();
    return data; // respuesta del backend
  } catch (error) {
    console.error('Error en crearAusencia:', error);
    throw error;
  }
};
