import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../config/AuthContext';
import { getEmpresaBranding } from '../features/empresas/empresasService';

export const TRIAL_EXPIRED_EVENT = 'trial-expired';

const isPlatformUser = (tipo) => [1, 2].includes(Number(tipo));

export const useTrialStatus = () => {
  const { user } = useAuth();
  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(false);

  const cargarTrial = useCallback(async () => {
    if (!user?.id_empresa || isPlatformUser(user?.tipo_usuario)) {
      setTrial(null);
      return;
    }

    setLoading(true);
    try {
      const { trial: estado } = await getEmpresaBranding();
      setTrial(estado ?? null);
    } catch {
      setTrial(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id_empresa, user?.tipo_usuario]);

  useEffect(() => {
    cargarTrial();
  }, [cargarTrial]);

  useEffect(() => {
    const onTrialExpired = (event) => {
      const detail = event.detail?.trial;
      if (detail?.activa && !detail?.expirada) {
        setTrial(detail);
        cargarTrial();
        return;
      }
      setTrial(detail ?? { expirada: true, activa: false });
    };
    window.addEventListener(TRIAL_EXPIRED_EVENT, onTrialExpired);
    return () => window.removeEventListener(TRIAL_EXPIRED_EVENT, onTrialExpired);
  }, [cargarTrial]);

  const bloqueado = Boolean(trial?.expirada || trial?.requierePlan);
  const mostrarAviso = Boolean(trial?.advertir && !bloqueado);

  return {
    trial,
    loading,
    bloqueado,
    mostrarAviso,
    recargar: cargarTrial,
  };
};
