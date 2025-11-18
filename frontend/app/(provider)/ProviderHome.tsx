import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

interface Provider {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phoneNumber?: string;
}

export default function ProviderHome() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load token
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  // Fetch provider profile
  useEffect(() => {
    const fetchProvider = async () => {
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error("Failed to fetch provider profile", await res.text());
          return;
        }

        const data = await res.json();

        const normalized: Provider = {
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          email: data.email ?? "",
          role: data.role ?? "provider",
          phoneNumber: data.phoneNumber ?? "",
        };

        setProvider(normalized);
      } catch (err) {
        console.error("Failed to fetch provider info", err);
      }
    };

    fetchProvider();
  }, [token]);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Provider Dashboard
      </Text>

      <View className="flex justify-center items-center w-full max-w-6xl">
        <View className="flex justify-center items-center sm:items-start flex-col sm:flex-row gap-6 p-6 rounded-xl bg-gray-100 dark:bg-gray-800 shadow-lg">
          {/* ---------- Provider Profile Section ---------- */}
          <View className="flex items-center flex-col">

            <View className="bg-gray-100 dark:bg-gray-800 mb-6 p-8 rounded-2xl shadow-md border border-gray-300 dark:border-gray-600 w-full">
              {provider ? (
                <View>
                  <Text className="text-gray-900 dark:text-white text-2xl font-extrabold text-center mb-4 tracking-wide">
                    {provider.firstName} {provider.lastName}
                  </Text>

                  <Text className="text-gray-700 dark:text-gray-300 text-center text-base">
                    Email: {provider.email || 'N/A'}
                  </Text>

                  <Text className="text-gray-700 dark:text-gray-300 text-center text-base">
                    Phone: {provider.phoneNumber || 'N/A'}
                  </Text>
                </View>
              ) : (
                <View className="animate-pulse space-y-3 py-4">
                  <View className="h-6 bg-gray-400 rounded w-48 mx-auto" />
                  <View className="h-4 bg-gray-400 rounded w-56 mx-auto" />
                  <View className="h-4 bg-gray-400 rounded w-40 mx-auto" />
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(provider)/ViewPatients')}
              activeOpacity={0.8}
              className="bg-blue-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px]"
            >
              <Text className="text-white text-lg font-semibold text-center">
                Go to View Patients
              </Text>
            </TouchableOpacity>
          </View>

          {/* ---------- View Reports Button ---------- */}
          <View className="flex items-center flex-col">
            <TouchableOpacity
              onPress={() => router.push('/(provider)/ViewReports' as any)}
              activeOpacity={0.8}
              className="bg-green-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px] sm:ml-8 mt-6 sm:mt-0"
            >
              <Text className="text-white text-lg font-semibold text-center">
                View Adherence Reports
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
