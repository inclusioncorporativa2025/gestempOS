import { getIdEmpresa } from '../../utils/authSession';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + 'vacaciones';

export const getSaldoVacaciones = async (idUsuario, anio) => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/getSaldoVacaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa, idUsuario, anio }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Error al cargar saldo de vacaciones');
  }
  return data;
};

export const guardarCupoVacaciones = async (idUsuario, cupo) => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/guardarCupoVacaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa, idUsuario, ...cupo }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Error al guardar cupo de vacaciones');
  }
  return data;
};

export const ajustarSaldoVacaciones = async (idUsuario, { anio, dias, motivo }) => {
  const idEmpresa = getIdEmpresa();
  const response = await fetch(`${API_BASE_URL}/ajustarSaldoVacaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa, idUsuario, anio, dias, motivo }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Error al ajustar saldo de vacaciones');
  }
  return data;
};
