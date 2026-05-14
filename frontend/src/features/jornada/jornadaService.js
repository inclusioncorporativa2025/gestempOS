import { message } from "antd";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL+'jornada'; 


export const getDatosById = async () => {
  try {
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa')); 
    const response = await fetch(API_BASE_URL+`/getDataById`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({  idEmpresa }),
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

export const obtenerJornadasByIdEmpresa = async ()=>{

  try {
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa')); 
    const response = await fetch(API_BASE_URL+`/obtenerJornadasByIdEmpresa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa }),
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

export const crearJornada = async (values) => {
  try {
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa')); 
    const idUsuario = parseInt(sessionStorage.getItem('idUsuario')); 

    // Asegúrate de que los valores se pasen correctamente como el JSON esperado
    const response = await fetch(API_BASE_URL + `/crearJornada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values, 
        idEmpresa, 
        idUsuario
      }),
    });

    if (!response.ok) {
      // Si la respuesta no es ok, maneja el error
      const errorData = await response.json();
      console.error('Error en la creación de la jornada:', errorData);
      throw new Error('Error al crear la jornada');
    }

    const data = await response.json();
    return data;  // Retorna los datos si todo fue exitoso
  } catch (error) {
    message.error('Error al crear la jornada');
    // Puedes hacer algo más si deseas manejar el error, por ejemplo, mostrar un mensaje de error al usuario.
  }   
};


export const obtenerJornadas = async () => {
  try {
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa')); 
    const response = await fetch(API_BASE_URL + `/obtenerJornadas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error:', errorData);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo jornadas y registros:', error);
  }
};

export const obtenerUsuariosJornadas = async () => {
  try {
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa')); 
    const response = await fetch(API_BASE_URL + `/obtenerUsuariosJornadas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error:', errorData);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo jornadas y registros:', error);
  }
};



export const obtenerJornadasYRegistros = async () => {
  try {
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa')); 
    const response = await fetch(API_BASE_URL + `/obtenerJornadasYRegistros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error:', errorData);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo jornadas y registros:', error);
  }
};

export const deleteJornada = async (idJornada) => {
  try {
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa')); 
    const idUsuario = parseInt(sessionStorage.getItem('idUsuario')); 

    const response = await fetch(API_BASE_URL + `/deleteById`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEmpresa,idJornada,idUsuario }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error:', errorData);
      return errorData;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo jornadas y registros:', error);
  }
};


export const editarJornada = async (updatedJornada) => {
  try {
    const idEmpresa = parseInt(sessionStorage.getItem('idEmpresa'));
    const idUsuario = parseInt(sessionStorage.getItem('idUsuario'));

    const response = await fetch(API_BASE_URL + `/editarJornada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updatedJornada, idEmpresa, idUsuario }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error:', errorData);
      return errorData;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al editar jornada:', error);
  }
};


