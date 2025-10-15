// Basic mocks to bypass Expo native internals
jest.mock("expo", () => ({
  // Mock only what your components use (you can add more later)
  __esModule: true,
  Constants: { manifest: { name: "mock-app" } },
  Linking: {
    openURL: jest.fn(),
  },
  // Avoid Winter runtime initialization
  __ExpoImportMetaRegistry: {},
}));

// Mock expo-router to prevent native navigation calls
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
