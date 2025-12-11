import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

// ✅ Your actual backend address
const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://10.156.155.13:3000';

export const getAdherenceReport = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/adherence/report`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getAdherenceReport:', error);
    throw error;
  }
};
