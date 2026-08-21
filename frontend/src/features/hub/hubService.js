import { getAuthToken } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}hub`;

const authHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const obtenerContextoHub = async () => {
  const response = await fetch(`${API_BASE_URL}/me`, { headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudo cargar el hub');
  }
  return data;
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudieron cargar las ventas');
  }
  return data;
};

export const listarComercialesHub = async () => {
  const response = await fetch(`${API_BASE_URL}/comerciales`, { headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudieron cargar los comerciales');
  }
  return data;
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

export const listarAccesosHub = async () => {
  const response = await fetch(`${API_BASE_URL}/accesos`, { headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudieron cargar los accesos');
  }
  return data;
};

export const listarPuestosHub = async () => {
  const response = await fetch(`${API_BASE_URL}/puestos`, { headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudieron cargar los puestos');
  }
  return data;
};

export const listarUsuariosInternosHub = async () => {
  const response = await fetch(`${API_BASE_URL}/usuarios-internos`, { headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudieron cargar los usuarios');
  }
  return data;
};

export const asignarAccesoHub = async ({ id_usuario, id_puesto }) => {
  const response = await fetch(`${API_BASE_URL}/accesos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id_usuario, id_puesto }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudo asignar el acceso');
  }
  return data;
};

export const revocarAccesoHub = async (id) => {
  const response = await fetch(`${API_BASE_URL}/accesos/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudo revocar el acceso');
  }
  return data;
};
