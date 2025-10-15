import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Pressable, Text, View } from "react-native";

export default function Index() {
  const navigation = useNavigation();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f172a", // bg-slate-900
        paddingHorizontal: 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 24, // text-3xl
          fontWeight: "bold",
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        Login Page
      </Text>

      {/* Admin Home Button */}
      <Pressable
        onPress={() => navigation.navigate("AdminHome")}
        style={{
          backgroundColor: "#3b82f6", // bg-blue-500
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

      {/* Healthcare Provider Home Button */}
      <Pressable
        onPress={() => navigation.navigate("HealthcareProviderHome")}
        style={{
          backgroundColor: "#10b981", // bg-green-500
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

      {/* Patient Home Button */}
      <Pressable
        onPress={() => navigation.navigate("PatientHome")}
        style={{
          backgroundColor: "#f59e0b", // bg-yellow-500
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
