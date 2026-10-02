import { getAuthToken, getIdEmpresa } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}onboarding`;

const authHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Error en onboarding');
    error.code = data.code;
    throw error;
  }
  return data;
};

export const getOnboardingEstado = async (idEmpresa) => {
  const response = await fetch(`${API_BASE_URL}/estado`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ idEmpresa: idEmpresa ?? getIdEmpresa() }),
  });
  return parseResponse(response);
};

export const cerrarOnboarding = async (idEmpresa) => {
  const response = await fetch(`${API_BASE_URL}/cerrar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ idEmpresa: idEmpresa ?? getIdEmpresa() }),
  });
  return parseResponse(response);
};

export const omitirOnboarding = async (idEmpresa) => {
  const response = await fetch(`${API_BASE_URL}/omitir`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ idEmpresa: idEmpresa ?? getIdEmpresa() }),
  });
  return parseResponse(response);
};

export const marcarPasoOnboarding = async ({ idEmpresa, codigoPaso, visitaRuta } = {}) => {
  const response = await fetch(`${API_BASE_URL}/paso`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      idEmpresa: idEmpresa ?? getIdEmpresa(),
      codigoPaso,
      visitaRuta,
    }),
  });
  return parseResponse(response);
};
