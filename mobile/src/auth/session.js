import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'authToken';

const isExpired = (claims) => {
  if (!claims?.exp) return true;
  return claims.exp * 1000 <= Date.now();
};

export const decodeAuthToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
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
    plan_id: claims.plan_id ?? 'esencial',
  };
};

export const setAuthToken = async (token) => {
  if (!token) return null;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  const claims = decodeAuthToken(token);
  if (!claims || isExpired(claims)) {
    await clearAuthSession();
    return null;
  }
  return claims;
};

export const getAuthToken = async () => SecureStore.getItemAsync(TOKEN_KEY);

export const loadSession = async () => {
  const token = await getAuthToken();
  if (!token) return null;
  const claims = decodeAuthToken(token);
  if (!claims || isExpired(claims)) {
    await clearAuthSession();
    return null;
  }
  return claims;
};

export const clearAuthSession = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};
