// app/(provider)/ViewReports.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { LineChart, BarChart } from 'react-native-chart-kit';

const API_URL =
  Constants.expoConfig?.extra?.API_URL ?? 'http://10.156.155.13:3000';

const screenWidth = Dimensions.get('window').width;

interface Patient {
  _id: string;
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  adherence: string | number;
}

interface DailyPoint {
  date: string; // YYYY-MM-DD
  taken: number;
  missed: number;
  pct: number;
}

interface MedPoint {
  medicationId?: string;
  name: string;
  pct: number;
}

interface WeeklyPoint {
  isoYear: number;
  isoWeek: number;
  week: string; // e.g., 2025-W1
  pct: number;
}

interface TrendResponse {
  patient: {
    id: string;
    name: string;
    email: string;
  };
  daily: DailyPoint[];
  medications: MedPoint[];
  weeklyAverage: WeeklyPoint[];
}

// Helper to build ISO range
const makeRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  return { start, end };
};

const toISO = (d: Date) => d.toISOString();

export default function ViewReports() {
  const { patientId: initialPatientId } = useLocalSearchParams<{
    patientId?: string;
  }>();

  const [token, setToken] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    initialPatientId ?? null
  );

  const [rangeLabel, setRangeLabel] = useState<'7d' | '14d' | '30d' | '90d'>(
    '30d'
  );
  const [dateRange, setDateRange] = useState(() => makeRange(30));

  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load token
  useEffect(() => {
    const load = async () => {
      const t = await AsyncStorage.getItem('token');
      setToken(t);
    };
    load();
  }, []);

  // Fetch assigned patients
  useEffect(() => {
    if (!token) return;

    const fetchPatients = async () => {
      try {
        setLoadingPatients(true);
        setError(null);

        const res = await fetch(`${API_URL}/api/provider/patients`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'Failed to fetch patients.');
          setPatients([]);
          return;
        }

        const pts: Patient[] = data.patients || [];
        setPatients(pts);

        // Auto-select initial patient
        if (!selectedPatientId) {
          if (initialPatientId && pts.find((p) => p._id === initialPatientId)) {
            setSelectedPatientId(initialPatientId);
          } else if (pts.length > 0) {
            setSelectedPatientId(pts[0]._id);
          }
        }
      } catch (err) {
        console.error('Error fetching patients', err);
        setError('Unable to connect to server.');
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, [token]);

  // Compute alerts based on returned data
  const computeAlerts = (data: TrendResponse | null): string[] => {
    if (!data) return [];

    const a: string[] = [];

    // --- Sudden daily drops ---
    const dailySorted = [...(data.daily || [])].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    for (let i = 1; i < dailySorted.length; i++) {
      const prev = dailySorted[i - 1];
      const curr = dailySorted[i];
      const drop = prev.pct - curr.pct;
      if (drop >= 30 && curr.pct <= 80) {
        a.push(
          `Sudden adherence drop of ${drop}% from ${prev.date} (${prev.pct}%) to ${curr.date} (${curr.pct}%).`
        );
      }
    }

    // --- Missed-dose spikes ---
    for (let i = 0; i < dailySorted.length; i++) {
      const d = dailySorted[i];
      const prevMissed = i > 0 ? dailySorted[i - 1].missed : 0;
      if (d.missed >= 3 && d.pct < 80) {
        a.push(
          `Missed-dose spike on ${d.date}: ${d.missed} missed doses and adherence at ${d.pct}%.`
        );
      } else if (prevMissed > 0 && d.missed >= prevMissed * 2 && d.missed >= 2) {
        a.push(
          `Missed doses doubled on ${d.date} (from ${prevMissed} to ${d.missed}).`
        );
      }
    }

    // --- 20% weekly trend decline ---
    const weeklySorted = [...(data.weeklyAverage || [])].sort((a, b) => {
      // Parse "YYYY-WN"
      const [ya, wa] = a.week.split('-W');
      const [yb, wb] = b.week.split('-W');
      const yaNum = parseInt(ya, 10);
      const ybNum = parseInt(yb, 10);
      const waNum = parseInt(wa || '0', 10);
      const wbNum = parseInt(wb || '0', 10);
      if (yaNum !== ybNum) return yaNum - ybNum;
      return waNum - wbNum;
    });

    for (let i = 1; i < weeklySorted.length; i++) {
      const prev = weeklySorted[i - 1];
      const curr = weeklySorted[i];
      const drop = prev.pct - curr.pct;
      if (drop >= 20) {
        a.push(
          `Weekly adherence declined by ${drop}% from ${prev.week} (${prev.pct}%) to ${curr.week} (${curr.pct}%).`
        );
      }
    }

    return a;
  };

  // Fetch adherence trends whenever patient or date range changes
  const fetchTrends = async () => {
    if (!token || !selectedPatientId) return;

    try {
      setLoadingTrends(true);
      setError(null);

      const url = `${API_URL}/api/provider/adherence-trends?patientId=${selectedPatientId}&startDate=${encodeURIComponent(
        toISO(dateRange.start)
      )}&endDate=${encodeURIComponent(toISO(dateRange.end))}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to fetch adherence trends.');
        setTrendData(null);
        setAlerts([]);
        return;
      }

      setTrendData(data);
      setAlerts(computeAlerts(data));
    } catch (err) {
      console.error('Error fetching trends', err);
      setError('Unable to connect to server.');
      setTrendData(null);
      setAlerts([]);
    } finally {
      setLoadingTrends(false);
    }
  };

  // Trigger trend load when filters change
  useEffect(() => {
    if (!selectedPatientId || !token) return;
    fetchTrends();
  }, [selectedPatientId, dateRange.start.getTime(), dateRange.end.getTime(), token]);

  // Change date range quick filter
  const handleRangeChange = (label: '7d' | '14d' | '30d' | '90d') => {
    setRangeLabel(label);
    const days = label === '7d' ? 7 : label === '14d' ? 14 : label === '90d' ? 90 : 30;
    setDateRange(makeRange(days));
  };

  const currentPatientName = useMemo(() => {
    if (!trendData?.patient?.name && selectedPatientId && patients.length > 0) {
      const p = patients.find((pt) => pt._id === selectedPatientId);
      return p?.name ?? 'Selected Patient';
    }
    return trendData?.patient?.name ?? 'Selected Patient';
  }, [trendData, selectedPatientId, patients]);

  const dailyChart = useMemo(() => {
    if (!trendData || !trendData.daily || trendData.daily.length === 0) return null;
    const labels = trendData.daily.map((d) => d.date.slice(5)); // show MM-DD
    const values = trendData.daily.map((d) => d.pct);

    return {
      labels,
      datasets: [
        {
          data: values,
        },
      ],
    };
  }, [trendData]);

  const medChart = useMemo(() => {
    if (!trendData || !trendData.medications || trendData.medications.length === 0) {
      return null;
    }
    const labels = trendData.medications.map((m) =>
      m.name.length > 8 ? `${m.name.slice(0, 7)}…` : m.name
    );
    const values = trendData.medications.map((m) => m.pct);

    return {
      labels,
      datasets: [
        {
          data: values,
        },
      ],
    };
  }, [trendData]);

  // ------------------- RENDER -------------------
  if (!token) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-gray-600 dark:text-gray-300">
          Loading authentication...
        </Text>
      </View>
    );
  }

  if (loadingPatients) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-3 text-gray-600 dark:text-gray-300">
          Loading patients...
        </Text>
      </View>
    );
  }

  if (!loadingPatients && patients.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
        <Text className="text-2xl font-bold text-gray-800 dark:text-white mb-4 text-center">
          No assigned patients
        </Text>
        <Text className="text-gray-600 dark:text-gray-300 mb-6 text-center">
          You don&apos;t have any assigned patients yet. Assign patients first to
          view adherence reports.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(provider)/ViewPatients')}
          className="bg-blue-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white text-lg font-semibold text-center">
            Go to View Patients
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 pt-10 pb-4 px-4">
      <Text className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-white">
        Adherence Reports
      </Text>
      <Text className="text-center text-gray-500 dark:text-gray-300 mb-4">
        Spot adherence issues quickly with trends and alerts.
      </Text>

      {/* Filters */}
      <View className="mb-4">
        <Text className="text-gray-800 dark:text-gray-200 font-semibold mb-2">
          Patient
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {patients.map((p) => (
            <TouchableOpacity
              key={p._id}
              onPress={() => setSelectedPatientId(p._id)}
              className={`px-3 py-2 rounded-full mr-2 mb-2 border ${
                selectedPatientId === p._id
                  ? 'bg-blue-500 border-blue-600'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selectedPatientId === p._id
                    ? 'text-white'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text className="text-gray-800 dark:text-gray-200 font-semibold mt-3 mb-2">
          Date Range
        </Text>
        <View className="flex-row">
          {(['7d', '14d', '30d', '90d'] as const).map((label) => (
            <TouchableOpacity
              key={label}
              onPress={() => handleRangeChange(label)}
              className={`px-3 py-2 rounded-full mr-2 border ${
                rangeLabel === label
                  ? 'bg-green-500 border-green-600'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  rangeLabel === label
                    ? 'text-white'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {dateRange.start.toDateString()} – {dateRange.end.toDateString()}
        </Text>
      </View>

      {/* Alerts */}
      {alerts.length > 0 && (
        <View className="bg-red-50 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-2xl p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 font-semibold mb-1">
            Alerts detected
          </Text>
          {alerts.map((msg, idx) => (
            <Text
              key={idx}
              className="text-xs text-red-700 dark:text-red-200 mb-1"
            >
              • {msg}
            </Text>
          ))}
        </View>
      )}

      {/* Error */}
      {error && (
        <View className="bg-red-50 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-2xl p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 font-semibold mb-1">
            Error
          </Text>
          <Text className="text-xs text-red-700 dark:text-red-200 mb-2">
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchTrends}
            className="bg-red-500 rounded-xl px-3 py-2 self-start"
          >
            <Text className="text-white text-xs font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Charts */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
            Daily Adherence – {currentPatientName}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Line chart of adherence percentage per day.
          </Text>

          {loadingTrends && !trendData ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : dailyChart ? (
            <LineChart
              data={dailyChart}
              width={screenWidth - 32}
              height={220}
              yAxisSuffix="%"
              chartConfig={{
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) =>
                  `rgba(55, 65, 81, ${opacity})`,
              }}
              style={{
                borderRadius: 16,
              }}
              bezier
            />
          ) : (
            <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              No daily adherence data in this range.
            </Text>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
            Medication-Specific Adherence
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Bar chart of average adherence by medication.
          </Text>

          {loadingTrends && !trendData ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : medChart ? (
            <BarChart
                data={medChart}
                width={screenWidth - 32}
                height={220}
                yAxisSuffix="%"
                yAxisLabel=""     // ← ADD THIS LINE
                fromZero
                chartConfig={{
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
                }}
                style={{
                    borderRadius: 16,
                }}
            />
          ) : (
            <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              No medication adherence data in this range.
            </Text>
          )}
        </View>

        {/* Weekly trend summary list for quick eyeballing */}
        {trendData && trendData.weeklyAverage && trendData.weeklyAverage.length > 0 && (
          <View className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Weekly Average Adherence
            </Text>
            {trendData.weeklyAverage.map((w) => (
              <View
                key={`${w.isoYear}-${w.isoWeek}`}
                className="flex-row justify-between mb-1"
              >
                <Text className="text-xs text-gray-600 dark:text-gray-300">
                  {w.week}
                </Text>
                <Text className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  {w.pct}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.push('/(provider)/ProviderHome')}
          className="bg-blue-500 px-6 py-3 rounded-xl mt-6"
        >
          <Text className="text-white text-lg font-semibold text-center">
            Back to Provider Home
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
