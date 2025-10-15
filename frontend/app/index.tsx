import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f172a",
        paddingHorizontal: 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        Login Page
      </Text>

      <Pressable
        onPress={() => router.push("/AdminHome")}
        style={{
          backgroundColor: "#3b82f6",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
          marginBottom: 12,
          width: "80%",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
          Admin Home
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/HealthcareProviderHome")}
        style={{
          backgroundColor: "#10b981",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
          marginBottom: 12,
          width: "80%",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
          Healthcare Provider Home
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/PatientHome")}
        style={{
          backgroundColor: "#f59e0b",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
          width: "80%",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
          Patient Home
        </Text>
      </Pressable>
    </View>
  );
}


// import { View, Text, Pressable } from "react-native";

// export default function Index() {
//   return (
//     <View className="flex-1 items-center justify-center bg-slate-900">
//       <Text className="text-white text-3xl font-bold mb-6">
//         Tailwind is active 🎉
//       </Text>

//       <Pressable className="bg-blue-500 px-4 py-2 rounded-lg">
//         <Text className="text-white font-semibold">Press me</Text>
//       </Pressable>
//     </View>
//   );
// }
