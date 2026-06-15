import { getAuthToken } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}platform`;

const authHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const registrarNavegacion = async (ruta) => {
  const response = await fetch(`${API_BASE_URL}/registrarNavegacion`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ruta }),
  });

  if (!response.ok) {
    return null;
  }

  return response.json().catch(() => ({}));
};

export const listarAccesos = async ({ pagina = 1, limite = 50, tipo, q } = {}) => {
  const params = new URLSearchParams();
  params.set('pagina', String(pagina));
  params.set('limite', String(limite));
  if (tipo) params.set('tipo', tipo);
  if (q) params.set('q', q);

  const response = await fetch(`${API_BASE_URL}/accesos?${params.toString()}`, {
    headers: authHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'No se pudieron cargar los accesos');
  }

  return data;
};

export const accederComoUsuario = async (email) => {
  const response = await fetch(`${API_BASE_URL}/accederComoUsuario`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo acceder a la cuenta');
  }

  return data;
};
