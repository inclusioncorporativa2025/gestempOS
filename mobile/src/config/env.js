import Constants from 'expo-constants';

const normalizeBaseUrl = (url) => {
  const trimmed = String(url || '').trim();
  if (!trimmed) return 'http://10.0.2.2:5000/api/';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

export const getApiBaseUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl;
  return normalizeBaseUrl(fromEnv || fromExtra);
};
