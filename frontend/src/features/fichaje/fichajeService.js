import dayjs from 'dayjs';
import tz from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { getFechaEuropeMadrid } from '../../utils/Helper';
import { getIdUsuario, getIdEmpresa } from '../../utils/authSession';


dayjs.extend(utc);
dayjs.extend(tz);
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL+'ficha'; 

const bodyGestionEmpresa = () => {
  const idEmpresa = getIdEmpresa();
  return idEmpresa ? { idEmpresa } : {};
};

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20000,
};

/** Objetivo ~40 m; si no llega, se usa la mejor lectura hasta este máximo (m). */
const TARGET_ACCURACY_M = 40;
const MAX_ACCEPTABLE_ACCURACY_M = 150;
const GEO_MAX_WAIT_MS = 12000;

const geoErrorMessage = (error) => {
  switch (error?.code) {
    case 1:
      return 'Permiso de GPS denegado. Actívalo en el navegador o en los ajustes del sistema.';
    case 2:
      return 'No se pudo obtener la posición. Comprueba que el GPS esté activo.';
    case 3:
      return 'Tiempo de espera agotado. Prueba al aire libre o con mejor señal.';
    default:
      return error?.message || 'Error al obtener la posición GPS';
  }
};

const readingFromPosition = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
});

/**
 * Varias lecturas GPS y se conserva la de menor error (metros).
 * Mejor que getCurrentPosition único, sobre todo en portátil/Wi‑Fi.
 */
export const getUbicacion = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada en este navegador.'));
      return;
    }

    let best = null;
    let watchId = null;
    const startedAt = Date.now();

    const cleanup = () => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const tryFinish = () => {
      if (!best) return;
      if (best.accuracy <= TARGET_ACCURACY_M || Date.now() - startedAt >= GEO_MAX_WAIT_MS) {
        cleanup();
        clearTimeout(maxTimer);
        resolve(best);
      }
    };

    const onPosition = (position) => {
      const reading = readingFromPosition(position);
      if (!best || reading.accuracy < best.accuracy) {
        best = reading;
      }
      tryFinish();
    };

    const onError = (error) => {
      cleanup();
      clearTimeout(maxTimer);
      if (best && best.accuracy <= MAX_ACCEPTABLE_ACCURACY_M) {
        resolve(best);
        return;
      }
      reject(new Error(geoErrorMessage(error)));
    };

    const maxTimer = setTimeout(() => {
      cleanup();
      if (best) {
        resolve(best);
      } else {
        reject(new Error(geoErrorMessage({ code: 3 })));
      }
    }, GEO_MAX_WAIT_MS + 2500);

    watchId = navigator.geolocation.watchPosition(onPosition, onError, GEO_OPTIONS);
  });


export const getDireccionDesdeCoords = async (lat, lng) => {
  const response = await fetch(`${API_BASE_URL}/reverseGeocode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng }),
  });

  if (!response.ok) {
    throw new Error('No se pudo obtener la dirección');
  }

  const data = await response.json();
  return data.direccion || '';
};

export const countNotificacionesPendientes = async () => {
  try {
    const payload = bodyGestionEmpresa();
    if (!payload.idEmpresa) {
      return { correcciones: 0, cierres: 0, total: 0 };
    }

    const response = await fetch(API_BASE_URL + `/countNotificacionesPendientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('countNotificacionesPendientes:', errorData?.error || response.status);
      return { correcciones: 0, cierres: 0, total: 0 };
    }

    return await response.json();
  } catch (error) {
    console.error('Error contando notificaciones pendientes:', error);
    return { correcciones: 0, cierres: 0, total: 0 };
  }
};

export const countNotificacionesEmpleado = async () => {
  try {
    const idEmpresa = getIdEmpresa();
    const idUsuario = getIdUsuario();
    if (!idEmpresa || !idUsuario) return { total: 0 };

    const response = await fetch(API_BASE_URL + '/countNotificacionesEmpleado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa, idUsuario }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('countNotificacionesEmpleado:', data?.error || response.status);
      return { total: 0 };
    }

    return data;
  } catch (error) {
    console.error('Error contando notificaciones del empleado:', error);
    return { total: 0 };
  }
};

