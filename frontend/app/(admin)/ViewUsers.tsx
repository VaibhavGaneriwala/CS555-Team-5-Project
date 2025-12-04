import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'patient' | 'provider';
  // patients / provider arrays exist in schema, but we don't need them here
}

export default function ViewUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [patients, setPatients] = useState<User[]>([]);
  const [providers, setProviders] = useState<User[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  // ============================
  // Fetch all users (admin only)
  // ============================
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to fetch users.');
      } else {
        const allUsers: User[] = data.users || [];
        setUsers(allUsers);
        setPatients(allUsers.filter((u) => u.role === 'patient'));
        setProviders(allUsers.filter((u) => u.role === 'provider'));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ============================
  // Assign patient -> provider
  // ============================
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
        // Optional: refresh users if you later show relationships
        // await fetchUsers();
        setTimeout(() => {
          setAssignMessage(null);
          setModalVisible(false);
          setSelectedPatient(null);
          setSelectedProvider(null);
        }, 1200);
      }
    } catch (err) {
      console.error('Error assigning patient:', err);
      setAssignMessage('⚠️ Could not connect to server.');
    } finally {
      setAssigning(false);
    }
  };

  // ============================
  // Loading & Error states
  // ============================
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-2 text-gray-700 dark:text-gray-300">
          Loading users...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
        <Text className="text-red-500 text-lg font-semibold mb-3 text-center">
          {error}
        </Text>
        <TouchableOpacity
          onPress={fetchUsers}
          className="bg-blue-500 px-6 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold text-center">
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================
  // Main UI
  // ============================
  return (
    <View className="flex-1 bg-white dark:bg-gray-900 px-4 pt-10 pb-6">
      <Text className="text-3xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        User Management
      </Text>

      {/* User list */}
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View className="bg-gray-100 dark:bg-gray-800 p-4 mb-3 rounded-2xl shadow">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {item.firstName} {item.lastName}
            </Text>
            <Text className="text-gray-700 dark:text-gray-300">
              Email: {item.email}
            </Text>
            <Text className="text-gray-700 dark:text-gray-300">
              Role: {item.role}
            </Text>
          </View>
        )}
      />

      {/* Assign Patient button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
        className="bg-green-600 px-6 py-3 rounded-xl mt-4"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Assign Patient to Provider
        </Text>
      </TouchableOpacity>

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.push('/(admin)/AdminHome')}
        activeOpacity={0.8}
        className="bg-blue-500 px-6 py-3 rounded-xl mt-3"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Back to Admin Home
        </Text>
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

            {/* Patient list */}
            <Text className="font-semibold mb-2 text-gray-800 dark:text-white">
              Select Patient:
            </Text>
            <View className="bg-gray-100 dark:bg-gray-700 rounded-xl mb-4 p-2 max-h-40">
              <FlatList
                data={patients}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedPatient(item._id)}
                    className={`p-2 rounded ${
                      selectedPatient === item._id
                        ? 'bg-green-300 dark:bg-green-600'
                        : ''
                    }`}
                  >
                    <Text className="text-gray-900 dark:text-white">
                      {item.firstName} {item.lastName} ({item.email})
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Provider list */}
            <Text className="font-semibold mb-2 text-gray-800 dark:text-white">
              Select Provider:
            </Text>
            <View className="bg-gray-100 dark:bg-gray-700 rounded-xl mb-4 p-2 max-h-40">
              <FlatList
                data={providers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedProvider(item._id)}
                    className={`p-2 rounded ${
                      selectedProvider === item._id
                        ? 'bg-blue-300 dark:bg-blue-600'
                        : ''
                    }`}
                  >
                    <Text className="text-gray-900 dark:text-white">
                      {item.firstName} {item.lastName} ({item.email})
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Message */}
            {assignMessage ? (
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

            {/* Buttons */}
            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={handleAssign}
                disabled={assigning}
                className={`px-6 py-3 rounded-xl flex-1 mr-2 ${
                  assigning ? 'bg-green-300' : 'bg-green-600'
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
                  assigning ? 'bg-red-300' : 'bg-red-600'
                }`}
              >
                <Text className="text-white text-lg font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
