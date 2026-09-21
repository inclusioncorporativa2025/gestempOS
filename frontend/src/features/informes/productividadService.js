import { getIdEmpresa } from '../../utils/authSession';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}informes`;

export const getInformeProductividad = async (mes) => {
  const idEmpresa = getIdEmpresa();

  const response = await fetch(`${API_BASE_URL}/productividad`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa, mes }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'No se pudo cargar el informe de productividad');
    error.code = data.code;
    error.planLabel = data.planLabel;
    throw error;
  }

  return data;
};
