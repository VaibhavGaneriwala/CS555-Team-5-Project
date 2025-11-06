import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { getAdherenceReport } from '../utils/api';
interface AdherenceReport {
  patientId: string;
  patientName: string;
  totalLogs: number;
  taken: number;
  missed: number;
  skipped: number;
  pending: number;
  adherenceRate: number;
}
export default function ViewReports() {
  const [reports, setReports] = useState<AdherenceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchReports = async () => {
    try {
      const data = await getAdherenceReport();
      if (Array.isArray(data)) {
        setReports(data);
      } else {
        setErrorMsg('Failed to load report data.');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setErrorMsg('Unable to fetch adherence reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-2 text-gray-600 dark:text-gray-300">
          Loading Reports...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900 px-4 pt-8 pb-10">
      <Text className="text-3xl font-bold mb-4 text-gray-800 dark:text-white text-center">
        Patient Adherence Reports
      </Text>

      {errorMsg ? (
        <Text className="text-center text-red-500 mb-3">{errorMsg}</Text>
      ) : reports.length === 0 ? (
        <Text className="text-center text-gray-600 dark:text-gray-300">
          No adherence data found.
        </Text>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.patientId)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View className="bg-gray-100 dark:bg-gray-800 p-4 mb-3 rounded-2xl">
              <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {item.patientName}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">
                Total Logs: {item.totalLogs}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">
                Taken: {item.taken} | Missed: {item.missed} | Skipped:{' '}
                {item.skipped} | Pending: {item.pending}
              </Text>
              <Text className="text-green-600 dark:text-green-400 font-semibold mt-1">
                Adherence Rate: {Number(item.adherenceRate || 0).toFixed(2)}%
              </Text>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        onPress={() => router.push('/(provider)/ProviderHome')}
        className="bg-blue-500 px-6 py-3 rounded-xl mt-4"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Back to Provider Home
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
