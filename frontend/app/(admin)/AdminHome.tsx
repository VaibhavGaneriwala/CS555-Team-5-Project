import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
  Platform,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import AdminNavbar from '@/components/AdminNavbar';
import { API_URL } from '@/utils/apiConfig';

interface AdminStats {
  users: {
    total: number;
    admins: number;
    providers: number;
    patients: number;
    active: number;
    inactive: number;
    recent: number;
  };
  medications: {
    total: number;
    active: number;
    inactive: number;
  };
  adherence: {
    total: number;
    taken: number;
    missed: number;
    skipped: number;
    pending: number;
    rate: number;
  };
  relationships: {
    providersWithPatients: number;
    patientsWithProviders: number;
  };
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'patient' | 'provider';
  providerCount?: number;
}

interface ScheduleEntry {
  time: string;
  days?: string[];
}

interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  schedule: ScheduleEntry[];
  startDate: string;
  endDate?: string;
  instructions?: string;
  prescribedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const FREQUENCY_OPTIONS = [
  { value: "once-daily", label: "Once daily" },
  { value: "twice-daily", label: "Twice daily" },
  { value: "three-times-daily", label: "3x daily" },
  { value: "four-times-daily", label: "4x daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as-needed", label: "As needed" },
  { value: "custom", label: "Custom" },
];

