import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../config/AuthContext';
import { getEmpresaBranding } from '../features/empresas/empresasService';
import { getPlanLabel } from '../constants/plans';
import { getInicialesEmpresa } from '../utils/empresaBranding';

export const EMPRESA_BRANDING_UPDATED = 'empresa-branding-updated';

export const useEmpresaBranding = () => {
  const { user } = useAuth();
  const fallbackLabel = user?.alias || user?.nombre_empresa || 'InCor';

  const [label, setLabel] = useState(fallbackLabel);
  const [nombreEmpresa, setNombreEmpresa] = useState(user?.nombre_empresa || '');
  const [licencias, setLicencias] = useState(null);
  const [planLabel, setPlanLabel] = useState('Esencial');
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoError, setLogoError] = useState(false);

  const cargarBranding = useCallback(async () => {
    if (!user?.id_empresa) {
      setLabel(fallbackLabel);
      setNombreEmpresa(user?.nombre_empresa || '');
      setLicencias(null);
      setPlanLabel(getPlanLabel(user?.plan_id));
      setLogoUrl(null);
      setLogoError(false);
      return;
    }

    try {
      const branding = await getEmpresaBranding();
      setLabel(branding.alias || branding.nombre || fallbackLabel);
      setNombreEmpresa(branding.nombre || user?.nombre_empresa || '');
      setLicencias(
        branding.licencias != null ? Number(branding.licencias) : null,
      );
      setPlanLabel(branding.plan_label || getPlanLabel(branding.plan));
      setLogoUrl(branding.logo_url || null);
      setLogoError(false);
    } catch {
      setLabel(fallbackLabel);
      setNombreEmpresa(user?.nombre_empresa || '');
      setLicencias(null);
      setPlanLabel(getPlanLabel(user?.plan_id));
      setLogoUrl(null);
      setLogoError(false);
    }
  }, [user?.id_empresa, fallbackLabel]);

  useEffect(() => {
    cargarBranding();
  }, [cargarBranding]);

  useEffect(() => {
    window.addEventListener(EMPRESA_BRANDING_UPDATED, cargarBranding);
    return () => window.removeEventListener(EMPRESA_BRANDING_UPDATED, cargarBranding);
  }, [cargarBranding]);

  const iniciales = getInicialesEmpresa(label);
  const mostrarLogo = Boolean(logoUrl) && !logoError;

  return {
    label,
    nombreEmpresa,
    licencias,
    planLabel,
    logoUrl,
    iniciales,
    mostrarLogo,
    onLogoError: () => setLogoError(true),
  };
};
