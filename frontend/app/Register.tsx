import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { Dropdown } from 'react-native-element-dropdown';

export default function LoginScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  
  const [isFocus, setIsFocus] = useState(false);

  const roleDropdown = [
    { label: 'Admin', value: 'admin' },
    { label: 'Patient', value: 'patient' },
    { label: 'Provider', value: 'provider' },
  ];

  const handleRegister = async () => {
    // Validation for empty fields
    if (!firstName || !lastName || !role || !email || !password) {
      setValidationError('Please fill out all fields before proceeding.');
      return;
    } else {
      setValidationError('');
    }

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // router.push() can be customized based on role
      router.push('/(patient)/PatientHome');
    } catch (error) {
      console.error('Login error', error);
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

        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First Name"
          placeholderTextColor="#9CA3AF"
          className="w-full mb-4 rounded-xl px-4 py-3 shadow-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white transition-colors duration-300"
        />

        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last Name"
          placeholderTextColor="#9CA3AF"
          className="w-full mb-4 rounded-xl px-4 py-3 shadow-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white transition-colors duration-300"
        />

        <View className="w-full mb-4 rounded-xl px-4 py-3 shadow-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white transition-colors duration-300">
          <Dropdown
            style={[
              { borderWidth: 1, borderColor: isFocus ? '#3b82f6' : '#e5e7eb' },
            ]}
            data={roleDropdown}
            labelField="label"
            valueField="value"
            placeholder={!isFocus ? 'Select Role' : '...'}
            value={role}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={item => {
              setRole(item.value);
              setIsFocus(false);
            }}
          />
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          className="w-full mb-4 rounded-xl px-4 py-3 shadow-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white transition-colors duration-300"
        />

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

        <TouchableOpacity
          onPress={handleRegister}
          activeOpacity={0.8}
          className="w-full bg-blue-500 py-3 rounded-xl"
        >
          <Text className="text-white text-center text-lg font-semibold">
            Register
          </Text>
        </TouchableOpacity>

        <Text className="text-gray-800 dark:text-white text-center text-base font-normal mt-4">
          Already have an account?
        </Text>
        <View className="flex justify-center items-center flex-row">
          <Text className="text-gray-800 dark:text-white text-center text-base font-normal">
            Log in{' '}
          </Text>
          <Text
            onPress={() => router.push('/')}
            className="text-blue-400 text-center text-base font-normal"
          >
            here
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
