/**
 * CommunityScreen.tsx
 * Dedicated Community tab — wraps SocialSection for easy discovery.
 */

import React, { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { getThemeConfig } from '../../constants/theme';
import { BackgroundLogo } from '../components/BackgroundLogo';
import { useApp } from '../contexts/AppContext';
import { voiceManager } from '../utils/voiceCommandManager';
import SocialSection from '../../components/social/SocialSection';

const CommunityScreen = () => {
  const { state } = useApp();
  const isDark = state.accessibilitySettings.isDarkMode;
  const theme  = useMemo(() => getThemeConfig(isDark), [isDark]);
  const scale  = (n: number) => n;

  useEffect(() => {
    voiceManager.announceScreenChange('community');
  }, []);

  const ui = {
    bg:          theme.background,
    cardBg:      theme.cardBackground,
    accent:      theme.accent,
    subtext:     theme.textSecondary,
    divider:     theme.cardBorder,
    inputBg:     theme.inputBackground,
    inputBorder: theme.inputBorder,
    inputText:   theme.textPrimary,
  };

  return (
    <LinearGradient colors={theme.gradient as any} style={styles.container}>
      <BackgroundLogo />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Community</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Connect with others on a similar journey
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {state.user ? (
            <SocialSection
              userId={state.user.id}
              userName={state.user.name || state.user.email}
              ui={ui}
              scale={scale}
            />
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Please log in to access the community.
              </Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default CommunityScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe:      { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title:    { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  scroll:   { paddingHorizontal: 20, paddingTop: 8 },
  empty:    { alignItems: 'center', padding: 40 },
  emptyText:{ fontSize: 15, textAlign: 'center' },
});
