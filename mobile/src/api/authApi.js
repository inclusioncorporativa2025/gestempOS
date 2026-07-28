import { apiFetch } from './client';
import { setAuthToken } from '../auth/session';

export const login = async (email, password) => {
  const data = await apiFetch('auth/login', {
    method: 'POST',
    body: { email, password },
  });

  if (data.token) {
    await setAuthToken(data.token);
  }

  return data;
};

export const selectEmpresa = async (preAuthToken, id_empresa) => {
  const data = await apiFetch('auth/select-empresa', {
    method: 'POST',
    body: { preAuthToken, id_empresa },
  });

  if (data.token) {
    await setAuthToken(data.token);
  }

  return data;
};

export const logout = async () => {
  try {
    await apiFetch('auth/logout', { method: 'POST', auth: true });
  } catch {
    // El logout real es borrar el token en cliente
  }
};
