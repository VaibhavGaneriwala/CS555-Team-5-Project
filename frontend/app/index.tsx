import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    const trimmedUsername = username.trim().toLowerCase();

    // Simulated role-based navigation
    if (trimmedUsername === 'admin') {
      router.push('/(admin)/AdminHome');
    } else if (trimmedUsername === 'patient') {
      router.push('/(patient)/PatientHome');
    } else if (trimmedUsername === 'provider') {
      router.push('/(provider)/ProviderHome');
    } else {
      alert('Invalid username. Try "admin", "patient", or "provider".');
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
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
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
      </View>
    </KeyboardAvoidingView>
  );
}
