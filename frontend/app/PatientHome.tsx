import React from "react";
import { Text, View } from "react-native";

export default function PatientHome() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#78350f", // bg-amber-900
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
        }}
      >
        Patient Home
      </Text>
    </View>
  );
}
