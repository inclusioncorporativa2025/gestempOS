import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // `null` indica que no hay usuario autenticado

  const login = (userData) => setUser(userData); // Al iniciar sesión, guarda la información del usuario
  const logout = () => setUser(null); // Al cerrar sesión, elimina la información del usuario

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
