import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedTypes }) => {
    // Recuperar el tipo de usuario desde sessionStorage
    const tipoUsuario = parseInt(sessionStorage.getItem('tipoUsuario')); // Convertimos a número para evitar problemas de comparación

    // Validar si el usuario está autenticado y si su tipo es permitido
    if (!tipoUsuario || !allowedTypes.includes(tipoUsuario)) {
        if(tipoUsuario === 2){
            return <Navigate to="/alta-empresa" replace />;
        }else{
            return <Navigate to="/" replace />;    
        }
    }

    return children;
};

export default ProtectedRoute;
