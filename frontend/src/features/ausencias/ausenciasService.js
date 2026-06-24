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

/** Listado de solicitudes de ausencia (rangos completos). */
export const getAusenciasListado = async (mes) => {
  const idEmpresa = getIdEmpresa();
  const body = { idEmpresa };
  if (mes) body.mes = mes;

  const response = await fetch(`${API_BASE_URL}/getAusenciasListado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al cargar ausencias');
  }

  return response.json();
};

export const getAusenciasPendientesEmpresa = async () => {
  const response = await fetch(`${API_BASE_URL}/getAusenciasPendientesEmpresa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al cargar ausencias pendientes');
  }
  return response.json();
};

export const getHistorialAusenciasEmpresa = async () => {
  const response = await fetch(`${API_BASE_URL}/getHistorialAusenciasEmpresa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al cargar historial de ausencias');
  }
  return response.json();
};

export const getAusenciasNotificacionesEmpleado = async () => {
  const response = await fetch(`${API_BASE_URL}/getAusenciasNotificacionesEmpleado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al cargar notificaciones de ausencias');
  }
  return response.json();
};

export const responderAusencia = async (ausencia, estado, motivoRechazo) => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/responderAusencia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idEmpresa,
      idAusencia: ausencia.id_ausencia,
      estado,
      motivoRechazo,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || 'Error al procesar la solicitud');
    err.code = data.code;
    err.disponibles = data.disponibles;
    err.solicitados = data.solicitados;
    throw err;
  }
  return data;
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
      tipo,
      fraccion_dia = null,
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
      tipo,
      fraccion_dia,
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