export const marcarPeticionesVistas = async () => {
  try {
    const idEmpresa = getIdEmpresa();
    const idUsuario = getIdUsuario();
    if (!idEmpresa || !idUsuario) return;

    await fetch(API_BASE_URL + '/marcarPeticionesVistas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa, idUsuario }),
    });
  } catch (error) {
    console.error('Error marcando peticiones vistas:', error);
  }
};

export const getHistorialEdicionesHorario = async () => {
  try {
    const response = await fetch(API_BASE_URL + `/getHistorialEdicionesHorario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyGestionEmpresa()),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('getHistorialEdicionesHorario:', data?.error || response.status);
      return { data: [] };
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo historial de ediciones:', error);
    return { data: [] };
  }
};

export const getFirmaCierreMensual = async (idMesCierre) => {
  try {
    const idEmpresa = getIdEmpresa();
    const response = await fetch(API_BASE_URL + '/getFirmaCierreMensual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa, id_mes_cierre: idMesCierre }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('getFirmaCierreMensual:', data?.error || response.status);
      return { firmado: false };
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo firma del cierre:', error);
    return { firmado: false };
  }
};

export const getHistorialCierresMensuales = async () => {
  try {
    const response = await fetch(API_BASE_URL + '/getHistorialCierresMensuales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyGestionEmpresa()),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('getHistorialCierresMensuales:', data?.error || response.status);
      return { info: [] };
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo historial de cierres:', error);
    return { info: [] };
  }
};

export const getCierresMensualesByIdEmpresa = async () => {
  try {
    const response = await fetch(API_BASE_URL+`/getCierresMensualesByIdEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyGestionEmpresa()),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('getCierresMensualesByIdEmpresa:', data?.error || response.status);
      return { info: [] };
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo datos:', error);
    return { info: [] };
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Error al crear la petición');
    }

    const data = await response.json();

    return data; 
  } catch (error) {
    console.error('Error obteniendo datos:', error);
    throw error;
  }   
};


export const crearPeticionCierreMes = async (mes, firmaImagen) => {
  try {
    const idUsuario = getIdUsuario();
    const idEmpresa = getIdEmpresa();

    const response = await fetch(API_BASE_URL + '/crearPeticionCierreMes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa, mes, firmaImagen }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: data.error || 'Error al crear la petición de cierre' };
    }

    return data;
  } catch (error) {
    console.error('Error creando petición de cierre:', error);
    return { error: 'Error al crear la petición de cierre' };
  }
};


export const getPeticionesByIdEmpresa = async () => {
  try {
    const response = await fetch(API_BASE_URL+`/getPeticionesByIdEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyGestionEmpresa()),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('getPeticionesByIdEmpresa:', data?.error || response.status);
      return { data: [] };
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo datos:', error);
    return { data: [] };
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


export const responderPeticion = async (peticion, estado, motivoRechazo) => {
  try {
    const idEmpresa = getIdEmpresa();
    const idUsuario = getIdUsuario();
    const idPeticion = peticion.id_peticion;
    const response = await fetch(API_BASE_URL+`/responderPeticion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idEmpresa,
        idUsuario,
        idPeticion,
        estado,
        ...(estado === 3 ? { motivoRechazo } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Error respondiendo petición');
    }

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

    const response = await fetch(API_BASE_URL + '/getDataById', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, idEmpresa }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Error al obtener los registros');
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo datos:', error);
    throw error;
  }
};

export const crearRegistro = async (tipoRegistro, idUsuario, guardarUbicacion) => {
  const usuarioAccion = getIdUsuario();
  const idEmpresa = getIdEmpresa();
  const fecha = getFechaEuropeMadrid();
  let ubicacion = { latitude: 0, longitude: 0 };
  let ubicacionPrecisionM = null;

  if (guardarUbicacion) {
    ubicacion = await getUbicacion();
    ubicacionPrecisionM = ubicacion.accuracy ?? null;
  }

  const response = await fetch(API_BASE_URL + `/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idUsuario, idEmpresa, tipoRegistro, ubicacion, fecha, usuarioAccion }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error creando registro');
  }

  const data = await response.json();
  return { ...data, ubicacionPrecisionM };
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

    return data;
  } catch (error) {
    console.error('Error creando registro:', error);
  }   
};

export const getEstadoPersonalEmpresa = async () => {
  const idEmpresa = getIdEmpresa();

  const response = await fetch(`${API_BASE_URL}/getEstadoPersonalEmpresa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Error al obtener el estado del personal');
  }

  return data;
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
