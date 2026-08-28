import { getAuthToken } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}hub`;

const authHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseHubResponse = async (response, fallbackMessage) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || fallbackMessage);
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
};

export const obtenerContextoHub = async () => {
  const response = await fetch(`${API_BASE_URL}/me`, { headers: authHeaders() });
  return parseHubResponse(response, 'No se pudo cargar el panel de ventas');
};

export const listarVentasHub = async ({ q, etapa, pagina = 1, limite = 50 } = {}) => {
  const params = new URLSearchParams();
  params.set('pagina', String(pagina));
  params.set('limite', String(limite));
  if (q) params.set('q', q);
  if (etapa) params.set('etapa', etapa);

  const response = await fetch(`${API_BASE_URL}/ventas?${params.toString()}`, {
    headers: authHeaders(),
  });
  return parseHubResponse(response, 'No se pudieron cargar las ventas');
};

export const listarInvitacionesHub = async ({ q, estado, pagina = 1, limite = 50 } = {}) => {
  const params = new URLSearchParams();
  params.set('pagina', String(pagina));
  params.set('limite', String(limite));
  if (q) params.set('q', q);
  if (estado) params.set('estado', estado);

  const response = await fetch(`${API_BASE_URL}/invitaciones?${params.toString()}`, {
    headers: authHeaders(),
  });
  return parseHubResponse(response, 'No se pudieron cargar las invitaciones');
};

export const listarComercialesHub = async ({ soloComercial = false } = {}) => {
  const params = new URLSearchParams();
  if (soloComercial) params.set('solo_comercial', '1');
  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/comerciales${query ? `?${query}` : ''}`,
    { headers: authHeaders() },
  );
  return parseHubResponse(response, 'No se pudieron cargar los comerciales');
};

export const crearInvitacionHub = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/invitaciones`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudo crear la invitación');
  }
  return data;
};

export const listarCampanasHub = async () => {
  const response = await fetch(`${API_BASE_URL}/campanas`, { headers: authHeaders() });
  return parseHubResponse(response, 'No se pudieron cargar las campañas');
};

export const crearCampanaHub = async ({ nombre, descripcion, dias_prueba: diasPrueba }) => {
  const response = await fetch(`${API_BASE_URL}/campanas`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ nombre, descripcion, dias_prueba: diasPrueba }),
  });
  return parseHubResponse(response, 'No se pudo crear la campaña');
};

export const asignarComercialHub = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/ventas/asignar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudo asignar el comercial');
  }
  return data;
};

export const previewInvitacionHub = async ({ inv, codigo } = {}) => {
  const params = new URLSearchParams();
  if (inv) params.set('inv', inv);
  if (codigo) params.set('codigo', codigo);

  const response = await fetch(`${API_BASE_URL}/invitaciones/preview?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Invitación no válida');
  }
  return data;
};

export const obtenerMetricasHub = async () => {
  const response = await fetch(`${API_BASE_URL}/metricas`, { headers: authHeaders() });
  return parseHubResponse(response, 'No se pudieron cargar las métricas');
};

export const listarAccesosHub = async () => {
  const response = await fetch(`${API_BASE_URL}/accesos`, { headers: authHeaders() });
  return parseHubResponse(response, 'No se pudieron cargar los accesos');
};

export const listarPuestosHub = async () => {
  const response = await fetch(`${API_BASE_URL}/puestos`, { headers: authHeaders() });
  return parseHubResponse(response, 'No se pudieron cargar los puestos');
};

export const listarUsuariosInternosHub = async () => {
  const response = await fetch(`${API_BASE_URL}/usuarios-internos`, { headers: authHeaders() });
  return parseHubResponse(response, 'No se pudieron cargar los usuarios');
};

export const asignarAccesoHub = async ({ id_usuario, id_puesto }) => {
  const response = await fetch(`${API_BASE_URL}/accesos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id_usuario, id_puesto }),
  });
  return parseHubResponse(response, 'No se pudo asignar el acceso');
};

export const revocarAccesoHub = async (id) => {
  const response = await fetch(`${API_BASE_URL}/accesos/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseHubResponse(response, 'No se pudo revocar el acceso');
};

export const eliminarVentaHub = async (idVenta) => {
  const response = await fetch(`${API_BASE_URL}/ventas/${idVenta}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseHubResponse(response, 'No se pudo eliminar el cliente');
};

export const transferirVentaHub = async (idVenta, idUsuarioComercial) => {
  const response = await fetch(`${API_BASE_URL}/ventas/${idVenta}/transferir`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id_usuario_comercial: idUsuarioComercial }),
  });
  return parseHubResponse(response, 'No se pudo transferir el cliente');
};

export const eliminarInvitacionHub = async (idInvitacion) => {
  const response = await fetch(`${API_BASE_URL}/invitaciones/${idInvitacion}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseHubResponse(response, 'No se pudo eliminar la invitación');
};

export const transferirInvitacionHub = async (idInvitacion, idUsuarioComercial) => {
  const response = await fetch(`${API_BASE_URL}/invitaciones/${idInvitacion}/transferir`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id_usuario_comercial: idUsuarioComercial }),
  });
  return parseHubResponse(response, 'No se pudo transferir la invitación');
};
