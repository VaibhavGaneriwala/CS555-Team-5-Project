import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      className="flex-1 items-center justify-center bg-blue-500"  
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text className="text-2xl font-bold text-white">
        Edit app/index.tsx to edit this screen.
      </Text>
    </View>
  );
}
