// components/ProvidersCard.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

interface ProviderItem {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

interface Props {
  providers: ProviderItem[];
  loading: boolean;
  error: string | null;
}

export default function ProvidersCard({ providers, loading, error }: Props) {
  return (
    <View className="bg-gray-100 dark:bg-gray-800 mb-6 p-8 rounded-2xl shadow-md border border-gray-300 dark:border-gray-600 w-full max-w-xl">
      <Text className="text-xl font-bold text-center text-gray-900 dark:text-white mb-4">
        Your Providers
      </Text>

      {loading ? (
        <View className="items-center py-4">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-2 text-gray-600 dark:text-gray-300">
            Loading providers...
          </Text>
        </View>
      ) : error ? (
        <Text className="text-red-500 text-center">{error}</Text>
      ) : providers.length === 0 ? (
        <Text className="text-center text-gray-600 dark:text-gray-300">
          No providers assigned yet.
        </Text>
      ) : (
        <ScrollView className="max-h-[260px]">
          {providers.map((p) => (
            <View
              key={p._id}
              className="bg-gray-200 dark:bg-gray-700 p-4 mb-3 rounded-xl shadow"
            >
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {p.name}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">
                Email: {p.email}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">
                Phone: {p.phoneNumber || 'N/A'}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
