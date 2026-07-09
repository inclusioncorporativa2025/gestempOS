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

export const listarFacturasEmitidas = async (limit = 5) => {
  const response = await fetch(`${API_BASE_URL}/facturas?limit=${limit}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseJsonError(response, 'Error al cargar las facturas');
};

/** @deprecated usar listarFacturasEmitidas */
export const listarFacturasPagadas = listarFacturasEmitidas;

export const abrirDocumentoFactura = async (idFactura) => {
  const token = getAuthToken();
  const response = await fetch(
    `${API_BASE_URL}/facturas/${encodeURIComponent(idFactura)}/documento`,
    {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'No se pudo abrir la factura');
  }

  const html = await response.text();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const ventana = window.open(url, '_blank', 'noopener,noreferrer');
  if (!ventana) {
    URL.revokeObjectURL(url);
    throw new Error('Permite las ventanas emergentes para ver la factura');
  }
  ventana.addEventListener('load', () => URL.revokeObjectURL(url));
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

export const ampliarLicencias = async (licencias) => {
  const body = licencias != null ? { licencias } : {};
  const response = await fetch(`${API_BASE_URL}/ampliar-licencias`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return parseJsonError(response, 'Error al ampliar las licencias');
};

export const getRenovacionInfo = async (token) => {
  const response = await fetch(
    `${API_BASE_URL}/renovacion/info?token=${encodeURIComponent(token)}`,
    { method: 'GET' },
  );
  const data = await parseJsonError(response, 'No se pudo cargar la renovación');
  return data.info;
};

export const crearCheckoutRenovacion = async ({ token, plan, ciclo, licencias }) => {
  const response = await fetch(`${API_BASE_URL}/renovacion/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, plan, ciclo, licencias }),
  });
  return parseJsonError(response, 'Error al iniciar el pago');
};

export const verificarSesionCheckout = async (sessionId) => {
  const response = await fetch(
    `${API_BASE_URL}/session/${encodeURIComponent(sessionId)}/verify`,
    { method: 'GET' },
  );
  const data = await parseJsonError(response, 'Error al verificar el pago');
  return data.sesion;
};
