import { getAuthToken, getIdEmpresa } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}marketplace`;

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
    const error = new Error(data.message || 'Error en marketplace');
    error.code = data.code;
    throw error;
  }
  return data;
};

export const getMarketplaceCatalogo = async () => {
  const response = await fetch(`${API_BASE_URL}/catalogo`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  return parseResponse(response);
};

export const getMarketplaceEstadoEmpresa = async (idEmpresa) => {
  const id = idEmpresa ?? getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/empresa/estado`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ idEmpresa: id }),
  });
  return parseResponse(response);
};

export const activarModuloEmpresa = async ({ idEmpresa, codigoModulo, configJson }) => {
  const response = await fetch(`${API_BASE_URL}/empresa/activar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      idEmpresa: idEmpresa ?? getIdEmpresa(),
      codigoModulo,
      config_json: configJson,
    }),
  });
  return parseResponse(response);
};

export const cancelarModuloEmpresa = async ({ idEmpresa, codigoModulo }) => {
  const response = await fetch(`${API_BASE_URL}/empresa/cancelar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      idEmpresa: idEmpresa ?? getIdEmpresa(),
      codigoModulo,
    }),
  });
  return parseResponse(response);
};

export const listarAsignacionesModulo = async ({ idEmpresa, codigoModulo }) => {
  const response = await fetch(`${API_BASE_URL}/asignaciones/listar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      idEmpresa: idEmpresa ?? getIdEmpresa(),
      codigoModulo,
    }),
  });
  return parseResponse(response);
};

export const guardarAsignacionModulo = async ({
  idEmpresa,
  codigoModulo,
  idUsuario,
  asignado,
  canalEmail,
  canalWhatsapp,
}) => {
  const response = await fetch(`${API_BASE_URL}/asignaciones/guardar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      idEmpresa: idEmpresa ?? getIdEmpresa(),
      codigoModulo,
      idUsuario,
      asignado,
      canal_email: canalEmail,
      canal_whatsapp: canalWhatsapp,
    }),
  });
  return parseResponse(response);
};
