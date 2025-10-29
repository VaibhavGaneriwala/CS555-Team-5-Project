import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleLogin = async () => {
    // Validation for empty fields
    if (!email || !password) {
      setValidationError('Please fill out all fields before proceeding.');
      return;
    } else {
      setValidationError('');
    }

    try {
      // Make the POST request to the backend to log in
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({email, password})
      });

      const data = await response.json();
      // Validate the response
      if (!response.ok) {
        setValidationError('Invalid credentials!');
        return;
      } else {
        setValidationError('');
      }
      // Save the token for middlware validation in the future
      await AsyncStorage.setItem('token', data.token);

      // Redirect based on the role
      if (data.role === 'admin') {
        router.push('/(admin)/AdminHome');
      } else if (data.role === 'provider') {
        router.push('/(provider)/ProviderHome');
      } else {
        router.push('/(patient)/PatientHome');
      }
    } catch (error) {
      Alert.alert('Login error');
      return;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 justify-center items-center px-6 bg-white dark:bg-gray-900 transition-colors duration-300"
    >
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-white">
          Welcome
        </Text>

        {/* Username Input */}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          className="w-full mb-4 rounded-xl px-4 py-3 shadow-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white transition-colors duration-300"
        />

        {/* Password Input */}
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          className="w-full mb-6 rounded-xl px-4 py-3 shadow-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white transition-colors duration-300"
        />

        {validationError ? (
          <Text className="text-red-500 text-center mb-4">{validationError}</Text>
        ) : null}

        {/* Login Button */}
        <TouchableOpacity
          onPress={handleLogin}
          activeOpacity={0.8}
          className="w-full bg-blue-500 py-3 rounded-xl"
        >
          <Text className="text-white text-center text-lg font-semibold">
            Log In
          </Text>
        </TouchableOpacity>
        <Text className="text-gray-800 dark:text-white text-center text-base font-normal mt-4">
          Don't have an account?
        </Text>
        <View className="flex justify-center items-center flex-row">
          <Text className="text-gray-800 dark:text-white text-center text-base font-normal">
            Register for one{' '}
          </Text>
          <Text
            onPress={() => router.push('/Register')}
            className="text-blue-400 text-center text-base font-normal"
          >
            here
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
