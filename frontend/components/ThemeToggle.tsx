// components/ThemeToggle.tsx
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, useColorScheme } from 'react-native';

type ThemeToggleProps = {
  onThemeChange?: (theme: 'light' | 'dark') => void;
};

const ThemeToggle: React.FC<ThemeToggleProps> = ({ onThemeChange }) => {
  const systemScheme = useColorScheme();
  const [manualScheme, setManualScheme] = useState<'light' | 'dark' | null>(null);
  const theme = manualScheme || systemScheme || 'light';
  const isDark = theme === 'dark';

  useEffect(() => {
    if (onThemeChange) onThemeChange(theme);
  }, [theme]);

  const toggleTheme = () => {
    setManualScheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      className={`py-2 px-4 rounded-xl border ${
        isDark ? 'border-gray-700' : 'border-gray-300'
      }`}
    >
      <Text
        className={`text-center font-medium ${
          isDark ? 'text-gray-300' : 'text-gray-700'
        }`}
      >
        Switch to {isDark ? 'Light' : 'Dark'} Mode
      </Text>
    </TouchableOpacity>
  );
};

export default ThemeToggle;
