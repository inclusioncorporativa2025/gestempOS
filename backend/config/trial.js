const TRIAL_DAYS = Number(process.env.TRIAL_DAYS) || 15;
const TRIAL_WARN_DAYS = Number(process.env.TRIAL_WARN_DAYS) || 3;

module.exports = {
  TRIAL_DAYS,
  TRIAL_WARN_DAYS,
};
