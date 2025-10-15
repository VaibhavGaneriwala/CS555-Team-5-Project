import React from "react";
import { Text, View } from "react-native";

export default function AdminHome() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1e293b", // bg-slate-800
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
        }}
      >
        Admin Home
      </Text>
    </View>
  );
}
