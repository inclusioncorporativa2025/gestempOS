import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'authToken';

let cachedClaims = null;

/**
 * Decodifica el payload del JWT (firmado en servidor; el cliente no verifica la firma).
 */
export const decodeAuthToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

const isExpired = (claims) => {
  if (!claims?.exp) return true;
  return claims.exp * 1000 <= Date.now();
};

export const loadSessionFromStorage = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    cachedClaims = null;
    return null;
  }

  const claims = decodeAuthToken(token);
  if (!claims || isExpired(claims)) {
    clearAuthSession();
    return null;
  }

  cachedClaims = claims;
  return claims;
};

export const setAuthToken = (token) => {
  if (!token) return null;
  localStorage.setItem(TOKEN_KEY, token);
  const claims = decodeAuthToken(token);
  if (!claims || isExpired(claims)) {
    clearAuthSession();
    return null;
  }
  cachedClaims = claims;
  return claims;
};

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

export const clearAuthSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('isLoggedIn');
  sessionStorage.clear();
  cachedClaims = null;
};

export const getSession = () => {
  if (cachedClaims && !isExpired(cachedClaims)) return cachedClaims;
  return loadSessionFromStorage();
};

export const claimsToUser = (claims) => {
  if (!claims) return null;
  return {
    id_usuario: claims.id_usuario,
    email: claims.email,
    tipo_usuario: Number(claims.tipo_usuario),
    nombre: claims.nombre,
    id_empresa: claims.id_empresa,
    nombre_empresa: claims.nombre_empresa,
    alias: claims.alias,
    esquema: claims.esquema ?? claims.id_empresa,
  };
};

export const getIdUsuario = () => {
  const id = getSession()?.id_usuario;
  return id != null ? parseInt(id, 10) : null;
};

export const getIdEmpresa = () => {
  const id = getSession()?.id_empresa;
  return id != null ? parseInt(id, 10) : null;
};

export const getTipoUsuario = () => {
  const t = getSession()?.tipo_usuario;
  return t != null ? Number(t) : null;
};

export const getEsquema = () => getIdEmpresa();

export const getNombreUsuario = () => getSession()?.nombre ?? '';

export const getNombreEmpresa = () => getSession()?.nombre_empresa ?? '';

export const getAlias = () => getSession()?.alias ?? '';

export const isAuthenticated = () => Boolean(getSession());
