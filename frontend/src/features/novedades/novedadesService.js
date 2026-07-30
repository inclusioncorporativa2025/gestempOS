import { getAuthToken } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}novedades`;

const postJson = async (path, body = {}) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Error en la petición de novedades');
    error.code = data.code;
    throw error;
  }
  return data;
};

export const obtenerNovedadPendiente = () => postJson('/pendiente');

export const listarNovedades = () => postJson('/listar');

export const marcarNovedadVista = (idNovedad) =>
  postJson('/marcar-vista', { id_novedad: idNovedad });

export const listarNovedadesAdmin = () => postJson('/admin/listar');

export const crearNovedadAdmin = (datos) => postJson('/admin/crear', datos);

export const actualizarNovedadAdmin = (datos) => postJson('/admin/actualizar', datos);

export const bajaNovedadAdmin = (idNovedad) =>
  postJson('/admin/baja', { id_novedad: idNovedad });
