import { getIdEmpresa } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}nominas`;

const parseJsonError = async (response, fallback) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || fallback);
  }
  return data;
};

export const getRetribucion = async (idUsuario) => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/getRetribucion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa, idUsuario }),
  });
  return parseJsonError(response, 'Error al cargar la retribución');
};

export const guardarRetribucion = async (idUsuario, retribucion) => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/guardarRetribucion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa, idUsuario, ...retribucion }),
  });
  return parseJsonError(response, 'Error al guardar la retribución');
};

export const listarNominas = async (filtros = {}) => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/listarNominas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa, ...filtros }),
  });
  return parseJsonError(response, 'Error al cargar las nóminas');
};

export const subirNomina = async ({ idUsuario, periodoMes, periodoAnio, archivo }) => {
  const idEmpresa = getIdEmpresa();
  const formData = new FormData();
  formData.append('idEmpresa', String(idEmpresa));
  formData.append('idUsuario', String(idUsuario));
  formData.append('periodoMes', String(periodoMes));
  formData.append('periodoAnio', String(periodoAnio));
  formData.append('archivo', archivo);

  const response = await fetch(`${API_BASE_URL}/subirNomina`, {
    method: 'POST',
    body: formData,
  });
  return parseJsonError(response, 'Error al subir la nómina');
};

export const eliminarNomina = async (idDocumento) => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/eliminarNomina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa, idDocumento }),
  });
  return parseJsonError(response, 'Error al eliminar la nómina');
};

export const misNominas = async () => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/misNominas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa }),
  });
  return parseJsonError(response, 'Error al cargar tus nóminas');
};

export const descargarNomina = async (idDocumento, nombreArchivo = 'nomina.pdf') => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/descargarNomina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa, idDocumento }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Error al descargar la nómina');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
