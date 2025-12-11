import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ProviderNavbar from '@/components/ProviderNavbar';
import { API_URL } from '@/utils/apiConfig';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth: string;
  gender: string;
  address?: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  instructions?: string;
}

interface AdherenceSummary {
  total: number;
  taken: number;
  missed: number;
  adherenceRate: number;
}

export default function ViewPatient() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [adherence, setAdherence] = useState<AdherenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication token missing');
        setLoading(false);
        return;
      }

      // Fetch patient details
      const patientRes = await fetch(`${API_URL}/api/provider/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const patientData = await patientRes.json();
      if (!patientRes.ok) {
        setError(patientData.message || 'Failed to fetch patient');
        setLoading(false);
        return;
      }

      const foundPatient = patientData.patients?.find(
        (p: any) => p._id === patientId
      );

      if (!foundPatient) {
        // Try to fetch directly from users endpoint if not in assigned patients
        try {
          const userRes = await fetch(`${API_URL}/api/auth/users`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          const usersData = await userRes.json();
          const allPatients = usersData.users?.filter(
            (u: any) => u.role === 'patient' && u._id === patientId
          );
          if (allPatients && allPatients.length > 0) {
            const p = allPatients[0];
            setPatient({
              _id: p._id,
              firstName: p.firstName,
              lastName: p.lastName,
              email: p.email,
              phoneNumber: p.phoneNumber,
              dateOfBirth: p.dateOfBirth,
              gender: p.gender,
              address: p.address,
            });
          } else {
            setError('Patient not found');
            setLoading(false);
            return;
          }
        } catch {
          setError('Patient not found');
          setLoading(false);
          return;
        }
      } else {
        // Fetch full patient details
        try {
          const userRes = await fetch(`${API_URL}/api/auth/users`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          const usersData = await userRes.json();
          const fullPatient = usersData.users?.find(
            (u: any) => u._id === patientId
          );
          if (fullPatient) {
            setPatient({
              _id: fullPatient._id,
              firstName: fullPatient.firstName,
              lastName: fullPatient.lastName,
              email: fullPatient.email,
              phoneNumber: fullPatient.phoneNumber,
              dateOfBirth: fullPatient.dateOfBirth,
              gender: fullPatient.gender,
              address: fullPatient.address,
            });
          } else {
            setPatient({
              _id: foundPatient._id,
              firstName: foundPatient.name?.split(' ')[0] || '',
              lastName: foundPatient.name?.split(' ').slice(1).join(' ') || '',
              email: foundPatient.email,
              phoneNumber: '',
              dateOfBirth: foundPatient.dateOfBirth,
              gender: foundPatient.gender,
            });
          }
        } catch {
          setPatient({
            _id: foundPatient._id,
            firstName: foundPatient.name?.split(' ')[0] || '',
            lastName: foundPatient.name?.split(' ').slice(1).join(' ') || '',
            email: foundPatient.email,
            phoneNumber: '',
            dateOfBirth: foundPatient.dateOfBirth,
            gender: foundPatient.gender,
          });
        }
      }

      // Fetch medications
      const medRes = await fetch(`${API_URL}/api/medications?patientId=${patientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const medData = await medRes.json();
      setMedications(Array.isArray(medData) ? medData : []);

      // Fetch adherence summary
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const logsRes = await fetch(
        `${API_URL}/api/adherence?patientId=${patientId}&startDate=${thirtyDaysAgo.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const logsData = await logsRes.json();
      const logs = Array.isArray(logsData) ? logsData : [];

      const total = logs.length;
      const taken = logs.filter((l: any) => l.status === 'taken').length;
      const missed = logs.filter((l: any) => l.status === 'missed').length;
      const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

      setAdherence({ total, taken, missed, adherenceRate });
    } catch (err) {
      console.error('Error fetching patient data:', err);
      setError('Unable to fetch patient data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-gray-700 dark:text-gray-300">
          Loading patient details...
        </Text>
      </View>
    );
  }

  if (error || !patient) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <ProviderNavbar />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text className="text-red-500 text-lg font-semibold mb-3 text-center mt-4">
            {error || 'Patient not found'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-500 px-6 py-3 rounded-xl flex-row items-center"
          >
            <Ionicons name="arrow-back" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white text-lg font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ProviderNavbar />
      <ScrollView className="flex-1 px-4 pt-6 pb-8">
        {/* Header with Back Button */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="flex-row items-center mb-4"
          >
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
            <Text className="text-blue-600 dark:text-blue-400 font-semibold ml-2 text-base">
              Back
            </Text>
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Patient Details
          </Text>
          <Text className="text-gray-600 dark:text-gray-400">
            Complete patient information and health data
          </Text>
        </View>

      {/* Patient Profile Card */}
      <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center mb-4">
          <View className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-3 mr-3">
            <Ionicons name="person-circle" size={28} color="#2563eb" />
          </View>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {patient.firstName} {patient.lastName}
          </Text>
        </View>

        <View className="space-y-3">
          <View className="flex-row items-center">
            <Ionicons name="mail-outline" size={18} color="#6b7280" />
            <Text className="text-gray-700 dark:text-gray-300 ml-3">
              {patient.email}
            </Text>
          </View>

          {patient.phoneNumber && (
            <View className="flex-row items-center">
              <Ionicons name="call-outline" size={18} color="#6b7280" />
              <Text className="text-gray-700 dark:text-gray-300 ml-3">
                {patient.phoneNumber}
              </Text>
            </View>
          )}

          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            <Text className="text-gray-700 dark:text-gray-300 ml-3">
              {new Date(patient.dateOfBirth).toLocaleDateString()} 
              {` (Age: ${calculateAge(patient.dateOfBirth)})`}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="person-outline" size={18} color="#6b7280" />
            <Text className="text-gray-700 dark:text-gray-300 ml-3 capitalize">
              {patient.gender}
            </Text>
          </View>

          {patient.address && (
            <View className="flex-row items-start">
              <Ionicons name="location-outline" size={18} color="#6b7280" style={{ marginTop: 2 }} />
              <Text className="text-gray-700 dark:text-gray-300 ml-3 flex-1">
                {patient.address.streetAddress}, {patient.address.city}, {patient.address.state} {patient.address.zipcode}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Adherence Summary */}
      {adherence && (
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center mb-4">
            <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 mr-3">
              <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Adherence Summary (Last 30 Days)
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-4">
            <View className="flex-1 min-w-[140px]">
              <Text className="text-2xl font-bold mb-1" style={{ color: '#16a34a' }}>
                {adherence.adherenceRate}%
              </Text>
              <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Adherence Rate
              </Text>
            </View>
            <View className="flex-1 min-w-[140px]">
              <Text className="text-2xl font-bold mb-1" style={{ color: '#2563eb' }}>
                {adherence.taken}
              </Text>
              <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Taken
              </Text>
            </View>
            <View className="flex-1 min-w-[140px]">
              <Text className="text-2xl font-bold mb-1" style={{ color: '#dc2626' }}>
                {adherence.missed}
              </Text>
              <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Missed
              </Text>
            </View>
            <View className="flex-1 min-w-[140px]">
              <Text className="text-2xl font-bold mb-1" style={{ color: '#7c3aed' }}>
                {adherence.total}
              </Text>
              <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Total Logs
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Medications */}
      <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className="bg-purple-100 dark:bg-purple-900/30 rounded-xl p-3 mr-3">
              <Ionicons name="medical" size={28} color="#7c3aed" />
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Medications ({medications.length})
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(provider)/ViewMedications',
                params: { patientId },
              })
            }
            className="bg-blue-500 px-4 py-2 rounded-xl"
          >
            <Text className="text-white text-sm font-semibold">View All</Text>
          </TouchableOpacity>
        </View>

        {medications.length === 0 ? (
          <Text className="text-gray-600 dark:text-gray-400 text-center py-4">
            No medications assigned
          </Text>
        ) : (
          <View className="space-y-3">
            {medications.slice(0, 3).map((med) => (
              <View
                key={med._id}
                className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600"
              >
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  {med.name}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {med.dosage} • {med.frequency}
                </Text>
                {med.instructions && (
                  <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    {med.instructions}
                  </Text>
                )}
              </View>
            ))}
            {medications.length > 3 && (
              <Text className="text-blue-600 dark:text-blue-400 text-center text-sm font-semibold">
                +{medications.length - 3} more medications
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View className="space-y-3">
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/(provider)/ViewMedications',
              params: { patientId },
            })
          }
          className="bg-blue-500 px-6 py-4 rounded-xl shadow-lg"
        >
          <Text className="text-white text-lg font-semibold text-center">
            View All Medications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/(provider)/ViewReports',
              params: { patientId },
            })
          }
          className="bg-green-500 px-6 py-4 rounded-xl shadow-lg"
        >
          <Text className="text-white text-lg font-semibold text-center">
            View Adherence Reports
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/(provider)/CreateMedication',
              params: { patientId },
            })
          }
          className="bg-purple-500 px-6 py-4 rounded-xl shadow-lg"
        >
          <Text className="text-white text-lg font-semibold text-center">
            Add New Medication
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-gray-500 px-6 py-4 rounded-xl shadow-lg flex-row items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text className="text-white text-lg font-semibold">
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
}
