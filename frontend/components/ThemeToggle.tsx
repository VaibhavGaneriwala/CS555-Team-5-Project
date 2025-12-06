import React from "react";
import { TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useColorScheme } from "nativewind";

type Props = {
  onThemeChange?: (theme: "light" | "dark") => void;
};

export default function ThemeToggle({ onThemeChange }: Props) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setColorScheme(newTheme);
    onThemeChange?.(newTheme);
  };

  return (
    <TouchableOpacity onPress={toggleTheme}>
      <Ionicons
        name={isDark ? "sunny-outline" : "moon-outline"}
        size={26}
        color={isDark ? "#fff" : "#000"}
      />
    </TouchableOpacity>
  );
}
