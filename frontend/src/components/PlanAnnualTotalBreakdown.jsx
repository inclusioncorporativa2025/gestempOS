import PlanBillingBreakdown from './PlanBillingBreakdown';

/** @deprecated Usar PlanBillingBreakdown con ciclo="anual" */
const PlanAnnualTotalBreakdown = (props) => (
  <PlanBillingBreakdown {...props} ciclo="anual" />
);

export default PlanAnnualTotalBreakdown;
