import { useAppTheme } from '@/contexts/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  const { isDark } = useAppTheme();
  return isDark ? 'dark' : 'light';
}
