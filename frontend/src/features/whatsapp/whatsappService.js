import { getAuthToken } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}whatsapp`;

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
    const error = new Error(data.error || data.message || 'Error WhatsApp');
    error.details = data.details;
    throw error;
  }
  return data;
};

/** Gasto Meta (pricing_analytics) — solo ROOT en backend. */
export const getWhatsappMetaGasto = async ({ from, to } = {}) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/meta/gasto${qs ? `?${qs}` : ''}`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
  );
  return parseResponse(response);
};
