import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'accessibility_darkMode';

interface ThemeContextType {
  isDark: boolean;
  setDarkMode: (value: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  setDarkMode: async () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'true') setIsDark(true);
    });
  }, []);

  const setDarkMode = async (value: boolean) => {
    setIsDark(value);
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  };

  return (
    <ThemeContext.Provider value={{ isDark, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