export default function AdminHome() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Assign patient state
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [patients, setPatients] = useState<User[]>([]);
  const [providers, setProviders] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  // Medications modal state
  const [medicationsModalVisible, setMedicationsModalVisible] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationsLoading, setMedicationsLoading] = useState(false);
  const [medicationsError, setMedicationsError] = useState<string | null>(null);

  // Edit medication modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDosage, setEditDosage] = useState("");
  const [editFrequency, setEditFrequency] = useState<string>("once-daily");
  const [editScheduleText, setEditScheduleText] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editInstructions, setEditInstructions] = useState("");

  const fetchStats = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to fetch statistics.');
      } else {
        setStats(data.stats);
      }
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const fetchUsersForAssignment = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok && data.users) {
        const allUsers = data.users as User[];
        setPatients(allUsers.filter((u) => u.role === 'patient'));
        setProviders(allUsers.filter((u) => u.role === 'provider'));
      }
    } catch (err) {
    }
  };

  const handleOpenAssignModal = () => {
    setAssignModalVisible(true);
    fetchUsersForAssignment();
    setSelectedPatient(null);
    setSelectedProvider(null);
    setAssignMessage(null);
  };

  const fetchMedications = async () => {
    try {
      setMedicationsError(null);
      setMedicationsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setMedicationsError('Authentication token missing.');
        setMedicationsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/medications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMedicationsError(data.message || 'Failed to fetch medications');
      } else {
        setMedications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setMedicationsError('Unable to connect to server.');
    } finally {
      setMedicationsLoading(false);
    }
  };

  const handleOpenMedicationsModal = () => {
    setMedicationsModalVisible(true);
    fetchMedications();
  };

  const handleEditMedication = (medication: Medication) => {
    setSelectedMedication(medication);
    setEditName(medication.name);
    setEditDosage(medication.dosage);
    setEditFrequency(medication.frequency || 'once-daily');
    const schedule = medication.schedule || [];
    const times = schedule.map((s) => s.time).join(', ');
    setEditScheduleText(times);
    setEditStartDate(medication.startDate?.slice(0, 10) || '');
    setEditEndDate(medication.endDate?.slice(0, 10) || '');
    setEditInstructions(medication.instructions || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMedication) return;

    if (!editName || !editDosage || !editFrequency || !editScheduleText || !editStartDate) {
      if (Platform.OS === 'web') {
        window.alert('Please fill all required fields.');
      } else {
        Alert.alert('Missing Required Fields', 'Please fill all required fields.');
      }
      return;
    }

    const times = editScheduleText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (!times.length) {
      if (Platform.OS === 'web') {
        window.alert('Please enter at least one time.');
      } else {
        Alert.alert('Invalid Schedule', 'Please enter at least one time.');
      }
      return;
    }

    const schedulePayload = times.map((time) => ({
      time,
      days: [],
    }));

    setEditSaving(true);

    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/medications/${selectedMedication._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          dosage: editDosage,
          frequency: editFrequency,
          schedule: schedulePayload,
          startDate: editStartDate,
          endDate: editEndDate,
          instructions: editInstructions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (Platform.OS === 'web') {
          window.alert(data.message || 'Failed to update medication');
        } else {
          Alert.alert('Error', data.message || 'Failed to update medication');
        }
        return;
      }

      if (Platform.OS === 'web') {
        window.alert('Medication updated successfully!');
      } else {
        Alert.alert('Success', 'Medication updated successfully!');
      }
      setEditModalVisible(false);
      fetchMedications();
      fetchStats(); // Refresh stats
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Server error while saving.');
      } else {
        Alert.alert('Error', 'Server error while saving.');
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    const message = 'Are you sure you want to delete this medication? This action cannot be undone.';

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Confirm Delete',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await performDelete(id);
            },
          },
        ]
      );
      return;
    }

    await performDelete(id);
  };

  const performDelete = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/medications/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (Platform.OS === 'web') {
          window.alert(data.message || 'Failed to delete medication');
        } else {
          Alert.alert('Error', data.message || 'Failed to delete medication');
        }
        return;
      }

      if (Platform.OS === 'web') {
        window.alert('Medication deleted successfully');
      } else {
        Alert.alert('Success', 'Medication deleted successfully');
      }
      fetchMedications();
      fetchStats(); // Refresh stats
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Server error. Try again.');
      } else {
        Alert.alert('Error', 'Server error. Try again.');
      }
    }
  };

  const formatSchedule = (schedule: ScheduleEntry[] | undefined) => {
    if (!schedule || schedule.length === 0) return 'No schedule set';

    return schedule
      .map((entry) => {
        const time = entry.time;
        const days = entry.days && entry.days.length
          ? ` (${entry.days.join(', ')})`
          : '';
        return `${time}${days}`;
      })
      .join(', ');
  };

  const handleAssign = async () => {
    if (!selectedPatient || !selectedProvider) {
      setAssignMessage('⚠️ Please select both a patient and a provider.');
      return;
    }

    setAssigning(true);
    setAssignMessage(null);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setAssignMessage('Authentication token missing.');
        setAssigning(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/assign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedPatient,
          providerId: selectedProvider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAssignMessage(data.message || '❌ Assignment failed.');
      } else {
        setAssignMessage('✅ Patient assigned successfully!');
        setTimeout(() => {
          setAssignMessage(null);
          setAssignModalVisible(false);
          setSelectedPatient(null);
          setSelectedProvider(null);
          fetchStats(); // Refresh stats to update relationships
        }, 1500);
      }
    } catch (err) {
      setAssignMessage('⚠️ Could not connect to server.');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-gray-700 dark:text-gray-300">
          Loading dashboard...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text className="text-red-500 text-lg font-semibold mb-3 text-center mt-4">
          {error}
        </Text>
        <TouchableOpacity
          onPress={fetchStats}
          className="bg-blue-500 px-6 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stats) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <Text className="text-gray-700 dark:text-gray-300">
          No statistics available.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 pt-6 pb-8">
        {/* Header with beautiful background */}
        <View 
          className="mb-8 rounded-3xl p-6 shadow-2xl"
          style={{ backgroundColor: '#4f46e5' }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-white mb-2">
                Admin Dashboard
              </Text>
              <Text className="text-blue-100 text-base">
                System overview and management
              </Text>
            </View>
            <View className="bg-white/20 rounded-full p-4 backdrop-blur">
              <Ionicons name="shield-checkmark" size={32} color="#fff" />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-8">
          <View className="flex-row items-center mb-5">
            <View className="h-1 w-12 bg-blue-500 rounded-full mr-3" />
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Quick Actions
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-4">
            <ActionButton
              icon="people"
              title="View Users"
              description="Manage all users"
              onPress={() => router.push('/(admin)/ViewUsers')}
              color="#2563eb"
              gradient={['#2563eb', '#1d4ed8']}
            />

            <ActionButton
              icon="medical"
              title="View Medications"
              description="All medications"
              onPress={() => router.push('/(admin)/ViewMedications')}
              color="#059669"
              gradient={['#059669', '#047857']}
            />

            <ActionButton
              icon="checkmark-circle"
              title="View Adherence Logs"
              description="Patient adherence records"
              onPress={() => router.push('/(admin)/ViewAdherenceLogs')}
              color="#10b981"
              gradient={['#10b981', '#059669']}
            />

            <ActionButton
              icon="link"
              title="Assign Patient"
              description="Link patient to provider"
              onPress={handleOpenAssignModal}
              color="#f59e0b"
              gradient={['#f59e0b', '#d97706']}
            />

            <ActionButton
              icon="settings"
              title="System Settings"
              description="Configuration"
              onPress={() => router.push('/(admin)/SystemStatus')}
              color="#7c3aed"
              gradient={['#7c3aed', '#6d28d9']}
            />
          </View>
        </View>

        {/* Stats Grid */}
        <View className="mb-6">
          <View className="flex-row items-center mb-6">
            <View className="h-1 w-12 bg-blue-500 rounded-full mr-3" />
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              System Statistics
            </Text>
          </View>

          {/* User Stats */}
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-5 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <View className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-full -mr-16 -mt-16 opacity-50" />
            <View className="flex-row items-center mb-4 relative z-10">
              <View className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-3 mr-3">
                <Ionicons name="people" size={28} color="#2563eb" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Users
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3 relative z-10">
              <StatCard
                label="Total Users"
                value={stats.users.total}
                color="#2563eb"
                icon="people-outline"
              />
              <StatCard
                label="Admins"
                value={stats.users.admins}
                color="#7c3aed"
                icon="shield-outline"
              />
              <StatCard
                label="Providers"
                value={stats.users.providers}
                color="#059669"
                icon="medical-outline"
              />
              <StatCard
                label="Patients"
                value={stats.users.patients}
                color="#dc2626"
                icon="person-outline"
              />
              <StatCard
                label="Active"
                value={stats.users.active}
                color="#16a34a"
                icon="checkmark-circle-outline"
              />
              <StatCard
                label="Inactive"
                value={stats.users.inactive}
                color="#ca8a04"
                icon="ban-outline"
              />
              <StatCard
                label="New (7 days)"
                value={stats.users.recent}
                color="#0891b2"
                icon="time-outline"
              />
            </View>
          </View>

          {/* Medication Stats */}
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-5 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <View className="absolute top-0 right-0 w-32 h-32 bg-green-100 dark:bg-green-900/20 rounded-full -mr-16 -mt-16 opacity-50" />
            <View className="flex-row items-center mb-4 relative z-10">
              <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 mr-3">
                <Ionicons name="medical" size={28} color="#059669" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Medications
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3 relative z-10">
              <StatCard
                label="Total"
                value={stats.medications.total}
                color="#059669"
                icon="list-outline"
              />
              <StatCard
                label="Active"
                value={stats.medications.active}
                color="#16a34a"
                icon="checkmark-circle-outline"
              />
              <StatCard
                label="Inactive"
                value={stats.medications.inactive}
                color="#ca8a04"
                icon="close-circle-outline"
              />
            </View>
          </View>

          {/* Adherence Stats */}
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-5 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <View className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 dark:bg-emerald-900/20 rounded-full -mr-16 -mt-16 opacity-50" />
            <View className="flex-row items-center mb-4 relative z-10">
              <View className="bg-emerald-100 dark:bg-emerald-900/30 rounded-xl p-3 mr-3">
                <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Adherence
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3 relative z-10">
              <StatCard
                label="Total Logs"
                value={stats.adherence.total}
                color="#0891b2"
                icon="document-text-outline"
              />
              <StatCard
                label="Taken"
                value={stats.adherence.taken}
                color="#16a34a"
                icon="checkmark-outline"
              />
              <StatCard
                label="Missed"
                value={stats.adherence.missed}
                color="#dc2626"
                icon="close-outline"
              />
              <StatCard
                label="Skipped"
                value={stats.adherence.skipped}
                color="#ca8a04"
                icon="remove-outline"
              />
              <StatCard
                label="Pending"
                value={stats.adherence.pending}
                color="#7c3aed"
                icon="time-outline"
              />
              <StatCard
                label="Adherence Rate"
                value={`${stats.adherence.rate}%`}
                color={stats.adherence.rate >= 80 ? '#16a34a' : '#dc2626'}
                icon="trending-up-outline"
              />
            </View>
          </View>

          {/* Relationships */}
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-4 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <View className="absolute top-0 right-0 w-32 h-32 bg-purple-100 dark:bg-purple-900/20 rounded-full -mr-16 -mt-16 opacity-50" />
            <View className="flex-row items-center mb-4 relative z-10">
              <View className="bg-purple-100 dark:bg-purple-900/30 rounded-xl p-3 mr-3">
                <Ionicons name="link" size={28} color="#7c3aed" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Relationships
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3 relative z-10">
              <StatCard
                label="Providers with Patients"
                value={stats.relationships.providersWithPatients}
                color="#059669"
                icon="people-circle-outline"
              />
              <StatCard
                label="Patients with Providers"
                value={stats.relationships.patientsWithProviders}
                color="#2563eb"
                icon="person-circle-outline"
              />
            </View>
          </View>
        </View>
        </View>
      </ScrollView>

      {/* Assign Patient Modal */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        {Platform.OS === 'web' ? (
          <View className="flex-1 justify-center items-center bg-black/60">
            <Pressable 
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
              onPress={() => {
                setAssignModalVisible(false);
                setSelectedPatient(null);
                setSelectedProvider(null);
                setAssignMessage(null);
              }}
            />
            <View 
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl" 
              style={{ 
                maxHeight: Platform.OS === 'web' ? '90%' : undefined,
                maxWidth: Platform.OS === 'web' ? 1200 : undefined,
                width: Platform.OS === 'web' ? '90%' : undefined
              }}
              onStartShouldSetResponder={() => true}
            >
            <View className="flex-row justify-between items-center mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center">
                <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-2 mr-3">
                  <Ionicons name="link" size={24} color="#10b981" />
                </View>
                <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                  Assign Patient
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setAssignModalVisible(false);
                  setSelectedPatient(null);
                  setSelectedProvider(null);
                  setAssignMessage(null);
                }}
                className="bg-gray-100 dark:bg-gray-700 rounded-full p-2"
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <View className="mb-6 flex-row gap-4" style={{ flex: 1 }}>
                <View className="flex-1">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="person" size={20} color="#dc2626" />
                    <Text className="text-lg font-bold text-gray-800 dark:text-white ml-2">
                      Select Patient
                    </Text>
                  </View>
                  <View className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-3 border-2 border-gray-200 dark:border-gray-600" style={{ flex: 1, minHeight: 400 }}>
                    <FlatList
                      data={patients}
                      keyExtractor={(item) => item._id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => setSelectedPatient(item._id)}
                          className={`p-3 rounded-xl mb-2 border-2 ${
                            selectedPatient === item._id
                              ? 'bg-green-100 dark:bg-green-900/30 border-green-500'
                              : 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500'
                          }`}
                          activeOpacity={0.7}
                        >
                          <Text className="text-gray-900 dark:text-white font-bold text-sm">
                            {item.firstName} {item.lastName}
                          </Text>
                          <Text className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                            {item.email}
                          </Text>
                          {item.providerCount !== undefined && item.providerCount > 0 && (
                            <Text className="text-blue-600 dark:text-blue-400 text-xs mt-1 font-semibold">
                              ⚠️ Has provider
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                      nestedScrollEnabled={true}
                    />
                  </View>
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="medical" size={20} color="#059669" />
                    <Text className="text-lg font-bold text-gray-800 dark:text-white ml-2">
                      Select Provider
                    </Text>
                  </View>
                  <View className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-3 border-2 border-gray-200 dark:border-gray-600" style={{ flex: 1, minHeight: 400 }}>
                    <FlatList
                      data={providers}
                      keyExtractor={(item) => item._id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => setSelectedProvider(item._id)}
                          className={`p-3 rounded-xl mb-2 border-2 ${
                            selectedProvider === item._id
                              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500'
                              : 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500'
                          }`}
                          activeOpacity={0.7}
                        >
                          <Text className="text-gray-900 dark:text-white font-bold text-sm">
                            {item.firstName} {item.lastName}
                          </Text>
                          <Text className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                            {item.email}
                          </Text>
                        </TouchableOpacity>
                      )}
                      nestedScrollEnabled={true}
                    />
                  </View>
                </View>
              </View>

              {assignMessage && (
                <Text
                  className={`text-center mb-3 font-semibold ${
                    assignMessage.includes('✅')
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {assignMessage}
                </Text>
              )}

              <View className="flex-row justify-between gap-3 mt-6">
                <TouchableOpacity
                  onPress={handleAssign}
                  disabled={assigning}
                  className={`flex-1 px-6 py-4 rounded-2xl shadow-lg ${
                    assigning ? 'bg-green-300' : 'bg-green-600'
                  }`}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-lg font-bold text-center">
                    {assigning ? 'Assigning...' : 'Assign'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setAssignModalVisible(false);
                    setSelectedPatient(null);
                    setSelectedProvider(null);
                    setAssignMessage(null);
                  }}
                  disabled={assigning}
                  className={`flex-1 px-6 py-4 rounded-2xl shadow-lg border-2 ${
                    assigning
                      ? 'bg-gray-200 border-gray-300'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                  }`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-lg font-bold text-center ${
                      assigning
                        ? 'text-gray-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </View>
        ) : (
          <View className="flex-1 justify-end bg-black/60">
            <View 
              className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 shadow-2xl" 
              style={{ 
                height: '85%',
                maxHeight: '90%'
              }}
            >
              <View className="flex-row justify-between items-center mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                <View className="flex-row items-center">
                  <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-2 mr-3">
                    <Ionicons name="link" size={24} color="#10b981" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                    Assign Patient
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    setAssignModalVisible(false);
                    setSelectedPatient(null);
                    setSelectedProvider(null);
                    setAssignMessage(null);
                  }}
                  className="bg-gray-100 dark:bg-gray-700 rounded-full p-2"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <View className="mb-6 flex-row gap-4" style={{ flex: 1 }}>
                  <View className="flex-1">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="person" size={20} color="#dc2626" />
                      <Text className="text-lg font-bold text-gray-800 dark:text-white ml-2">
                        Select Patient
                      </Text>
                    </View>
                    <View className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-3 border-2 border-gray-200 dark:border-gray-600" style={{ flex: 1, minHeight: 400 }}>
                      <FlatList
                        data={patients}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={() => setSelectedPatient(item._id)}
                            className={`p-3 rounded-xl mb-2 border-2 ${
                              selectedPatient === item._id
                                ? 'bg-green-100 dark:bg-green-900/30 border-green-500'
                                : 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500'
                            }`}
                            activeOpacity={0.7}
                          >
                            <Text className="text-gray-900 dark:text-white font-bold text-sm">
                              {item.firstName} {item.lastName}
                            </Text>
                            <Text className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                              {item.email}
                            </Text>
                            {item.providerCount !== undefined && item.providerCount > 0 && (
                              <Text className="text-blue-600 dark:text-blue-400 text-xs mt-1 font-semibold">
                                ⚠️ Has provider
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}
                        nestedScrollEnabled={true}
                      />
                    </View>
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="medical" size={20} color="#059669" />
                      <Text className="text-lg font-bold text-gray-800 dark:text-white ml-2">
                        Select Provider
                      </Text>
                    </View>
                    <View className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-3 border-2 border-gray-200 dark:border-gray-600" style={{ flex: 1, minHeight: 400 }}>
                      <FlatList
                        data={providers}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={() => setSelectedProvider(item._id)}
                            className={`p-3 rounded-xl mb-2 border-2 ${
                              selectedProvider === item._id
                                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500'
                                : 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500'
                            }`}
                            activeOpacity={0.7}
                          >
                            <Text className="text-gray-900 dark:text-white font-bold text-sm">
                              {item.firstName} {item.lastName}
                            </Text>
                            <Text className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                              {item.email}
                            </Text>
                          </TouchableOpacity>
                        )}
                        nestedScrollEnabled={true}
                      />
                    </View>
                  </View>
                </View>

                {assignMessage && (
                  <Text
                    className={`text-center mb-3 font-semibold ${
                      assignMessage.includes('✅')
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-500 dark:text-red-400'
                    }`}
                  >
                    {assignMessage}
                  </Text>
                )}

                <View className="flex-row justify-between gap-3 mt-6">
                  <TouchableOpacity
                    onPress={handleAssign}
                    disabled={assigning}
                    className={`flex-1 px-6 py-4 rounded-2xl shadow-lg ${
                      assigning ? 'bg-green-300' : 'bg-green-600'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-lg font-bold text-center">
                      {assigning ? 'Assigning...' : 'Assign'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setAssignModalVisible(false);
                      setSelectedPatient(null);
                      setSelectedProvider(null);
                      setAssignMessage(null);
                    }}
                    disabled={assigning}
                    className={`flex-1 px-6 py-4 rounded-2xl shadow-lg border-2 ${
                      assigning
                        ? 'bg-gray-200 border-gray-300'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text
                      className={`text-lg font-bold text-center ${
                        assigning
                          ? 'text-gray-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Medications Modal */}
      <Modal
        visible={medicationsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMedicationsModalVisible(false)}
      >
        {Platform.OS === 'web' ? (
          <View className="flex-1 justify-center items-center bg-black/60">
            <Pressable 
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
              onPress={() => setMedicationsModalVisible(false)}
            />
            <View 
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl" 
              style={{ 
                maxHeight: '90%',
                maxWidth: 1200,
                width: '90%'
              }}
              onStartShouldSetResponder={() => true}
            >
              <View className="flex-row justify-between items-center mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                <View className="flex-row items-center">
                  <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-2 mr-3">
                    <Ionicons name="medical" size={24} color="#059669" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                    All Medications
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 ml-3">
                    ({medications.length})
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setMedicationsModalVisible(false)}
                  className="bg-gray-100 dark:bg-gray-700 rounded-full p-2"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1" style={{ maxHeight: 600 }}>
                {medicationsLoading ? (
                  <View className="items-center justify-center py-8">
                    <ActivityIndicator size="large" color="#059669" />
                    <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading medications...</Text>
                  </View>
                ) : medicationsError ? (
                  <View className="items-center justify-center py-8">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="text-red-500 text-center mt-4">{medicationsError}</Text>
                    <TouchableOpacity
                      onPress={fetchMedications}
                      className="bg-blue-500 px-4 py-2 rounded-xl mt-4"
                    >
                      <Text className="text-white font-semibold">Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : medications.length === 0 ? (
                  <View className="items-center justify-center py-8">
                    <Ionicons name="medical-outline" size={64} color="#9ca3af" />
                    <Text className="text-gray-500 dark:text-gray-400 text-lg font-semibold mt-4">
                      No medications found
                    </Text>
                  </View>
                ) : (
                  medications.map((med) => (
                    <View
                      key={med._id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 mb-3 border border-gray-200 dark:border-gray-600"
                    >
                      <View className="mb-2">
                        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          MEDICATION
                        </Text>
                        <Text className="text-lg font-bold text-gray-900 dark:text-white">
                          {med.name}
                        </Text>
                      </View>

                      <View className="flex-row items-center flex-wrap gap-2 border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name="flask-outline" size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                            {med.dosage}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="time-outline" size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                            {formatSchedule(med.schedule)}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                            {new Date(med.startDate).toLocaleDateString()}
                          </Text>
                        </View>
                        {med.prescribedBy && (
                          <View className="flex-row items-center">
                            <Ionicons name="person-outline" size={14} color="#6b7280" />
                            <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                              {med.prescribedBy.firstName} {med.prescribedBy.lastName}
                            </Text>
                          </View>
                        )}
                      </View>

                      {med.instructions && (
                        <Text className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {med.instructions}
                        </Text>
                      )}

                      <View className="flex-row justify-end gap-2 mt-2">
                        <TouchableOpacity
                          onPress={() => handleEditMedication(med)}
                          className="bg-blue-500 px-3 py-1.5 rounded-lg flex-row items-center"
                        >
                          <Ionicons name="create-outline" size={14} color="#fff" />
                          <Text className="text-white font-semibold ml-1 text-xs">Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteMedication(med._id)}
                          className="bg-red-600 px-3 py-1.5 rounded-lg flex-row items-center"
                        >
                          <Ionicons name="trash-outline" size={14} color="#fff" />
                          <Text className="text-white font-semibold ml-1 text-xs">Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-end bg-black/60">
            <View 
              className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 shadow-2xl" 
              style={{ height: '90%' }}
            >
              <View className="flex-row justify-between items-center mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                <View className="flex-row items-center">
                  <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-2 mr-3">
                    <Ionicons name="medical" size={24} color="#059669" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                    All Medications
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setMedicationsModalVisible(false)}
                  className="bg-gray-100 dark:bg-gray-700 rounded-full p-2"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1">
                {medicationsLoading ? (
                  <View className="items-center justify-center py-8">
                    <ActivityIndicator size="large" color="#059669" />
                    <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading medications...</Text>
                  </View>
                ) : medicationsError ? (
                  <View className="items-center justify-center py-8">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="text-red-500 text-center mt-4">{medicationsError}</Text>
                    <TouchableOpacity
                      onPress={fetchMedications}
                      className="bg-blue-500 px-4 py-2 rounded-xl mt-4"
                    >
                      <Text className="text-white font-semibold">Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : medications.length === 0 ? (
                  <View className="items-center justify-center py-8">
                    <Ionicons name="medical-outline" size={64} color="#9ca3af" />
                    <Text className="text-gray-500 dark:text-gray-400 text-lg font-semibold mt-4">
                      No medications found
                    </Text>
                  </View>
                ) : (
                  medications.map((med) => (
                    <View
                      key={med._id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 mb-3 border border-gray-200 dark:border-gray-600"
                    >
                      <View className="mb-2">
                        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          MEDICATION
                        </Text>
                        <Text className="text-lg font-bold text-gray-900 dark:text-white">
                          {med.name}
                        </Text>
                      </View>

                      <View className="flex-row items-center flex-wrap gap-2 border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name="flask-outline" size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                            {med.dosage}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="time-outline" size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                            {formatSchedule(med.schedule)}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                            {new Date(med.startDate).toLocaleDateString()}
                          </Text>
                        </View>
                        {med.prescribedBy && (
                          <View className="flex-row items-center">
                            <Ionicons name="person-outline" size={14} color="#6b7280" />
                            <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                              {med.prescribedBy.firstName} {med.prescribedBy.lastName}
                            </Text>
                          </View>
                        )}
                      </View>

                      {med.instructions && (
                        <Text className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {med.instructions}
                        </Text>
                      )}

                      <View className="flex-row justify-end gap-2 mt-2">
                        <TouchableOpacity
                          onPress={() => handleEditMedication(med)}
                          className="bg-blue-500 px-3 py-1.5 rounded-lg flex-row items-center"
                        >
                          <Ionicons name="create-outline" size={14} color="#fff" />
                          <Text className="text-white font-semibold ml-1 text-xs">Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteMedication(med._id)}
                          className="bg-red-600 px-3 py-1.5 rounded-lg flex-row items-center"
                        >
                          <Ionicons name="trash-outline" size={14} color="#fff" />
                          <Text className="text-white font-semibold ml-1 text-xs">Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      {/* Edit Medication Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        {Platform.OS === 'web' ? (
          <View className="flex-1 justify-center items-center bg-black/60">
            <Pressable 
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
              onPress={() => setEditModalVisible(false)}
            />
            <View 
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl" 
              style={{ 
                maxHeight: '90%',
                maxWidth: 800,
                width: '90%'
              }}
              onStartShouldSetResponder={() => true}
            >
              <View className="flex-row justify-between items-center mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                  Edit Medication
                </Text>
                <TouchableOpacity 
                  onPress={() => setEditModalVisible(false)}
                  className="bg-gray-100 dark:bg-gray-700 rounded-full p-2"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1" style={{ maxHeight: 600 }}>
                <View className="bg-gray-50 dark:bg-gray-700 p-5 rounded-2xl">
                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mb-2">Name *</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">Dosage *</Text>
                  <TextInput
                    value={editDosage}
                    onChangeText={setEditDosage}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Frequency * (tap to select)
                  </Text>
                  <View className="flex-row flex-wrap mt-1">
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setEditFrequency(opt.value)}
                        className={`px-3 py-2 mr-2 mb-2 rounded-full border ${
                          editFrequency === opt.value
                            ? 'bg-blue-600 border-blue-700'
                            : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            editFrequency === opt.value
                              ? 'text-white'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Schedule * (comma-separated times)
                  </Text>
                  <TextInput
                    value={editScheduleText}
                    onChangeText={setEditScheduleText}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                    placeholder="e.g., 08:00, 20:00"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">Start Date *</Text>
                  <TextInput
                    value={editStartDate}
                    onChangeText={setEditStartDate}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">End Date</Text>
                  <TextInput
                    value={editEndDate}
                    onChangeText={setEditEndDate}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                    placeholder="YYYY-MM-DD (optional)"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">Instructions</Text>
                  <TextInput
                    value={editInstructions}
                    onChangeText={setEditInstructions}
                    multiline
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16, minHeight: 80 }}
                    placeholder="Optional instructions..."
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View className="flex-row gap-3 mt-6">
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={editSaving}
                    className={`flex-1 px-6 py-4 rounded-2xl ${
                      editSaving ? 'bg-blue-300' : 'bg-blue-600'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-lg font-bold text-center">
                      {editSaving ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    disabled={editSaving}
                    className="flex-1 px-6 py-4 rounded-2xl bg-gray-500"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-lg font-bold text-center">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-end bg-black/60">
            <View 
              className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 shadow-2xl" 
              style={{ height: '90%' }}
            >
              <View className="flex-row justify-between items-center mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                  Edit Medication
                </Text>
                <TouchableOpacity 
                  onPress={() => setEditModalVisible(false)}
                  className="bg-gray-100 dark:bg-gray-700 rounded-full p-2"
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1">
                <View className="bg-gray-50 dark:bg-gray-700 p-5 rounded-2xl">
                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mb-2">Name *</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">Dosage *</Text>
                  <TextInput
                    value={editDosage}
                    onChangeText={setEditDosage}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Frequency * (tap to select)
                  </Text>
                  <View className="flex-row flex-wrap mt-1">
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setEditFrequency(opt.value)}
                        className={`px-3 py-2 mr-2 mb-2 rounded-full border ${
                          editFrequency === opt.value
                            ? 'bg-blue-600 border-blue-700'
                            : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            editFrequency === opt.value
                              ? 'text-white'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">
                    Schedule * (comma-separated times)
                  </Text>
                  <TextInput
                    value={editScheduleText}
                    onChangeText={setEditScheduleText}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                    placeholder="e.g., 08:00, 20:00"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">Start Date *</Text>
                  <TextInput
                    value={editStartDate}
                    onChangeText={setEditStartDate}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">End Date</Text>
                  <TextInput
                    value={editEndDate}
                    onChangeText={setEditEndDate}
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16 }}
                    placeholder="YYYY-MM-DD (optional)"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4 mb-2">Instructions</Text>
                  <TextInput
                    value={editInstructions}
                    onChangeText={setEditInstructions}
                    multiline
                    className="bg-white dark:bg-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-500"
                    style={{ fontSize: 16, minHeight: 80 }}
                    placeholder="Optional instructions..."
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View className="flex-row gap-3 mt-6">
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={editSaving}
                    className={`flex-1 px-6 py-4 rounded-2xl ${
                      editSaving ? 'bg-blue-300' : 'bg-blue-600'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-lg font-bold text-center">
                      {editSaving ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    disabled={editSaving}
                    className="flex-1 px-6 py-4 rounded-2xl bg-gray-500"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-lg font-bold text-center">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon?: string;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <View 
      className="rounded-2xl p-4 min-w-[110px] shadow-md border dark:bg-gray-700 dark:border-gray-600"
      style={{ 
        backgroundColor: '#f9fafb',
        borderColor: '#e5e7eb'
      }}
    >
      {icon && (
        <View className="mb-2">
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
      )}
      <Text className="text-2xl font-bold mb-1" style={{ color }}>
        {value}
      </Text>
      <Text className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-tight">
        {label}
      </Text>
    </View>
  );
}

interface ActionButtonProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  color: string;
  gradient?: string[];
}

function ActionButton({
  icon,
  title,
  description,
  onPress,
  color,
  gradient,
}: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="flex-1 min-w-[140px] bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg border border-gray-100 dark:border-gray-700"
    >
      <View>
        <View
          className="w-14 h-14 rounded-2xl items-center justify-center mb-3 shadow-sm"
          style={{ backgroundColor: `${color}15` }}
        >
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          {title}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </Text>
        <View className="flex-row items-center mt-3">
          <Text className="text-xs font-semibold" style={{ color }}>
            Open
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={color}
            style={{ marginLeft: 4 }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
