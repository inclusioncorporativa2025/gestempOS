import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loadSessionFromStorage,
  setAuthToken,
  clearAuthSession,
  claimsToUser,
} from '../utils/authSession';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const claims = loadSessionFromStorage();
    setUser(claimsToUser(claims));
    setReady(true);
  }, []);

  const login = useCallback((token) => {
    const claims = setAuthToken(token);
    setUser(claimsToUser(claims));
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, ready, isAuthenticated: Boolean(user) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
