import dayjs from 'dayjs';
import tz from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { getFechaEuropeMadrid } from '../../utils/Helper';
import { getIdUsuario, getIdEmpresa } from '../../utils/authSession';


dayjs.extend(utc);
dayjs.extend(tz);
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL+'ficha'; 

// Función para obtener la ubicación
export const getUbicacion = () => {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => reject(error)
      );
    } else {
      reject(new Error('Geolocalización no soportada en este navegador.'));
    }
  });
};


export const getCierresMensualesByIdEmpresa = async () => {
  try {
    const idEmpresa = getIdEmpresa(); 

    const response = await fetch(API_BASE_URL+`/getCierresMensualesByIdEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa }),
    });

    if (!response.ok) {
      await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};

export const responderPeticionCierre = async (peticion, estado) => {
  try {
    const idEmpresa = getIdEmpresa();
    const idUsuario = getIdUsuario();

    const response = await fetch(API_BASE_URL + `/responderPeticionCierre`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa, peticion, estado,idUsuario }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al responder petición cierre');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error respondiendo petición cierre:', error);
    throw error;
  }
};



export const getDatosUsuario = async () => {
  try {
    const idUsuario = getIdUsuario(); 
    const idEmpresa = getIdEmpresa(); 

    const response = await fetch(API_BASE_URL+`/getData`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa }),
    });

    if (!response.ok) {
      await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};

export const crearPeticionEdicion = async (values) => {
  try {
    const idUsuario = getIdUsuario(); 
    const idEmpresa = getIdEmpresa(); 

    const response = await fetch(API_BASE_URL+`/crearPeticionEdicion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa, values }),
    });

    if (!response.ok) {
       await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};


export const crearPeticionCierreMes = async (mes) => {
  try {
    const idUsuario = getIdUsuario(); 
    const idEmpresa = getIdEmpresa(); 

    const response = await fetch(API_BASE_URL+`/crearPeticionCierreMes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa, mes }),
    });

    if (!response.ok) {
       await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};


export const getPeticionesByIdEmpresa = async () => {
  try {
    const idEmpresa = getIdEmpresa(); 

    const response = await fetch(API_BASE_URL+`/getPeticionesByIdEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({  idEmpresa}),
    });

    if (!response.ok) {
       await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};


export const getDatosUsuarioMes = async (idUsuario,mes) => {
  try {
    const idEmpresa = getIdEmpresa(); 

    const response = await fetch(API_BASE_URL+`/getDatosUsuarioMes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({  idEmpresa, idUsuario, mes}),
    });

    if (!response.ok) {
       await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};


export const responderPeticion = async (peticion, estado) => {
  try {
    const idEmpresa = getIdEmpresa();
    const idUsuario = getIdUsuario();
    const idPeticion = peticion.id_peticion;
    const response = await fetch(API_BASE_URL+`/responderPeticion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa, idUsuario, idPeticion, estado }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error respondiendo petición');
    }

    const data = await response.json();

    if (estado === 2) {
      await editarRegistro(peticion);
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo datos:', error);
    throw error;
  }
};





export const getPeticionesByIdUsuario = async () => {
  try {
    const idEmpresa = getIdEmpresa(); 
    const idUsuario = getIdUsuario(); 

    const response = await fetch(API_BASE_URL+`/getPeticionesByIdUsuario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa}),
    });

    if (!response.ok) {
       await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};




export const getDatosUsuarioById = async (idUsuario) => {
  try {
    const idEmpresa = getIdEmpresa(); 

    const response = await fetch(API_BASE_URL+`/getDataById`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa }),
    });

    if (!response.ok) {
       await response.json();
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
  }   
};

export const crearRegistro = async (tipoRegistro, idUsuario,guardarUbicacion) => {
  try {
    const usuarioAccion = getIdUsuario(); 
    const idEmpresa = getIdEmpresa(); 
    const fecha = getFechaEuropeMadrid();
    var ubicacion;
    if(guardarUbicacion){
      ubicacion = await getUbicacion(); 
    }else{
      ubicacion = {latitude: 0, longitude: 0};
    }


    const response = await fetch(API_BASE_URL+`/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa, tipoRegistro, ubicacion, fecha, usuarioAccion }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error creando registro');
    }

    const data = await response.json();

    return data;  // Retorna la respuesta del servidor 
  } catch (error) {
    console.error('Error creando registro:', error);
  }   
};


export const eliminarRegistro = async (idRegistro) => {
  const idFichaje = String(idRegistro).replace(/^fichaje-/, '');
  const usuarioAccion = getIdUsuario();
  const idEmpresa = getIdEmpresa();
  const fecha = getFechaEuropeMadrid();

  const response = await fetch(API_BASE_URL + `/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idRegistro: idFichaje,
      idEmpresa,
      fecha,
      usuarioAccion,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Error al eliminar el registro');
  }

  return data;
};


export const getHorasTotales = async () => {
  try {
    const usuarioAccion = getIdUsuario(); 
    const idEmpresa = getIdEmpresa(); 


    const response = await fetch(API_BASE_URL+`/getHoras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({  idEmpresa,usuarioAccion }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error obteniendo horas:', errorData);

    }

    const data = await response.json();

    return data;  // Retorna la respuesta del servidor 
  } catch (error) {
    console.error('Error creando registro:', error);
  }   
};


export const editarRegistro = async (values) => {
  try {
    const usuarioAccion = getIdUsuario(); 
    const idEmpresa = getIdEmpresa(); 

      const horaEntrada = dayjs(values.nueva_entrada)
      .tz('Europe/Madrid', true)
      .format('YYYY-MM-DD HH:mm:ss');

      const horaSalida = dayjs(values.nueva_salida)
      .tz('Europe/Madrid', true)
      .format('YYYY-MM-DD HH:mm:ss');   

    const response = await fetch(API_BASE_URL+`/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values, usuarioAccion,idEmpresa,horaEntrada,horaSalida }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error editando datos');
    }

    const data = await response.json();

    return data;  // Retorna la respuesta del servidor 
  } catch (error) {
    console.error('Error editando registro:', error);
  }   
};
