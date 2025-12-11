import React from 'react';
import renderer, { act } from 'react-test-renderer';
import PatientHome from '../(patient)/PatientHome';

// Mock dependencies
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('fake-token')),
}));
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { API_URL: 'http://mock-api' } },
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));
jest.mock('react-native-calendars', () => ({
  Calendar: () => null,
}));
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));
jest.mock('@/utils/notifications', () => ({
  scheduleAllMedicationReminders: jest.fn(),
  registerForPushNotificationsAsync: jest.fn(),
}));
jest.mock('@/components/ProvidersCard', () => () => null);
jest.mock('@/components/PatientNavbar', () => () => null);

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
);

it('renders PatientHome correctly', async () => {
  let tree;

  await act(async () => {
    tree = renderer.create(<PatientHome />);
  });

  // Snapshotting this screen produces an extremely large tree (and can crash Jest's serializer).
  // This test is intended as a smoke test: ensure it renders without throwing.
  expect(tree.toJSON()).toBeTruthy();
  await act(async () => {
    tree.unmount();
  });
});
