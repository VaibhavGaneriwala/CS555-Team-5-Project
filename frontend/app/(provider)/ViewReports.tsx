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
// Import router directly - expo-router provides it globally
import { router, useLocalSearchParams } from 'expo-router';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import ProviderNavbar from '@/components/ProviderNavbar';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 14 Days', value: '14d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
];

const screenWidth = Dimensions.get('window').width;

/* ======================================================
    INTERFACES
====================================================== */

interface Patient {
  _id: string;
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  adherence?: string | number;
}

interface DailyPoint {
  date: string;
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
  week: string;
  pct: number;
}

interface TrendResponse {
  patient: {
    id: string;
    name: string | undefined;
    email?: string;
  };
  daily: DailyPoint[];
  medications: MedPoint[];
  weeklyAverage: WeeklyPoint[];
}

interface AdherenceLogEntry {
  _id: string;
  status: 'taken' | 'missed' | 'skipped' | 'pending';
  scheduledTime: string;
  takenAt?: string | null;
  notes?: string;
  medication?: {
    _id: string;
    name: string;
    dosage?: string;
  };
  patient?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/* ======================================================
    ISO WEEK CALCULATOR
====================================================== */

function getISOWeek(date: Date) {
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));

  const week1 = new Date(tmp.getFullYear(), 0, 4);

  const isoWeek = Math.round(
    ((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7 + 1
  );

  return {
    isoYear: tmp.getFullYear(),
    isoWeek,
  };
}

/* ======================================================
    DATE RANGE HELPERS
====================================================== */

const makeRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  return { start, end };
};

const toISO = (d: Date) => d.toISOString();

/* ======================================================
    COMPONENT
====================================================== */

