import { setAuthToken, clearAuthSession, getAuthToken } from '../../utils/authSession';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + 'auth';

/**
 * Inicia sesión con email y contraseña contra el backend (JWT).
 * Guarda el token en localStorage si el login es correcto.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} { token, usuario }
 * @throws {Error} con propiedad `code` (p.ej. 'PASSWORD_RESET_REQUIRED') cuando aplica.
 */
export const doLogin = async (email, password) => {
  const response = await fetch(API_BASE_URL + `/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Error al iniciar sesión');
    error.code = data.code;
    error.status = response.status;
    throw error;
  }

  if (data.token) {
    setAuthToken(data.token);
  }

  return data;
};

/**
 * Cierra la sesión del usuario (descarta el token y los datos de sesión).
 */
export const doLogout = () => {
  clearAuthSession();
};

export const getStoredToken = () => getAuthToken();

/**
 * Solicita el envío del correo de restablecimiento de contraseña.
 * @param {string} email
 * @returns {Promise<object>} respuesta del servidor (incluye devResetUrl en desarrollo).
 */
export const doForgotPassword = async (email) => {
  const response = await fetch(API_BASE_URL + `/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Error al solicitar el restablecimiento');
  }

  return data;
};

/**
 * Establece una nueva contraseña a partir del token recibido por email.
 * @param {string} email
 * @param {string} token
 * @param {string} password
 * @returns {Promise<object>}
 */
export const doResetPassword = async (email, token, password) => {
  const response = await fetch(API_BASE_URL + `/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Error al restablecer la contraseña');
  }

  return data;
};
