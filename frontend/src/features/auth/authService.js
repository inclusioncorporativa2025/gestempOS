const API_BASE_URL = process.env.REACT_APP_API_BASE_URL+'auth'; 
/**
 * Inicia sesión con el email y contraseña proporcionados.
 * @param {string} email - Correo electrónico del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<object>} - Respuesta del servidor con los datos del usuario.
 */
export const doLogin = async (email, password) => {
  try {
    const response = await fetch(API_BASE_URL+`/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al iniciar sesión');
    }

    const data = await response.json();
    localStorage.setItem('authToken', data.token);  // Guarda el token
    return data;
  } catch (error) {
    console.error('Error en doLogin:', error);
    throw error;
  }
};

/**
 * Cierra la sesión del usuario.
 */
export const doLogout = () => {
  localStorage.removeItem('authToken');  // Limpia el token
};

/**
 * Verifica si el usuario está autenticado.
 * @returns {Promise<boolean>} - `true` si el usuario está autenticado, de lo contrario `false`.
 */
export const getAuthStatus = async () => {
  const token = localStorage.getItem('authToken');
  if (!token) return false;

  try {
    const response = await fetch(API_BASE_URL+`/auth-status`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.isAuthenticated;
  } catch (error) {
    console.error('Error en getAuthStatus:', error);
    return false;
  }
};

/**
 * Registra un nuevo usuario.
 * @param {string} nombreCompleto - Nombre completo del usuario.
 * @param {string} email - Correo electrónico del usuario.
 * @returns {Promise<object>} - Respuesta del servidor.
 */
export const doRegister = async (nombreCompleto, email,password, empresa) => {
  try {
    const response = await fetch(API_BASE_URL+`/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombreCompleto, email,password, empresa }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al registrar usuario');
    }

    const data = await response.json();

    return data;  // Retorna la respuesta del servidor (esto podría ser un mensaje de éxito o los datos del usuario)
  } catch (error) {
    console.error('Error en doRegister:', error);
    throw error;
  }
};



export const doCrearUsuario = async ( email,password) => {
  try {
    const response = await fetch(API_BASE_URL+`/crearUsuario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al registrar usuario');
    }

    const data = await response.json();

    return data;  // Retorna la respuesta del servidor (esto podría ser un mensaje de éxito o los datos del usuario)
  } catch (error) {
    console.error('Error en doRegister:', error);
    throw error;
  }
};


/**
 * Registra un nuevo usuario.
 * @param {string} nombreCompleto - Nombre completo del usuario.
 * @param {string} email - Correo electrónico del usuario.
 * @returns {Promise<object>} - Respuesta del servidor.
 */
export const completarRegistro = async (nombreCompleto, email ,password, empresa, usuarioAlta, tipoUsuario) => {
  try {
    const response = await fetch(API_BASE_URL+`/completarRegistro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombreCompleto, email,password, empresa,usuarioAlta, tipoUsuario }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al registrar usuario');
    }

    const data = await response.json();

    return data;  // Retorna la respuesta del servidor (esto podría ser un mensaje de éxito o los datos del usuario)
  } catch (error) {
    console.error('Error en doRegister:', error);
    throw error;
  }
};


