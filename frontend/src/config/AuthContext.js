import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loadSessionFromStorage,
  setAuthToken,
  clearAuthSession,
  claimsToUser,
  startImpersonation,
  exitImpersonation,
  consumeAuthTokenFromHash,
} from '../utils/authSession';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hashToken = consumeAuthTokenFromHash();
    if (hashToken) {
      const claims = setAuthToken(hashToken);
      setUser(claimsToUser(claims));
      setReady(true);
      return;
    }

    const claims = loadSessionFromStorage();
    setUser(claimsToUser(claims));
    setReady(true);
  }, []);

  const login = useCallback((token) => {
    const claims = setAuthToken(token);
    setUser(claimsToUser(claims));
  }, []);

  const refreshSession = useCallback((token) => {
    const claims = setAuthToken(token);
    setUser(claimsToUser(claims));
    return claimsToUser(claims);
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  const impersonate = useCallback((token) => {
    const claims = startImpersonation(token);
    setUser(claimsToUser(claims));
  }, []);

  const stopImpersonation = useCallback(() => {
    const claims = exitImpersonation();
    setUser(claimsToUser(claims));
    return claims;
  }, []);

  const patchUser = useCallback((partial) => {
    setUser((prev) => {
      if (!prev) return null;
      const sinCambios = Object.entries(partial).every(
        ([key, value]) => JSON.stringify(prev[key]) === JSON.stringify(value),
      );
      if (sinCambios) return prev;
      return { ...prev, ...partial };
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        refreshSession,
        logout,
        impersonate,
        stopImpersonation,
        impersonating: Boolean(user?.impersonacion),
        patchUser,
        ready,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
