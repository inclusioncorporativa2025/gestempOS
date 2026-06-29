import { getAuthToken } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}billing`;

const authHeaders = () => {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const parseJsonError = async (response, fallback) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || fallback);
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
};

export const getEstadoFacturacion = async () => {
  const response = await fetch(`${API_BASE_URL}/estado`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await parseJsonError(response, 'Error al cargar la suscripción');
  return data.estado;
};

export const crearCheckout = async ({ plan, ciclo, licencias }) => {
  const response = await fetch(`${API_BASE_URL}/checkout`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ plan, ciclo, licencias }),
  });
  return parseJsonError(response, 'Error al iniciar el pago');
};

export const crearPortal = async (returnUrl) => {
  const response = await fetch(`${API_BASE_URL}/portal`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ returnUrl }),
  });
  return parseJsonError(response, 'Error al abrir el portal de suscripción');
};

export const cancelarSuscripcion = async () => {
  const response = await fetch(`${API_BASE_URL}/cancelar`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJsonError(response, 'Error al cancelar la suscripción');
};

export const reactivarSuscripcion = async () => {
  const response = await fetch(`${API_BASE_URL}/reactivar`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJsonError(response, 'Error al reactivar la suscripción');
};

export const verificarSesionCheckout = async (sessionId) => {
  const response = await fetch(
    `${API_BASE_URL}/session/${encodeURIComponent(sessionId)}/verify`,
    { method: 'GET' },
  );
  const data = await parseJsonError(response, 'Error al verificar el pago');
  return data.sesion;
};
