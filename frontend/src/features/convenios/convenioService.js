import { getIdEmpresa, getIdUsuario } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}convenios`;

const postJson = async (path, body = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Error en la petición de convenios');
    error.code = data.code;
    throw error;
  }
  return data;
};

export const listarCatalogoConvenios = async () => postJson('/catalogo/listar');

export const crearCatalogoConvenio = async (datos) => postJson('/catalogo/crear', datos);

export const actualizarCatalogoConvenio = async (datos) => postJson('/catalogo/actualizar', datos);

export const bajaCatalogoConvenio = async (idConvenio) => postJson('/catalogo/baja', { id_convenio: idConvenio });

export const listarConveniosEmpresa = async (idEmpresa) => {
  const empresaId = idEmpresa ?? getIdEmpresa();
  const data = await postJson('/empresa/listar', { idEmpresa: empresaId });
  return data.convenios || [];
};

export const incorporarConvenioEmpresa = async (idConvenio, datos = {}) => {
  const idEmpresa = getIdEmpresa();
  const data = await postJson('/empresa/incorporar', {
    idEmpresa,
    id_convenio: idConvenio,
    ...datos,
  });
  return data.convenio;
};

export const actualizarConvenioEmpresa = async (idEmpresaConvenio, datos = {}) => {
  const idEmpresa = getIdEmpresa();
  const data = await postJson('/empresa/actualizar', {
    idEmpresa,
    id_empresa_convenio: idEmpresaConvenio,
    ...datos,
  });
  return data.convenio;
};

export const bajaConvenioEmpresa = async (idEmpresaConvenio) => {
  const idEmpresa = getIdEmpresa();
  return postJson('/empresa/baja', { idEmpresa, id_empresa_convenio: idEmpresaConvenio });
};

export const obtenerConvenioUsuario = async (idUsuario) => {
  const idEmpresa = getIdEmpresa();
  const data = await postJson('/usuario', { idEmpresa, idUsuario: idUsuario ?? getIdUsuario() });
  return data.convenio;
};

export const previewDiasAusencia = async ({
  idUsuario,
  fecha_desde,
  fecha_hasta,
  fraccion_dia,
  hora_ausencia_desde,
  hora_ausencia_hasta,
  tipo,
}) => {
  const idEmpresa = getIdEmpresa();
  return postJson('/preview-dias', {
    idEmpresa,
    idUsuario,
    fecha_desde,
    fecha_hasta,
    fraccion_dia,
    hora_ausencia_desde,
    hora_ausencia_hasta,
    tipo,
  });
};
