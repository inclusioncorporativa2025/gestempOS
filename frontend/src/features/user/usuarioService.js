import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import { message } from 'antd';
import { getIdEmpresa, getIdUsuario } from '../../utils/authSession';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL+'user'; 

//recuperar información de usuario tras login
export const getUsuarioData = async (email) => {
    try {
        const response = await fetch(API_BASE_URL+`/getData`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
    
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error getUsuarioData');
        }
    
        const data = await response.json();
    
        return data;  // Retorna la respuesta del servidor (esto podría ser un mensaje de éxito o los datos del usuario)
      } catch (error) {
        console.error('Error en getUsuarioData:', error);
        throw error;
      }

};

export const getUsuariosEmpresa = async()=>{
  try {
    const idEmpresa = getIdEmpresa();
    const response = await fetch(API_BASE_URL+`/getUsuariosEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error getUsuarioData');
    }

    const data = await response.json();

    return data.usuarios;  // Retorna la respuesta del servidor (esto podría ser un mensaje de éxito o los datos del usuario)
  } catch (error) {
    console.error('Error en getUsuarioData:', error);
    throw error;
  }
}

export const descargarExcelDesdeAPI = async (startDate, endDate,id_usuario) => {
  try {
    const idEmpresa = getIdEmpresa();

      const response = await fetch(API_BASE_URL+'/exportar', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          },
          body: JSON.stringify({
              id_usuario,startDate,
              endDate,idEmpresa
          })
      });

      if (!response.ok) throw new Error('Error al generar el Excel');

      const blob = await response.blob();
      saveAs(blob, `registro_${id_usuario}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
      message.success('Archivo descargado con éxito');
  } catch (error) {
      message.error('No se pudo descargar el archivo');
      console.error(error);
  }
};

    
export const importarUsuariosEmpresa = async (values) => {
  try {
    const idEmpresa = getIdEmpresa();

      const response = await fetch(API_BASE_URL+'/importar', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          },
          body: JSON.stringify({
            values, idEmpresa
          })
      });

      if (!response.ok) throw new Error('Error al importar usuarios');
      message.success('Archivo importado con éxito');
  } catch (error) {
      message.error('No se pudo importado el archivo');
      console.error(error);
  }
};

    


export const crearUsuario = async (email,nombreUsuario,dni, tipoUsuario, horario) =>{

  try{
    const idEmpresa = getIdEmpresa();
    const idUsuarioAccion = getIdUsuario();

    

    const response = await fetch(API_BASE_URL+`/crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email,nombreUsuario,dni, idEmpresa,idUsuarioAccion,tipoUsuario,horario }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error crearUsuario');
    }

    const data = await response.json();

    return data;  // Retorna la respuesta del servidor (esto podría ser un mensaje de éxito o los datos del usuario)

  } catch (error) {
    console.error('Error en crearUsuario:', error);
    throw error;
  }
};

export const editUsuario = async (idUsuario, values) =>{

  try{
    const idUsuarioAccion = getIdUsuario();
    const idEmpresa = getIdEmpresa();

    const response = await fetch(API_BASE_URL+`/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario, values ,idUsuarioAccion,idEmpresa}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error crearUsuario');
    }

    const data = await response.json();

    return data;  // Retorna la respuesta del servidor (esto podría ser un mensaje de éxito o los datos del usuario)

  } catch (error) {
    console.error('Error en crearUsuario:', error);
    throw error;
  }
};



export const deleteUsuario = async (idUsuario) =>{

  try{
    const idUsuarioAccion = getIdUsuario();
    const response = await fetch(API_BASE_URL+`/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario,idUsuarioAccion}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error deleteUsuario');
    }

    const data = await response.json();

    return data;  // Retorna la respuesta del servidor (esto podría ser un mensaje de éxito o los datos del usuario)

  } catch (error) {
    console.error('Error borrando usuario:', error);
    throw error;
  }
};


export const getHorasTotalesMesByIdUsuario = async (mes,idUsuario) =>{

  try{
    const idUsuario_accion = getIdUsuario();
    const idEmpresa = getIdEmpresa();

    const response = await fetch(API_BASE_URL+`/getHorasTotalesMesByIdUsuario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idUsuario_accion,idEmpresa,mes,idUsuario}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error deleteUsuario');
    }

    const data = await response.json();

    return data;  // Retorna la respuesta del servidor (esto podría ser un mensaje de éxito o los datos del usuario)

  } catch (error) {
    console.error('Error borrando usuario:', error);
    throw error;
  }
};

