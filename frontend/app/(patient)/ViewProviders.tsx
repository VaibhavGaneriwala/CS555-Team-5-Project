import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const BASE_URL = 'http://10.156.155.13:3000'; // ✅ your backend IP

interface Provider {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export default function ViewProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/patient/providers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Failed to fetch providers.');
      } else {
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-2 text-gray-500 dark:text-gray-300">Loading Providers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
        <Text className="text-red-500 text-lg mb-3 text-center">{error}</Text>
        <TouchableOpacity
          onPress={fetchProviders}
          className="bg-blue-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold text-lg">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 px-4 pt-10 pb-6">
      <Text className="text-3xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        Your Providers
      </Text>

      {providers.length === 0 ? (
        <Text className="text-center text-gray-600 dark:text-gray-300 mt-8">
          No providers assigned yet.
        </Text>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-gray-100 dark:bg-gray-800 p-4 mb-3 rounded-2xl shadow"
              onPress={() =>
                router.push({
                  pathname: '/(patient)/ViewProviderInformation',
                  params: {
                    id: item._id,
                    name: item.name,
                    email: item.email,
                    phone: item.phoneNumber,
                  },
                })
              }
            >
              <Text className="text-xl font-semibold text-gray-900 dark:text-white">
                {item.name}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">Email: {item.email}</Text>
              <Text className="text-gray-700 dark:text-gray-300">
                Phone: {item.phoneNumber || 'N/A'}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        onPress={() => router.push('/(patient)/PatientHome')}
        className="bg-blue-500 px-6 py-3 rounded-xl mt-4"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Back to Patient Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}
