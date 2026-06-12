import { getAuthToken } from '../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}support`;

export const enviarMensajeSoporte = async (mensaje) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ mensaje }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo enviar el mensaje a soporte');
  }

  return data;
};
