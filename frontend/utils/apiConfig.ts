import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const getApiUrl = (): string => {
  const envUrl = Constants.expoConfig?.extra?.API_URL;
  if (envUrl) {
    return envUrl;
  }
  
  if (Platform.OS !== 'web') {
    return 'http://192.168.1.175:3000';
  }
  
  return 'http://localhost:3000';
};

export const API_URL = getApiUrl();