export default function ViewReports() {
  // Get patientId from route params if provided
  const params = useLocalSearchParams<{ patientId?: string }>();
  const routePatientId = params?.patientId;
  
  const [token, setToken] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(routePatientId || null);

  const [rangeLabel, setRangeLabel] = useState<'7d' | '14d' | '30d' | '90d'>('30d');
  const [dateRange, setDateRange] = useState(() => makeRange(30));
  const [isRangeFocused, setIsRangeFocused] = useState(false);
  const [isPatientFocused, setIsPatientFocused] = useState(false);

  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ======================================================
      LOAD TOKEN
  ====================================================== */

  useEffect(() => {
    const load = async () => {
      const t = await AsyncStorage.getItem('token');
      setToken(t);
    };
    load();
  }, []);

  /* ======================================================
      SET PATIENT FROM ROUTE PARAMS
  ====================================================== */
  
  useEffect(() => {
    if (routePatientId && routePatientId !== selectedPatientId) {
      setSelectedPatientId(routePatientId);
    }
  }, [routePatientId]);

  /* ======================================================
      FETCH PROVIDER PATIENTS
  ====================================================== */

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

        // If patientId from route params, use it; otherwise select first patient
        if (routePatientId) {
          // Verify the patient exists in the list
          const patientExists = pts.find((p) => p._id === routePatientId);
          if (patientExists) {
            setSelectedPatientId(routePatientId);
          } else if (pts.length > 0) {
            // If route patient not found, fall back to first patient
            setSelectedPatientId(pts[0]._id);
          }
        } else if (!selectedPatientId && pts.length > 0) {
          // Select first patient by default if no route param
          setSelectedPatientId(pts[0]._id);
        }

      } catch (err) {
        setError('Unable to connect to server.');
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, [token]);

  /* ======================================================
      ALERT GENERATION
  ====================================================== */

  const computeAlerts = (data: TrendResponse | null): string[] => {
    if (!data) return [];

    const a: string[] = [];

    const dailySorted = [...data.daily].sort((a, b) =>
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

    const weeklySorted = [...data.weeklyAverage].sort((a, b) => {
      if (a.isoYear !== b.isoYear) return a.isoYear - b.isoYear;
      return a.isoWeek - b.isoWeek;
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

  /* ======================================================
      FETCH ADHERENCE TRENDS DATA
  ====================================================== */

  const fetchTrends = async () => {
    if (!token || !selectedPatientId) return;

    try {
      setLoadingTrends(true);
      setError(null);

      // Ensure we're using the current dateRange
      const startDateStr = toISO(dateRange.start);
      const endDateStr = toISO(dateRange.end);

      const url = `${API_URL}/api/adherence/trends?patientId=${selectedPatientId}&startDate=${encodeURIComponent(
        startDateStr
      )}&endDate=${encodeURIComponent(endDateStr)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const raw = await res.json();

      if (!res.ok) {
        setError(raw.message || "Failed to fetch adherence trends.");
        return;
      }

      const backendDaily = raw.trend || [];

      const dailyFromBackend: DailyPoint[] = backendDaily.map((d: any) => ({
        date: d.date,
        taken: d.taken ?? 0,
        missed: d.missed ?? 0,
        pct: d.adherenceRate ?? 0,
      }));

      const oldUrl = `${API_URL}/api/adherence?patientId=${selectedPatientId}&startDate=${encodeURIComponent(
        startDateStr
      )}&endDate=${encodeURIComponent(endDateStr)}`;

      const oldRes = await fetch(oldUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const logs = await oldRes.json();

      if (!Array.isArray(logs)) {
        setError("Server returned invalid adherence logs.");
        return;
      }

      /* -------------------------------------
        OLD DAILY CALCULATION (fallback logic)
      -------------------------------------- */
      const dailyMap: Record<string, { taken: number; missed: number }> = {};

      logs.forEach((log) => {
        const day = log.scheduledTime.slice(0, 10);

        if (!dailyMap[day]) dailyMap[day] = { taken: 0, missed: 0 };

        if (log.status === "taken") dailyMap[day].taken++;
        if (log.status === "missed") dailyMap[day].missed++;
      });

      const dailyFromOldMethod = Object.entries(dailyMap).map(([date, d]) => {
        const total = d.taken + d.missed;
        const pct = total > 0 ? Math.round((d.taken / total) * 100) : 0;

        return { date, taken: d.taken, missed: d.missed, pct };
      });

      const finalDaily = dailyFromBackend.length > 0 ?
        dailyFromBackend :
        dailyFromOldMethod;

      /* -------------------------------------
        MEDICATION ADHERENCE 
      -------------------------------------- */
      const medMap: Record<string, { name: string; taken: number; total: number }> = {};

      logs.forEach((log) => {
        if (!log.medication) return;

        const id = log.medication._id;
        const name = log.medication.name;

        if (!medMap[id]) {
          medMap[id] = { name, taken: 0, total: 0 };
        }

        if (log.status === "taken") medMap[id].taken++;
        if (["taken", "missed"].includes(log.status)) medMap[id].total++;
      });

      const medications = Object.entries(medMap).map(([id, m]) => ({
        medicationId: id,
        name: m.name,
        pct: m.total > 0 ? Math.round((m.taken / m.total) * 100) : 0,
      }));

      /* -------------------------------------
        WEEKLY ADHERENCE
      -------------------------------------- */
      const weeklyMap: Record<
        string,
        { taken: number; total: number; isoYear: number; isoWeek: number }
      > = {};

      logs.forEach((log) => {
        const date = new Date(log.scheduledTime);
        const { isoYear, isoWeek } = getISOWeek(date);
        const weekKey = `${isoYear}-W${isoWeek}`;

        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { taken: 0, total: 0, isoYear, isoWeek };
        }

        if (log.status === "taken") weeklyMap[weekKey].taken++;
        if (["taken", "missed"].includes(log.status)) weeklyMap[weekKey].total++;
      });

      const weeklyAverage: WeeklyPoint[] = Object.entries(weeklyMap).map(
        ([week, w]) => ({
          isoYear: w.isoYear,
          isoWeek: w.isoWeek,
          week,
          pct: w.total > 0 ? Math.round((w.taken / w.total) * 100) : 0,
        })
      );

      /* -------------------------------------
        FINAL TREND RESPONSE
      -------------------------------------- */
      const result: TrendResponse = {
        patient: {
          id: selectedPatientId,
          name: patients.find((p) => p._id === selectedPatientId)?.name,
        },
        daily: finalDaily,
        medications,
        weeklyAverage,
      };

      setTrendData(result);
      setAlerts(computeAlerts(result));

    } catch (err) {
      setError("Unable to connect to server.");
    } finally {
      setLoadingTrends(false);
    }
  };

  /* ======================================================
      REFRESH ON DATE CHANGE OR PATIENT CHANGE
  ====================================================== */

  useEffect(() => {
    if (!selectedPatientId || !token) return;
    fetchTrends();
  }, [
    selectedPatientId,
    dateRange.start.getTime(),
    dateRange.end.getTime(),
    rangeLabel,
    token
  ]);

  /* ======================================================
      UTILITY: CHANGE DATE RANGE
  ====================================================== */

  const handleRangeChange = (label: '7d' | '14d' | '30d' | '90d') => {
    setRangeLabel(label);
    const days = label === '7d' ? 7 : label === '14d' ? 14 : label === '90d' ? 90 : 30;
    const newRange = makeRange(days);
    // Ensure we create new Date objects to trigger useEffect
    setDateRange({
      start: new Date(newRange.start.getTime()),
      end: new Date(newRange.end.getTime())
    });
  };

  /* ======================================================
      CURRENT PATIENT NAME
  ====================================================== */

  const currentPatientName = useMemo(() => {
    if (!trendData?.patient?.name && selectedPatientId && patients.length > 0) {
      const p = patients.find((pt) => pt._id === selectedPatientId);
      return p?.name ?? 'Selected Patient';
    }
    return trendData?.patient?.name ?? 'Selected Patient';
  }, [trendData, selectedPatientId, patients]);

  /* ======================================================
      DAILY CHART
  ====================================================== */

  const dailyChart = useMemo(() => {
    if (!trendData || !trendData.daily || trendData.daily.length === 0) return null;

    return {
      labels: trendData.daily.map((d) => d.date.slice(5)),
      datasets: [{ data: trendData.daily.map((d) => d.pct) }],
    };
  }, [trendData]);

  /* ======================================================
      MEDICATION CHART
  ====================================================== */

  const medChart = useMemo(() => {
    if (!trendData || !trendData.medications || trendData.medications.length === 0) {
      return null;
    }

    return {
      labels: trendData.medications.map((m) =>
        m.name.length > 8 ? `${m.name.slice(0, 7)}…` : m.name
      ),
      datasets: [{ data: trendData.medications.map((m) => m.pct) }],
    };
  }, [trendData]);

  const dailyChartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
  };

  const specificChartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
    barPercentage: 1,
    fillShadowGradient: '#4CAF50',
    fillShadowGradientOpacity: 0.7,
  }

  /* ======================================================
      RENDER
  ====================================================== */

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
    <View className="flex-1 w-full bg-gray-50 dark:bg-gray-900">
      <ProviderNavbar />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-6 pb-8">
          {/* Header */}
          <View 
            className="mb-8 rounded-3xl p-6 shadow-2xl"
            style={{ backgroundColor: '#10b981' }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-3xl font-bold text-white mb-2">
                  Adherence Reports
                </Text>
                <Text className="text-green-100 text-base">
                  Analytics and insights for patient adherence
                </Text>
              </View>
              <View className="bg-white/20 rounded-full p-4 backdrop-blur">
                <Ionicons name="bar-chart" size={32} color="#fff" />
              </View>
            </View>
          </View>

          {/* SECTION 1: PATIENT SELECTION - Only show if no patientId in route params */}
          {!routePatientId && (
            <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <View className="flex-row items-center mb-4">
                <View className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-3 mr-3">
                  <Ionicons name="people" size={24} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 dark:text-white">
                    Select Patient
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Choose a patient to view their adherence reports
                  </Text>
                </View>
              </View>

              <View style={{ zIndex: 1000, elevation: 10 }}>
                <Dropdown
                  data={patients.map((p) => ({ label: p.name, value: p._id }))}
                  labelField="label"
                  valueField="value"
                  placeholder={!isPatientFocused ? 'Select Patient' : ' '}
                  value={selectedPatientId}
                  onFocus={() => setIsPatientFocused(true)}
                  onBlur={() => setIsPatientFocused(false)}
                  onChange={(item) => {
                    setSelectedPatientId(item.value);
                    setIsPatientFocused(false);
                  }}
                  style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: isPatientFocused ? '#2563eb' : '#e5e7eb',
                    minHeight: 50,
                  }}
                  placeholderStyle={{
                    color: '#9ca3af',
                    fontSize: 16,
                  }}
                  selectedTextStyle={{
                    color: '#111827',
                    fontSize: 16,
                    fontWeight: '600',
                  }}
                  itemTextStyle={{
                    color: '#111827',
                    fontSize: 16,
                  }}
                  containerStyle={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    maxHeight: 300,
                  }}
                  activeColor="#dbeafe"
                />
              </View>
            </View>
          )}

          {/* SECTION 2: DATE RANGE & ADHERENCE GRAPHS */}
          {selectedPatientId && (
            <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <View className="flex-row items-center mb-4">
                <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 mr-3">
                  <Ionicons name="calendar" size={24} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 dark:text-white">
                    Date Range & Adherence Trends
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Select a time period to view adherence graphs
                  </Text>
                </View>
              </View>

              <View className="mb-4">
                <View style={{ zIndex: 1000, elevation: 10 }}>
                  <Dropdown
                    data={DATE_RANGE_OPTIONS}
                    labelField="label"
                    valueField="value"
                    placeholder={!isRangeFocused ? 'Select Date Range' : ' '}
                    value={rangeLabel}
                    onFocus={() => setIsRangeFocused(true)}
                    onBlur={() => setIsRangeFocused(false)}
                    onChange={(item) => {
                      handleRangeChange(item.value as '7d' | '14d' | '30d' | '90d');
                      setIsRangeFocused(false);
                    }}
                    style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: isRangeFocused ? '#10b981' : '#e5e7eb',
                      minHeight: 50,
                    }}
                    placeholderStyle={{
                      color: '#9ca3af',
                      fontSize: 16,
                    }}
                    selectedTextStyle={{
                      color: '#111827',
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                    itemTextStyle={{
                      color: '#111827',
                      fontSize: 16,
                    }}
                    containerStyle={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      maxHeight: 300,
                    }}
                    activeColor="#d1fae5"
                  />
                </View>
              </View>

              <View className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-2 mb-6">
                <Text className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  <Ionicons name="time-outline" size={12} color="#6b7280" /> {dateRange.start.toDateString()} – {dateRange.end.toDateString()}
                </Text>
              </View>

              {/* Daily Adherence Chart */}
              <View className="mb-4">
                <View className="flex-row items-center mb-3">
                  <View className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-2 mr-3">
                    <Ionicons name="trending-up" size={20} color="#2563eb" />
                  </View>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    Daily Adherence Trend
                  </Text>
                </View>

                {loadingTrends && !trendData ? (
                  <View className="items-center justify-center py-12">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text className="text-gray-500 dark:text-gray-400 mt-3">Loading chart data...</Text>
                  </View>
                ) : dailyChart ? (
                  <View>
                    <LineChart
                      data={dailyChart}
                      width={screenWidth - 80}
                      height={220}
                      yAxisSuffix="%"
                      chartConfig={dailyChartConfig}
                      style={{ borderRadius: 16 }}
                      bezier
                      fromZero={true}
                    />
                  </View>
                ) : (
                  <View className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 items-center">
                    <Ionicons name="bar-chart-outline" size={48} color="#9ca3af" />
                    <Text className="text-gray-500 dark:text-gray-400 text-sm mt-3 text-center">
                      No daily adherence data in this range.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ALERTS */}
          {alerts.length > 0 && (
            <View className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-3xl p-5 mb-6 shadow-lg">
              <View className="flex-row items-center mb-3">
                <View className="bg-red-100 dark:bg-red-900/30 rounded-xl p-2 mr-3">
                  <Ionicons name="alert-circle" size={24} color="#dc2626" />
                </View>
                <Text className="text-red-700 dark:text-red-300 font-bold text-lg">
                  Alerts Detected
                </Text>
              </View>
              <View className="space-y-2">
                {alerts.map((msg, idx) => (
                  <View key={idx} className="flex-row items-start">
                    <Ionicons name="warning" size={16} color="#dc2626" style={{ marginTop: 2, marginRight: 8 }} />
                    <Text className="text-sm text-red-700 dark:text-red-300 flex-1">
                      {msg}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ERROR */}
          {error && (
            <View className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-3xl p-5 mb-6 shadow-lg">
              <View className="flex-row items-center mb-3">
                <View className="bg-red-100 dark:bg-red-900/30 rounded-xl p-2 mr-3">
                  <Ionicons name="close-circle" size={24} color="#dc2626" />
                </View>
                <Text className="text-red-700 dark:text-red-300 font-bold text-lg">
                  Error
                </Text>
              </View>
              <Text className="text-sm text-red-700 dark:text-red-300 mb-4">
                {error}
              </Text>
              <TouchableOpacity
                onPress={fetchTrends}
                className="bg-red-600 dark:bg-red-700 rounded-xl px-4 py-3 self-start flex-row items-center"
              >
                <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text className="text-white text-sm font-semibold">Retry</Text>
              </TouchableOpacity>
            </View>
          )}


          {/* BACK BUTTON */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-500 px-6 py-4 rounded-xl shadow-lg flex-row items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white text-lg font-semibold">
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
