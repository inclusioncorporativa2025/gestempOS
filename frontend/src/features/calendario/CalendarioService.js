const API_BASE_URL = process.env.REACT_APP_API_BASE_URL+'calendario'; 

const esquema = parseInt(sessionStorage.getItem('esquema'));
const idUsuario = parseInt(sessionStorage.getItem('idUsuario')); 


export const getFestivosByIdEmpresa = async () => {
  try {
    const idUsuario = parseInt(sessionStorage.getItem('idUsuario')); 
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa')); 

    const response = await fetch(API_BASE_URL+`/getFestivosByIdEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa }),
    });

    if (!response.ok) {
      const errorData = await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};



export const guardarFestivoEmpresa = async (fecha) => {
  try {
    const idUsuario = parseInt(sessionStorage.getItem('idUsuario')); 
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa')); 

    const response = await fetch(API_BASE_URL+`/guardarFestivoEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa,fecha }),
    });

    if (!response.ok) {
      const errorData = await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};


export const eliminarFestivoEmpresa = async (idFestivo) => {
  try {
    const idUsuario = parseInt(sessionStorage.getItem('idUsuario')); 
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa')); 

    const response = await fetch(API_BASE_URL+`/eliminarFestivoEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa, idFestivo }),
    });

    if (!response.ok) {
      const errorData = await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};