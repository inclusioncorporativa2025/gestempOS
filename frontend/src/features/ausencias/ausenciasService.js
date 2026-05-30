import { getIdEmpresa } from '../../utils/authSession';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + 'ausencias';

/** Ausencias expandidas por día para el calendario (permisos en servidor). */
export const getAusenciasCalendario = async () => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/getAusenciasCalendario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al cargar ausencias del calendario');
  }

  return response.json();
};

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
      const errorData = await response.json().catch(() => ({}));
      const err = new Error(errorData.error || 'Error al crear ausencia');
      if (errorData.detalle) err.detalle = errorData.detalle;
      throw err;
    }

    const data = await response.json();
    return data; // respuesta del backend
  } catch (error) {
    console.error('Error en crearAusencia:', error);
    throw error;
  }
};
