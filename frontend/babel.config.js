/** babel.config.js */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      "babel-preset-expo",   // includes React compiler + expo-router integration
      "nativewind/babel"     // 👈 enables className support
    ],
  };
};
