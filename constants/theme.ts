/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export type AppTheme = {
  isDark: boolean;
  gradient: string[];
  background: string;
  overlay: string;
  cardBackground: string;
  cardBorder: string;
  cardShadow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverted: string;
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  inputBackground: string;
  inputBorder: string;
  placeholder: string;
  tagBackground: string;
  fabBackground: string;
  fabShadow: string;
  modalBackground: string;
};

export const getThemeConfig = (isDark: boolean): AppTheme => {
  if (isDark) {
    return {
      isDark: true,
      gradient: ['#0F172A', '#1F2937', '#0F172A'],
      background: '#0B1120',
      overlay: 'rgba(0, 0, 0, 0.65)',
      cardBackground: '#1F2937',
      cardBorder: '#334155',
      cardShadow: '#000000',
      textPrimary: '#F8FAFC',
      textSecondary: '#CBD5F5',
      textMuted: '#94A3B8',
      textInverted: '#F8FAFC',
      accent: '#60A5FA',
      accentSoft: 'rgba(96, 165, 250, 0.2)',
      success: '#34D399',
      danger: '#F87171',
      warning: '#FBBF24',
      info: '#38BDF8',
      inputBackground: '#111827',
      inputBorder: '#1E293B',
      placeholder: '#64748B',
      tagBackground: '#1E293B',
      fabBackground: '#2563EB',
      fabShadow: '#1E40AF',
      modalBackground: '#111827',
    };
  }

  return {
    isDark: false,
    gradient: ['#667eea', '#764ba2', '#f093fb'],
    background: '#FFFFFF',
    overlay: 'rgba(15, 23, 42, 0.25)',
    cardBackground: '#FFFFFF',
    cardBorder: '#E2E8F0',
    cardShadow: '#000000',
    textPrimary: '#1F2933',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    textInverted: '#FFFFFF',
    accent: '#4A90E2',
    accentSoft: 'rgba(74, 144, 226, 0.15)',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#2563EB',
    inputBackground: '#F8FAFC',
    inputBorder: '#E2E8F0',
    placeholder: '#94A3B8',
    tagBackground: '#F3F4F6',
    fabBackground: '#2563EB',
    fabShadow: '#1D4ED8',
    modalBackground: '#FFFFFF',
  };
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});