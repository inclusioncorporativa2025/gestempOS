import { getIdUsuario, getIdEmpresa } from '../../utils/authSession';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL+'calendario';

export const getFestivosByIdEmpresa = async () => {
  try {
    const idUsuario = getIdUsuario();
    const idEmpresa = getIdEmpresa();

    const response = await fetch(API_BASE_URL+`/getFestivosByIdEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error getFestivosByIdEmpresa');
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('Error en getFestivosByIdEmpresa:', error);
    throw error;
  }
};

export const guardarFestivoEmpresa = async (values) => {
  try {
    const idUsuario = getIdUsuario();
    const idEmpresa = getIdEmpresa();

    const response = await fetch(API_BASE_URL+`/guardarFestivoEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa, values }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error guardarFestivoEmpresa');
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('Error en guardarFestivoEmpresa:', error);
    throw error;
  }
};

export const eliminarFestivoEmpresa = async (idFestivo) => {
  try {
    const idUsuario = getIdUsuario();
    const idEmpresa = getIdEmpresa();

    const response = await fetch(API_BASE_URL+`/eliminarFestivoEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa, idFestivo }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error eliminarFestivoEmpresa');
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('Error en eliminarFestivoEmpresa:', error);
    throw error;
  }
};
