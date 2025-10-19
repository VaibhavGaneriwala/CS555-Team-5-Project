import React, { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type ThemeToggleProps = {
  onThemeChange?: (theme: 'light' | 'dark') => void;
};

const ThemeToggle: React.FC<ThemeToggleProps> = ({ onThemeChange }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const isDark = theme === 'dark';

  useEffect(() => {
    onThemeChange?.(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <TouchableOpacity onPress={toggleTheme}>
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={24}
        color={isDark ? '#fff' : '#000'}
      />
    </TouchableOpacity>
  );
};

export default ThemeToggle;
