import { useCallback, useEffect, useState } from 'react';
import { getIdEmpresa, getIdUsuario } from '../utils/authSession';
import { getOnboardingEstado } from '../features/onboarding/onboardingService';
import { useAuth } from '../config/AuthContext';

const minimizeStorageKey = () => {
  const u = getIdUsuario();
  const e = getIdEmpresa();
  if (!u || !e) return null;
  return `onboarding_min_${u}_${e}`;
};

export const readOnboardingMinimized = () => {
  const key = minimizeStorageKey();
  if (!key) return false;
  return localStorage.getItem(key) === '1';
};

export const setOnboardingMinimized = (value) => {
  const key = minimizeStorageKey();
  if (!key) return;
  if (value) {
    localStorage.setItem(key, '1');
  } else {
    localStorage.removeItem(key);
  }
};

export const clearOnboardingMinimized = () => {
  const key = minimizeStorageKey();
  if (key) localStorage.removeItem(key);
};

const useOnboarding = () => {
  const { user, ready } = useAuth();
  const idEmpresaSesion = user?.id_empresa != null ? Number(user.id_empresa) : null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minimized, setMinimized] = useState(false);

  const cargar = useCallback(async (idEmpresaOverride) => {
    const idEmpresa = idEmpresaOverride ?? getIdEmpresa();
    if (!idEmpresa) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getOnboardingEstado(idEmpresa);
      setData(res);
      if (!res?.mostrar) {
        clearOnboardingMinimized();
        setMinimized(false);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return undefined;

    if (!idEmpresaSesion) {
      setData(null);
      setMinimized(false);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setData(null);
    setMinimized(readOnboardingMinimized());
    cargar(idEmpresaSesion);

    return undefined;
  }, [ready, idEmpresaSesion, cargar]);

  useEffect(() => {
    const handler = () => {
      if (idEmpresaSesion) {
        cargar(idEmpresaSesion);
      }
    };
    window.addEventListener('onboarding:refresh', handler);
    return () => window.removeEventListener('onboarding:refresh', handler);
  }, [cargar, idEmpresaSesion]);

  const toggleMinimized = (next) => {
    const value = typeof next === 'boolean' ? next : !minimized;
    setMinimized(value);
    setOnboardingMinimized(value);
  };

  return {
    data,
    loading,
    idEmpresa: idEmpresaSesion,
    mostrar: Boolean(idEmpresaSesion && data?.mostrar && data?.pasos?.length),
    minimized,
    toggleMinimized,
    recargar: () => cargar(idEmpresaSesion),
  };
};

export default useOnboarding;
