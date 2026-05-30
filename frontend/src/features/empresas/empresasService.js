import { getIdUsuario, getEsquema } from '../../utils/authSession';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL+'empresas'; 
const API_BASE_URL_FICHA = process.env.REACT_APP_API_BASE_URL+'ficha/getById'; 
const API_BASE_URL_FICHA_UltimoRegistro = process.env.REACT_APP_API_BASE_URL+'ficha/getUltimoRegistroById'; 

//llamada ejempo
export const crearEmpresa = async (values) => {
    try {
        const idUsuario = getIdUsuario(); 

        const response = await fetch(API_BASE_URL+`/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values,idUsuario  }),
        });
    
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error creando empresa');
        }
    
        const data = await response.json();
    
        return data;  // Retorna la respuesta del servidor 
      } catch (error) {
        console.error('Error creando empresa:', error);
        throw error;
      }   
};

export const getUltimoRegistroById = async () => {
  try{
  const esquema = 'empresa' + getEsquema();
  const idUsuario = getIdUsuario(); 

  const response = await fetch(API_BASE_URL_FICHA_UltimoRegistro, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ esquema,idUsuario }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error recuperando datos');
  }

  const data = await response.json();

  return data;  
} catch (error) {
  console.error('Error recuperando datos:', error);
  throw error;
}   
};


//llamada ejempo
export const getTipoRegistro = async () => {
  try {
    const esquema = 'empresa' + getEsquema();

      
      const response = await fetch(API_BASE_URL+`/getTipoRegistro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ esquema }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error recuperando datos');
      }
  
      const data = await response.json();
  
      return data.tiposAcceso;  
    } catch (error) {
      console.error('Error recuperando datos:', error);
      throw error;
    }   
};


//llamada ejempo
export const getTipoRegistroByIdUsuario = async () => {
  try {
    const esquema = 'empresa' + getEsquema();
    const idUsuario = getIdUsuario(); 

      
      const response = await fetch(API_BASE_URL_FICHA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ esquema,idUsuario }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error recuperando datos');
      }
  
      const data = await response.json();
  
      return data.tiposAcceso;  
    } catch (error) {
      console.error('Error recuperando datos:', error);
      throw error;
    }   
};

export const guardarTipoAcceso = async (nuevosDatos, datosOriginales) => {
  try {
    const tiposModificados = [];
    const tiposEliminados = [];
    const tiposNuevos = [];
    const esquema = 'empresa' + getEsquema();
    const idUsuario = getIdUsuario(); 

    // Detectar cambios y tipos nuevos
    nuevosDatos.forEach(tipo => {
      const tipoOriginal = datosOriginales.find(
        t => 
          t.id_tipo_acceso === tipo.key
      );
      
      if (!tipoOriginal) {
        // Si no existe en los datos originales, es un nuevo tipo
        tiposNuevos.push(tipo);
      } else {
        // Si existe, verificar si hay algún cambio
        if (tipoOriginal.nombre !== tipo.nombre || tipoOriginal.activo !== tipo.activo || tipoOriginal.tipo !== tipo.tipoAcceso) {
          // Si los datos han cambiado, lo marcamos como modificado
      
          tiposModificados.push(tipo);
        }
      }
    });

    // Detectar tipos eliminados
    datosOriginales.forEach(tipo => {
      const tipoEnPantalla = nuevosDatos.find(t => t.key === tipo.id_tipo_acceso);
      if (!tipoEnPantalla) {
        // Si el tipo no está en los nuevos datos, es un tipo eliminado
        tiposEliminados.push(tipo);
      }
    });

    //llamada a servicio
    const response = await fetch(API_BASE_URL+`/updateTipoRegistro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiposNuevos,tiposModificados,tiposEliminados ,esquema, idUsuario}),
    });

  } catch (error) {
    console.error('Error guardando tipo accesos:', error);
    throw error;
  }
};


export const getEmpresas = async () => {

  try {
      
    const response = await fetch(API_BASE_URL+`/getEmpresas`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error recuperando datos');
      }
  
      const data = await response.json();
  
      return data.empresas;  
    } catch (error) {
      console.error('Error recuperando datos:', error);
      throw error;
    }   
};

export const getEmpresasUsuarios = async () => {

  try {
      
    const response = await fetch(API_BASE_URL+`/getEmpresasUsuarios`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error recuperando datos');
      }
  
      const data = await response.json();
  
      return data.result;  
    } catch (error) {
      console.error('Error recuperando datos:', error);
      throw error;
    }   
};

// 
export const editEmpresa = async (idEmpresa,datos) => {

  try {
    const idUsuario = getIdUsuario(); 

    const response = await fetch(API_BASE_URL+`/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idEmpresa,datos,idUsuario}),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error recuperando datos');
      }
  
      const data = await response.json();
  
      return data.empresas;  
    } catch (error) {
      console.error('Error recuperando datos:', error);
      throw error;
    }   
};

// 
export const eliminarEmpresa = async (idEmpresa) => {

  try {
    const idUsuario = getIdUsuario(); 

    const response = await fetch(API_BASE_URL+`/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idEmpresa,idUsuario}),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error recuperando datos');
      }
  
      const data = await response.json();
  
      return data.empresas;  
    } catch (error) {
      console.error('Error recuperando datos:', error);
      throw error;
    }   
};





