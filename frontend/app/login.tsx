import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/utils/apiConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const params = useLocalSearchParams();

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.role === 'admin') {
              router.replace('/(admin)/AdminHome');
            } else if (data.role === 'provider') {
              router.replace('/(provider)/ProviderHome');
            } else {
              router.replace('/(patient)/PatientHome');
            }
            return;
          } else {
            await AsyncStorage.removeItem('token');
          }
        }
      } catch (error: any) {
        await AsyncStorage.removeItem('token');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, []);

  useEffect(() => {
    if (params.error) {
      setValidationError(params.error as string);
    }
  }, [params.error]);

  const handleLogin = async () => {
    // Validation for empty fields
    if (!email || !password) {
      setValidationError('Please fill out all fields before proceeding.');
      return;
    } else {
      setValidationError('');
    }

    setLoading(true);
    try {
      console.log('Attempting login to:', `${API_URL}/api/auth/login`);
      console.log('Platform:', Platform.OS);
      console.log('Final API_URL:', API_URL);
      
      // Make the POST request to the backend to log in
      // Note: AbortController may not be fully supported in React Native, so we'll use a Promise-based timeout instead
      const fetchPromise = fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({email, password})
      });
      
      // Add timeout using Promise.race (more compatible with React Native)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout: Server did not respond within 10 seconds')), 10000)
      );
      
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      const data = await response.json();
      if (!response.ok) {
        setValidationError(data.message || 'Invalid credentials!');
        setLoading(false);
        return;
      } else {
        setValidationError('');
      }
      // Save the token for middlware validation in the future
      await AsyncStorage.setItem('token', data.token);

      // Redirect based on the role (use replace to prevent going back to login)
      if (data.role === 'admin') {
        router.replace('/(admin)/AdminHome');
      } else if (data.role === 'provider') {
        router.replace('/(provider)/ProviderHome');
      } else {
        router.replace('/(patient)/PatientHome');
      }
    } catch (error: any) {
      setLoading(false);
      
      let errorMessage = 'Unable to connect to the server.';
      
      if (error.message?.includes('timeout') || error.message?.includes('Request timeout')) {
        errorMessage = `Request timed out. Server at ${API_URL} is not responding.\n\nPlease check:\n1. Backend server is running\n2. Correct IP address is configured\n3. Firewall allows connections on port 3000\n4. Device and computer are on same network`;
      } else if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        errorMessage = `Cannot connect to server at ${API_URL}.\n\nOn mobile, make sure:\n1. Your device and computer are on the same Wi-Fi network\n2. The backend server is running and listening on 0.0.0.0:3000\n3. API_URL is set to your computer's IP (not localhost)\n\nCurrent API_URL: ${API_URL}`;
      } else if (error.message) {
        errorMessage = `Connection error: ${error.message}\n\nTrying to connect to: ${API_URL}`;
      }
      
      Alert.alert('Login Error', errorMessage);
      setValidationError(errorMessage);
      return;
    }
  };

  if (checkingAuth) {
    return (
      <SafeAreaView className="flex-1 bg-blue-50 dark:bg-gray-900" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center items-center">
          <View className="bg-blue-500 dark:bg-blue-600 rounded-3xl p-6 mb-4 shadow-2xl">
            <Ionicons name="shield-checkmark" size={48} color="#fff" />
          </View>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400 text-base">
            Checking authentication...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-50 dark:bg-gray-900" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center items-center px-6 py-12">
          {/* Logo/Icon Section */}
          <View className="mb-8 items-center">
            <View className="bg-blue-500 dark:bg-blue-600 rounded-3xl p-6 mb-4 shadow-2xl">
              <Ionicons name="shield-checkmark" size={48} color="#fff" />
            </View>
            <Text className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
              Welcome Back
            </Text>
            <Text className="text-base text-gray-600 dark:text-gray-400 text-center">
              Sign in to continue to your account
            </Text>
          </View>

          <View className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-gray-700">
            {validationError ? (
              <View className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex-row items-center">
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text className="text-red-600 dark:text-red-400 ml-2 flex-1 text-sm">
                  {validationError}
                </Text>
              </View>
            ) : null}

            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </Text>
              <View className="relative">
                <View 
                  className="absolute left-4 z-10"
                  style={{ top: 16, height: 20 }}
                >
                  <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                </View>
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setValidationError('');
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="w-full rounded-xl px-12 py-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                  style={{ fontSize: 16 }}
                />
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password
              </Text>
              <View className="relative">
                <View 
                  className="absolute left-4 z-10"
                  style={{ top: 16, height: 20 }}
                >
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                </View>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setValidationError('');
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="w-full rounded-xl px-12 py-4 pr-12 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                  style={{ fontSize: 16 }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 z-10 p-2"
                  style={{ top: 8 }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              className="w-full py-4 rounded-xl shadow-lg mb-6"
              style={{
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white text-center text-lg font-semibold ml-2">
                    Signing in...
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center justify-center">
                  <Text className="text-white text-center text-lg font-semibold mr-2">
                    Sign In
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View className="flex-row justify-center items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <Text className="text-gray-600 dark:text-gray-400 text-base">
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/Register')}
                activeOpacity={0.7}
              >
                <Text className="text-blue-500 dark:text-blue-400 text-base font-semibold">
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-8 items-center">
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Secure login with encrypted authentication
            </Text>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
