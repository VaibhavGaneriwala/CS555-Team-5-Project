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

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

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
  week: string;   // e.g. "2025-W1"
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
  const { patientId: initialPatientId } = useLocalSearchParams<{ patientId?: string }>();

  const [token, setToken] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    initialPatientId ?? null
  );

  const [rangeLabel, setRangeLabel] =
    useState<'7d' | '14d' | '30d' | '90d'>('30d');
  const [dateRange, setDateRange] = useState(() => makeRange(30));

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

  /* ======================================================
      ALERT GENERATION
  ====================================================== */

  const computeAlerts = (data: TrendResponse | null): string[] => {
    if (!data) return [];

    const a: string[] = [];

    const dailySorted = [...data.daily].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // DAILY DROPS
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

    // MISSED DOSES
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

    // WEEKLY DECLINES
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

      // NEW BACKEND ANALYTICS ENDPOINT
      const url = `${API_URL}/api/adherence/trends?patientId=${selectedPatientId}&startDate=${encodeURIComponent(
        toISO(dateRange.start)
      )}&endDate=${encodeURIComponent(toISO(dateRange.end))}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const raw = await res.json();

      if (!res.ok) {
        setError(raw.message || "Failed to fetch adherence trends.");
        return;
      }

      const backendDaily = raw.trend || [];

      // Convert backend => DailyPoint format
      const dailyFromBackend: DailyPoint[] = backendDaily.map((d: any) => ({
        date: d.date,
        taken: d.taken ?? 0,
        missed: d.missed ?? 0,
        pct: d.adherenceRate ?? 0,
      }));

      // FETCH OLD LOGS TO PRESERVE EXISTING CHARTS (weekly + meds)
      const oldUrl = `${API_URL}/api/adherence?patientId=${selectedPatientId}&startDate=${encodeURIComponent(
        toISO(dateRange.start)
      )}&endDate=${encodeURIComponent(toISO(dateRange.end))}`;

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

      // FINAL DAILY = backend trends preferred
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
      console.error("Error fetching adherence trends:", err);
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
    token
  ]);

  /* ======================================================
      UTILITY: CHANGE DATE RANGE BUTTON
  ====================================================== */

  const handleRangeChange = (label: '7d' | '14d' | '30d' | '90d') => {
    setRangeLabel(label);
    const days = label === '7d' ? 7 : label === '14d' ? 14 : label === '90d' ? 90 : 30;
    setDateRange(makeRange(days));
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
    <View className="flex-1 bg-white dark:bg-gray-900 pt-10 pb-4 px-4">
      <Text className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">
        Adherence Reports
      </Text>

      {/* PATIENT FILTER */}
      <View className="mb-6">
        <Text className="text-gray-800 dark:text-gray-200 font-semibold mb-2">
          Patient
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {patients.map((p) => (
            <TouchableOpacity
              key={p._id}
              onPress={() => setSelectedPatientId(p._id)}
              className={`px-3 py-2 rounded-full mr-2 mb-2 border 
                ${
                  selectedPatientId === p._id
                    ? 'bg-blue-600 border-blue-700'
                    : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
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

        {/* DATE RANGE FILTER */}
        <Text className="text-gray-800 dark:text-gray-200 font-semibold mt-4 mb-2">
          Date Range
        </Text>

        <View className="flex-row">
          {(['7d', '14d', '30d', '90d'] as const).map((label) => (
            <TouchableOpacity
              key={label}
              onPress={() => handleRangeChange(label)}
              className={`px-3 py-2 rounded-full mr-2 border 
                ${
                  rangeLabel === label
                    ? 'bg-green-600 border-green-700'
                    : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
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

      {/* ALERTS */}
      {alerts.length > 0 && (
        <View className="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-2xl p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 font-semibold mb-1">
            Alerts detected
          </Text>
          {alerts.map((msg, idx) => (
            <Text key={idx} className="text-xs text-red-700 dark:text-red-300 mb-1">
              • {msg}
            </Text>
          ))}
        </View>
      )}

      {/* ERROR */}
      {error && (
        <View className="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-2xl p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 font-semibold mb-1">
            Error
          </Text>
          <Text className="text-xs text-red-700 dark:text-red-300 mb-2">
            {error}
          </Text>

          <TouchableOpacity
            onPress={fetchTrends}
            className="bg-red-600 dark:bg-red-700 rounded-xl px-3 py-2 self-start"
          >
            <Text className="text-white text-xs font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MAIN SCROLL */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* DAILY CHART */}
        <View className="mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl shadow">
          <Text className="text-lg font-bold text-gray-800 dark:text-white mb-1">
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
                labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
              }}
              style={{ borderRadius: 16 }}
              bezier
            />
          ) : (
            <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              No daily adherence data in this range.
            </Text>
          )}
        </View>

        {/* MEDICATION CHART */}
        <View className="mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl shadow">
          <Text className="text-lg font-bold text-gray-800 dark:text-white mb-1">
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
              yAxisLabel=''
              fromZero
              chartConfig={{
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(16,185,129,${opacity})`,
                labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
              }}
              style={{ borderRadius: 16 }}
            />
          ) : (
            <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              No medication adherence data in this range.
            </Text>
          )}
        </View>

        {/* WEEKLY SUMMARY */}
        {trendData?.weeklyAverage && trendData.weeklyAverage.length > 0 && (
          <View className="mt-2 bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 shadow">
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Weekly Average Adherence
            </Text>

            {trendData.weeklyAverage.map((w) => (
              <View
                key={`${w.isoYear}-${w.isoWeek}`}
                className="flex-row justify-between mb-1"
              >
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  {w.week}
                </Text>
                <Text className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {w.pct}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* BACK BUTTON */}
        <TouchableOpacity
          onPress={() => router.push('/(provider)/ProviderHome')}
          className="bg-blue-500 px-6 py-3 rounded-xl mt-8"
        >
          <Text className="text-white text-lg font-semibold text-center">
            Back to Provider Home
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
