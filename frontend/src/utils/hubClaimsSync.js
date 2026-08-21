import { obtenerContextoHub } from '../features/hub/hubService';

/** Consulta permisos hub en BD (GET /hub/me). */
export const fetchHubClaimsFromApi = async () => {
  const ctx = await obtenerContextoHub();
  return {
    hub_acceso: Boolean(ctx.hub_acceso),
    hub_puestos: ctx.hub_puestos || [],
    hub_permisos: ctx.hub_permisos || [],
  };
};

/** Fusiona claims hub del API sobre el usuario de sesión. */
export const mergeHubClaimsIntoUser = async (user) => {
  if (!user?.id_usuario) return user;
  try {
    const hubClaims = await fetchHubClaimsFromApi();
    return { ...user, ...hubClaims };
  } catch {
    return user;
  }
};
