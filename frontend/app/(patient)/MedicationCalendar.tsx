import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useColorScheme } from "nativewind";
import { Calendar } from "react-native-calendars";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.API_URL ?? "http://localhost:3000";

// ---------------- Types ----------------
interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  schedule?: { time: string; days: string[] }[];
  startDate?: string;
  createdAt: string;
}

export default function MedicationCalendarPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [successMessage, setSuccessMessage] = useState("");
  const [lastLogId, setLastLogId] = useState<string | null>(null);

  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === "dark";


  // Load token
  useEffect(() => {
    AsyncStorage.getItem("token").then((t) => setToken(t));
  }, []);

  // Fetch medications
  useEffect(() => {
    if (!token) return;

    const loadMeds = async () => {
      try {
        const res = await fetch(`${API_URL}/api/medications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setMedications(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading medications:", err);
      }
      setLoading(false);
    };

    loadMeds();
  }, [token]);

  // ---------------- Helper Functions ----------------
  const getDayName = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { weekday: "long" });
  };

  const getMedsForDate = (dateString: string) => {
    const day = getDayName(dateString);

    return medications.filter((m) => {
      if (!m.schedule) return false;

      const matchesDay = m.schedule.some((s) => s.days.includes(day));
      if (!matchesDay) return false;

      if (m.startDate && new Date(m.startDate) > new Date(dateString))
        return false;

      return true;
    });
  };

  const markedDates = useMemo(() => {
    const marks: any = {};

    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];

      if (getMedsForDate(ds).length > 0) {
        marks[ds] = { marked: true, dotColor: "#3B82F6" };
      }
    }

    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: "#2563EB",
    };

    return marks;
  }, [medications, selectedDate]);

  // ---------------- LOG DOSE + UNDO ----------------
  const logDose = async (medId: string, time: string) => {
    try {
      if (!token) return;

      const res = await fetch(`${API_URL}/api/adherence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medicationId: medId,                    // ✅ matches controller
          scheduledTime: `${selectedDate} ${time}`,
          takenAt: new Date().toISOString(),
          status: "taken",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Log dose error:", data);
        throw new Error(data?.message || "Failed to log dose");
      }

      if (data?.adherenceLog?._id) {
        setLastLogId(data.adherenceLog._id);
      } else {
        setLastLogId(null);
      }

      setSuccessMessage("Dose logged successfully!");
      setTimeout(() => setSuccessMessage(""), 2500);
    } catch (err) {
      console.error(err);
      setSuccessMessage("Error logging dose.");
      setTimeout(() => setSuccessMessage(""), 2500);
    }
  };

  const undoDose = async () => {
    if (!lastLogId || !token) return;

    try {
      const res = await fetch(`${API_URL}/api/adherence/${lastLogId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Undo dose error:", data);
        throw new Error(data?.message || "Failed to undo dose");
      }

      setSuccessMessage("Dose undone.");
      setLastLogId(null);
      setTimeout(() => setSuccessMessage(""), 2500);
    } catch (err) {
      console.error(err);
      setSuccessMessage("Error undoing dose.");
      setTimeout(() => setSuccessMessage(""), 2500);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-700 dark:text-gray-300 mt-4">
          Loading medications...
        </Text>
      </View>
    );
  }

  const todaysMeds = getMedsForDate(selectedDate);

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900 px-4 pt-10">
      <Text className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-6">
        Medication Calendar
      </Text>

      {/* Calendar */}
      <Calendar
  key={isDarkMode ? "dark" : "light"}   // ← FORCE REMOUNT
  markingType="dot"
  markedDates={markedDates}
  onDayPress={(day) => setSelectedDate(day.dateString)}
  theme={{
    backgroundColor: isDarkMode ? "#111827" : "#F9FAFB",
    calendarBackground: isDarkMode ? "#1F2937" : "#FFFFFF",
    monthTextColor: isDarkMode ? "#F9FAFB" : "#111827",
    dayTextColor: isDarkMode ? "#E5E7EB" : "#1F2937",
    selectedDayBackgroundColor: "#2563EB",
    selectedDayTextColor: "#FFFFFF",
    arrowColor: isDarkMode ? "#60A5FA" : "#2563EB",
  }}
/>


      {/* Success Message + Undo */}
      {successMessage !== "" && (
        <View className="bg-green-600 p-4 rounded-xl mt-4 w-full max-w-xl self-center flex-row justify-between items-center">
          <Text className="text-white font-semibold">{successMessage}</Text>

          {lastLogId && (
            <TouchableOpacity
              onPress={undoDose}
              className="bg-white px-3 py-1 rounded-lg"
            >
              <Text className="text-green-700 font-bold">Undo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Medication List */}
      <View className="mt-8 w-full flex items-center">
        <View className="bg-white dark:bg-gray-800 p-5 rounded-xl w-full max-w-2xl border border-gray-200 dark:border-gray-700">
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Medications on {selectedDate}
          </Text>

          {todaysMeds.length === 0 ? (
            <Text className="text-gray-600 dark:text-gray-400">
              No medications scheduled.
            </Text>
          ) : (
            todaysMeds.map((m) => (
              <View
                key={m._id}
                className="border-b border-gray-200 dark:border-gray-700 py-3"
              >
                <Text className="text-gray-900 dark:text-gray-200 font-semibold">
                  {m.name} — {m.dosage}
                </Text>

                {m.schedule
                  ?.filter((s) => s.days.includes(getDayName(selectedDate)))
                  .map((s, i) => (
                    <View
                      key={i}
                      className="flex-row justify-between items-center mt-2"
                    >
                      <Text className="text-gray-600 dark:text-gray-300">
                        🕒 {s.time}
                      </Text>

                      <TouchableOpacity
                        onPress={() => logDose(m._id, s.time)}
                        className="bg-green-600 px-3 py-1 rounded-lg"
                      >
                        <Text className="text-white font-semibold text-sm">
                          Log Dose
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            ))
          )}
        </View>
      </View>

      {/* Back Button */}
      <View className="flex items-center mt-10 mb-10">
        <TouchableOpacity
          onPress={() => router.push("/(patient)/PatientHome")}
          className="bg-blue-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Back to Patient Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
