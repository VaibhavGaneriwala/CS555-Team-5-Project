const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ensure .cjs files are supported (some NativeWind internals use them)
config.resolver.sourceExts.push("cjs");

module.exports = config;
