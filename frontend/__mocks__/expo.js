// __mocks__/expo.js
module.exports = {
  __esModule: true,
  Constants: { manifest: { name: "mock-app" } },
  Linking: { openURL: jest.fn() },
  __ExpoImportMetaRegistry: {},
};
