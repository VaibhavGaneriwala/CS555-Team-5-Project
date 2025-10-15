import React from "react";
import { Text, View } from "react-native";

export default function HealthcareProviderHome() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#064e3b", // bg-emerald-900
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
        }}
      >
        Healthcare Provider Home
      </Text>
    </View>
  );
}
