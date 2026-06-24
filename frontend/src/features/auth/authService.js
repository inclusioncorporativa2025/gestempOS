import { setAuthToken, clearAuthSession, getAuthToken } from '../../utils/authSession';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + 'auth';

const authFetch = async (path, options = {}) => {
  const response = await fetch(API_BASE_URL + path, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
};

const buildAuthError = (response, data, fallback) => {
  const error = new Error(data.message || fallback);
  error.code = data.code;
  error.status = response.status;
  error.supportEmail = data.supportEmail;
  return error;
};

/**
 * Inicia sesión con email y contraseña contra el backend (JWT).
 * Guarda el token en localStorage si el login es correcto.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} { token, usuario }
 * @throws {Error} con propiedad `code` (p.ej. 'PASSWORD_RESET_REQUIRED') cuando aplica.
 */
export const doLogin = async (email, password) => {
  const { response, data } = await authFetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw buildAuthError(response, data, 'Error al iniciar sesión');
  }

  if (data.token) {
    setAuthToken(data.token);
  }

  return data;
};

/**
 * Completa el login tras elegir empresa (varias membresías activas).
 */
export const doSelectEmpresa = async (preAuthToken, id_empresa) => {
  const { response, data } = await authFetch('/select-empresa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preAuthToken, id_empresa }),
  });

  if (!response.ok) {
    throw buildAuthError(response, data, 'Error al seleccionar la empresa');
  }

  if (data.token) {
    setAuthToken(data.token);
  }

  return data;
};

/**
 * Cambia la empresa activa en sesión (usuario ya autenticado).
 */
export const doSwitchEmpresa = async (id_empresa) => {
  const token = getAuthToken();
  const { response, data } = await authFetch('/switch-empresa', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id_empresa }),
  });

  if (!response.ok) {
    throw buildAuthError(response, data, 'Error al cambiar de empresa');
  }

  if (data.token) {
    setAuthToken(data.token);
  }

  return data;
};

/**
 * Lista las empresas a las que el usuario tiene acceso.
 */
export const fetchMisEmpresas = async () => {
  const token = getAuthToken();
  const { response, data } = await authFetch('/mis-empresas', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw buildAuthError(response, data, 'Error al obtener empresas');
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

/** Registro público de empresa (landing «Empieza gratis»). */
export const registrarEmpresaPublica = async (values) => {
  const response = await fetch(`${API_BASE_URL}/register-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: {
        ...values,
        plan: 'esencial',
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Error al registrar la empresa');
  }

  return data;
};
