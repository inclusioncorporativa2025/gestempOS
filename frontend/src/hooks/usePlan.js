import { useMemo } from 'react';
import { useAuth } from '../config/AuthContext';
import { getPlanId } from '../utils/authSession';
import { planIncluyeFeature, PLANS } from '../constants/plans';

export const usePlan = () => {
  const { user } = useAuth();
  const planId = getPlanId() || user?.plan_id || 'esencial';

  const planInfo = useMemo(
    () => PLANS.find((p) => p.id === planId) || PLANS[0],
    [planId],
  );

  const tieneFeature = (featureKey) => planIncluyeFeature(planId, featureKey);

  return {
    planId,
    planInfo,
    tieneFeature,
    esEsencial: planId === 'esencial',
    esRrhh: planId === 'rrhh',
    esCompleto: planId === 'completo',
  };
};

export default usePlan;
