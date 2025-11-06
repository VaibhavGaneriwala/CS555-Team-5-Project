import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const BASE_URL = 'http://10.156.155.13:3000'; // your backend IP

interface Patient {
  _id: string;
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  adherence: string | number;
}

export default function ViewPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  // Fetch assigned patients
  const fetchPatients = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/provider/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to fetch patients');
      } else {
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // Assign new patient by email
  const assignPatient = async () => {
    if (!patientEmail.trim()) {
      setAssignMessage('⚠️ Please enter a valid Patient Email.');
      return;
    }

    setAssigning(true);
    setAssignMessage(null);

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/provider/assign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: patientEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAssignMessage(data.message || '❌ Invalid email or patient not found.');
      } else {
        setAssignMessage('✅ Patient assigned successfully!');
        setPatientEmail('');
        fetchPatients();
        setTimeout(() => {
          setAssignMessage(null);
          setModalVisible(false);
        }, 1200);
      }
    } catch (err) {
      console.error('Error assigning patient:', err);
      setAssignMessage('⚠️ Could not connect to server.');
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-3 text-gray-600 dark:text-gray-300">Loading Patients...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
        <Text className="text-red-500 text-lg font-semibold mb-3 text-center">{error}</Text>
        <TouchableOpacity
          onPress={fetchPatients}
          className="bg-blue-500 px-6 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 px-4 pt-10 pb-6">
      <Text className="text-3xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        Assigned Patients
      </Text>

      {patients.length === 0 ? (
        <Text className="text-center text-gray-600 dark:text-gray-300 mt-8">
          No patients assigned yet.
        </Text>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="bg-gray-100 dark:bg-gray-800 p-4 mb-3 rounded-2xl shadow">
              <Text className="text-xl font-semibold text-gray-900 dark:text-white">
                {item.name}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">Email: {item.email}</Text>
              <Text className="text-gray-700 dark:text-gray-300">Gender: {item.gender}</Text>
              <Text className="text-gray-700 dark:text-gray-300">
                DOB: {new Date(item.dateOfBirth).toLocaleDateString()}
              </Text>
              <Text className="text-blue-600 dark:text-blue-400 font-semibold mt-1">
                Adherence: {item.adherence === 'N/A' ? 'N/A' : `${item.adherence}%`}
              </Text>
            </View>
          )}
        />
      )}

      {/* Assign Patient Button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
        className="bg-green-500 px-6 py-3 rounded-xl mt-4"
      >
        <Text className="text-white text-lg font-semibold text-center">Assign New Patient</Text>
      </TouchableOpacity>

      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.push('/(provider)/ProviderHome')}
        activeOpacity={0.8}
        className="bg-blue-500 px-6 py-3 rounded-xl mt-3"
      >
        <Text className="text-white text-lg font-semibold text-center">Back to Provider Home</Text>
      </TouchableOpacity>

      {/* Assign Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/40 px-6">
          <View className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-md">
            <Text className="text-2xl font-bold mb-4 text-gray-800 dark:text-white text-center">
              Assign Patient
            </Text>

            <TextInput
              placeholder="Enter Patient Email"
              placeholderTextColor="#aaa"
              value={patientEmail}
              onChangeText={setPatientEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white rounded-xl px-4 py-3 mb-4"
            />

            {assigning ? (
              <View className="items-center mb-2">
                <ActivityIndicator size="small" color="#2563eb" />
                <Text className="mt-2 text-gray-500 dark:text-gray-300">Assigning...</Text>
              </View>
            ) : assignMessage ? (
              <Text
                className={`text-center mb-3 font-semibold ${
                  assignMessage.includes('✅')
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                {assignMessage}
              </Text>
            ) : null}

            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={assignPatient}
                disabled={assigning}
                className={`px-6 py-3 rounded-xl flex-1 mr-2 ${
                  assigning ? 'bg-green-300' : 'bg-green-500'
                }`}
              >
                <Text className="text-white text-lg font-semibold text-center">
                  {assigning ? 'Assigning...' : 'Assign'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                disabled={assigning}
                className={`px-6 py-3 rounded-xl flex-1 ml-2 ${
                  assigning ? 'bg-red-300' : 'bg-red-500'
                }`}
              >
                <Text className="text-white text-lg font-semibold text-center">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
