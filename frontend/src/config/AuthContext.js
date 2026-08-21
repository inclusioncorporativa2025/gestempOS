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
import { mergeHubClaimsIntoUser } from '../utils/hubClaimsSync';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const hashToken = consumeAuthTokenFromHash();
      const claims = hashToken ? setAuthToken(hashToken) : loadSessionFromStorage();
      const baseUser = claimsToUser(claims);
      const nextUser = await mergeHubClaimsIntoUser(baseUser);

      if (!cancelled) {
        setUser(nextUser);
        setReady(true);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (token) => {
    const claims = setAuthToken(token);
    const baseUser = claimsToUser(claims);
    const nextUser = await mergeHubClaimsIntoUser(baseUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const refreshSession = useCallback(async (token) => {
    const claims = setAuthToken(token);
    const baseUser = claimsToUser(claims);
    const nextUser = await mergeHubClaimsIntoUser(baseUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  const impersonate = useCallback(async (token) => {
    const claims = startImpersonation(token);
    const baseUser = claimsToUser(claims);
    const nextUser = await mergeHubClaimsIntoUser(baseUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const stopImpersonation = useCallback(async () => {
    const claims = exitImpersonation();
    const baseUser = claimsToUser(claims);
    const nextUser = await mergeHubClaimsIntoUser(baseUser);
    setUser(nextUser);
    return nextUser;
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
