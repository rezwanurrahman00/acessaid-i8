import React, { useEffect, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as Speech from "expo-speech";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { apiService, UserSetting } from "@/services/api";
import {
  getTalkingPreference,
  setTalkingPreference,
  speakIfEnabled,
  stopSpeech,
  setAccessibilitySetting,
} from "@/services/ttsService";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { useAppTheme } from "@/contexts/ThemeContext";

type LocalSettings = {
  voice_speed: number;
  high_contrast: boolean;
  large_text: boolean;
  voice_navigation: boolean;
  reminder_frequency: "low" | "normal" | "high";
  preferred_voice: "default" | "enhanced" | "clear" | "simple";
  push_notifications: boolean;
  email_notifications: boolean;
  reminder_sound: boolean;
};

const FONT_PRESETS = [
  { label: "S", size: 13 },
  { label: "M", size: 16 },
  { label: "L", size: 20 },
  { label: "XL", size: 24 },
];

export default function SettingsScreen() {
  const { ui, scale } = useAccessibilitySettings();
  const { isDark, setDarkMode } = useAppTheme();
  const [settings, setSettings] = useState<UserSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId] = useState(1);
  const [fontSize, setFontSize] = useState(16);

  const [localSettings, setLocalSettings] = useState<LocalSettings>({
    voice_speed: 1.0,
    high_contrast: false,
    large_text: false,
    voice_navigation: true,
    reminder_frequency: "normal",
    preferred_voice: "default",
    push_notifications: true,
    email_notifications: true,
    reminder_sound: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUserSettings(currentUserId);
      setSettings(data);
      const map: Record<string, string> = {};
      data.forEach((s) => (map[s.setting_name] = s.setting_value));
      const merged: LocalSettings = {
        ...localSettings,
        voice_speed: parseFloat(map.voice_speed ?? "1") || 1.0,
        high_contrast: (map.high_contrast ?? "false") === "true",
        large_text: (map.large_text ?? "false") === "true",
        voice_navigation: (map.voice_navigation ?? "true") === "true",
        reminder_frequency: (map.reminder_frequency as any) ?? "normal",
        preferred_voice: (map.preferred_voice as any) ?? "default",
        push_notifications: (map.push_notifications ?? "true") === "true",
        email_notifications: (map.email_notifications ?? "true") === "true",
        reminder_sound: (map.reminder_sound ?? "true") === "true",
      };
      setLocalSettings(merged);
      await setTalkingPreference(merged.voice_navigation);
    } catch {
      console.warn("⚠️ Offline mode: using cached settings");
      const localToggle = await getTalkingPreference();
      setLocalSettings((prev) => ({ ...prev, voice_navigation: localToggle }));
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingName: keyof LocalSettings, value: any) => {
    if (typeof value === "boolean") {
      Haptics.impactAsync(value ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLocalSettings((prev) => ({ ...prev, [settingName]: value }));
    try {
      await apiService.updateUserSetting(currentUserId, settingName, String(value));
    } catch {
      console.warn(`⚠️ Offline update saved locally for ${settingName}`);
    }
    if (settingName === "voice_navigation") {
      await setTalkingPreference(Boolean(value));
      if (!value) await stopSpeech();
      else await speakIfEnabled("Talking feature enabled.");
    }
    if (settingName === "high_contrast") await setAccessibilitySetting("highContrast", Boolean(value));
    if (settingName === "large_text") await setAccessibilitySetting("largeText", Boolean(value));
    await speakIfEnabled(`Setting updated: ${String(settingName)} is now ${String(value)}`);
  };

  const adjustVoiceSpeed = () => {
    const next = localSettings.voice_speed >= 2.0 ? 0.5 : Number((localSettings.voice_speed + 0.5).toFixed(1));
    updateSetting("voice_speed", next);
  };

  const toggleSetting = (name: keyof LocalSettings, current: boolean) => updateSetting(name, !current);

  const cycle = <T extends string>(list: readonly T[], current: T): T => {
    const i = list.indexOf(current);
    return list[(i + 1) % list.length];
  };

  const resetToDefaults = () => {
    Alert.alert("Reset Settings", "Reset all settings to default values?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          const defaults: LocalSettings = {
            voice_speed: 1.0, high_contrast: false, large_text: false,
            voice_navigation: true, reminder_frequency: "normal",
            preferred_voice: "default", push_notifications: true,
            email_notifications: true, reminder_sound: true,
          };
          for (const [k, v] of Object.entries(defaults)) {
            await updateSetting(k as keyof LocalSettings, v);
          }
          setFontSize(16);
          await speakIfEnabled("Settings reset to default values.");
        },
      },
    ]);
  };

  const SectionCard = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <View style={[styles.card, { backgroundColor: ui.sectionBg }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderIcon}>{icon}</Text>
        <ThemedText style={[styles.cardTitle, { color: ui.text, fontSize: scale(16) }]}>{title}</ThemedText>
      </View>
      {children}
    </View>
  );

  const SettingRow = ({
    label, description, right, last = false,
  }: { label: string; description?: string; right: React.ReactNode; last?: boolean }) => (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: ui.divider }]}>
      <View style={styles.rowLeft}>
        <ThemedText style={[styles.rowLabel, { color: ui.text, fontSize: scale(15) }]}>{label}</ThemedText>
        {description && (
          <ThemedText style={[styles.rowDesc, { color: ui.subtext, fontSize: scale(12) }]}>{description}</ThemedText>
        )}
      </View>
      {right}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: ui.bg }]}>
        <ActivityIndicator size="large" color={ui.accent} />
        <ThemedText style={[{ color: ui.subtext, marginTop: 10, fontSize: scale(15) }]}>Loading settings...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: ui.bg }]} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? "#1E1B4B" : "#4F46E5" }]}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSub}>Customize your AccessAid experience</Text>
      </View>

      <View style={styles.body}>

        {/* Voice & Speech */}
        <SectionCard title="Voice & Speech" icon="🔊">
          <SettingRow
            label="Voice Navigation"
            description="Speaks labels and actions when you tap"
            right={
              <Switch
                value={localSettings.voice_navigation}
                onValueChange={() => toggleSetting("voice_navigation", localSettings.voice_navigation)}
                trackColor={{ false: ui.switchTrackOff, true: ui.switchTrackActive }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingRow
            label="Speech Rate"
            description={`Current speed: ${localSettings.voice_speed.toFixed(1)}×`}
            right={
              <TouchableOpacity style={[styles.pill, { backgroundColor: ui.accent }]} onPress={adjustVoiceSpeed}>
                <Text style={styles.pillText}>Adjust</Text>
              </TouchableOpacity>
            }
          />
          <SettingRow
            label="Preferred Voice"
            description={`Active: ${localSettings.preferred_voice}`}
            last
            right={
              <TouchableOpacity
                style={[styles.pill, { backgroundColor: ui.accent }]}
                onPress={() => updateSetting("preferred_voice", cycle(["default", "enhanced", "clear", "simple"] as const, localSettings.preferred_voice))}
              >
                <Text style={styles.pillText}>Change</Text>
              </TouchableOpacity>
            }
          />
        </SectionCard>

        {/* Visual Settings */}
        <SectionCard title="Visual Settings" icon="🎨">
          <SettingRow
            label="Dark Mode"
            right={
              <Switch
                value={isDark}
                onValueChange={async (val) => { await setDarkMode(val); speakIfEnabled(val ? "Dark mode enabled" : "Dark mode disabled"); }}
                trackColor={{ false: ui.switchTrackOff, true: ui.switchTrackActive }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingRow
            label="High Contrast"
            description="Bold black & white display"
            right={
              <Switch
                value={localSettings.high_contrast}
                onValueChange={() => toggleSetting("high_contrast", localSettings.high_contrast)}
                trackColor={{ false: ui.switchTrackOff, true: ui.switchTrackActive }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingRow
            label="Large Text"
            description="Increases all text by 25%"
            right={
              <Switch
                value={localSettings.large_text}
                onValueChange={() => toggleSetting("large_text", localSettings.large_text)}
                trackColor={{ false: ui.switchTrackOff, true: ui.switchTrackActive }}
                thumbColor="#FFFFFF"
              />
            }
          />

          {/* Font Size Slider */}
          <View style={styles.fontSliderBlock}>
            <View style={styles.fontSliderTopRow}>
              <ThemedText style={[styles.rowLabel, { color: ui.text, fontSize: scale(15) }]}>Font Size</ThemedText>
              <View style={[styles.fontSizeBadge, { backgroundColor: ui.accent }]}>
                <Text style={styles.fontSizeBadgeText}>{fontSize}px</Text>
              </View>
            </View>

            {/* Preset chips */}
            <View style={styles.presetRow}>
              {FONT_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: fontSize === p.size ? ui.accent : isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                      borderColor: fontSize === p.size ? ui.accent : "transparent",
                    },
                  ]}
                  onPress={() => {
                    setFontSize(p.size);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    speakIfEnabled(`Font size ${p.label}`);
                  }}
                >
                  <Text style={[styles.presetLabel, { color: fontSize === p.size ? "#fff" : ui.subtext }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Slider
              style={styles.slider}
              minimumValue={12}
              maximumValue={26}
              step={1}
              value={fontSize}
              onValueChange={(val) => setFontSize(val)}
              onSlidingComplete={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                speakIfEnabled(`Font size set to ${val}`);
              }}
              minimumTrackTintColor={ui.accent}
              maximumTrackTintColor={isDark ? "#333" : "#E5E7EB"}
              thumbTintColor={ui.accent}
            />
            <View style={styles.sliderRange}>
              <Text style={[styles.sliderRangeText, { color: ui.subtext }]}>A</Text>
              <Text style={[{ color: ui.subtext, fontSize: 20, fontWeight: "700" }]}>A</Text>
            </View>

            {/* Live preview */}
            <View style={[styles.previewCard, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F9FAFB", borderColor: isDark ? "#333" : "#E5E7EB" }]}>
              <Text style={[styles.previewLabel, { color: ui.subtext }]}>PREVIEW</Text>
              <Text style={[styles.previewSample, { fontSize, color: ui.text }]}>
                AccessAid helps everyone
              </Text>
              <Text style={[{ fontSize: fontSize * 0.75, color: ui.subtext }]}>
                Reminders · Camera Reader · Voice
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="Notifications" icon="🔔">
          {[
            { key: "push_notifications",  label: "Push Notifications",  desc: "App alerts on your device" },
            { key: "email_notifications", label: "Email Notifications", desc: "Updates sent to your email" },
            { key: "reminder_sound",      label: "Reminder Sound",      desc: "Play sound for reminders" },
          ].map(({ key, label, desc }, i, arr) => (
            <SettingRow
              key={key}
              label={label}
              description={desc}
              last={i === arr.length - 1}
              right={
                <Switch
                  value={(localSettings as any)[key]}
                  onValueChange={() => toggleSetting(key as keyof LocalSettings, (localSettings as any)[key])}
                  trackColor={{ false: ui.switchTrackOff, true: ui.switchTrackActive }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          ))}
        </SectionCard>

        {/* Quick Actions */}
        <SectionCard title="Quick Actions" icon="⚡">
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: ui.accent }]}
            onPress={() =>
              localSettings.voice_navigation
                ? speakIfEnabled("Testing voice with current settings.")
                : Alert.alert("Talking is off", "Enable Voice Navigation to hear the test.")
            }
          >
            <Text style={styles.actionBtnText}>🔊  Test Voice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#EF4444", marginBottom: 0 }]}
            onPress={resetToDefaults}
          >
            <Text style={styles.actionBtnText}>🔄  Reset to Defaults</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* App Info */}
        <View style={[styles.infoCard, { backgroundColor: ui.sectionBg }]}>
          <Text style={[styles.infoAppName, { color: ui.text }]}>AccessAid</Text>
          <Text style={[styles.infoVersion, { color: ui.subtext }]}>Version 1.0.0 · by Code Innovators</Text>
          <Text style={[styles.infoTagline, { color: ui.subtext }]}>Making technology accessible for everyone</Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: { color: "#fff", fontSize: 30, fontWeight: "800", marginBottom: 4 },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  body: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 48 },
  card: {
    borderRadius: 20,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 8,
  },
  cardHeaderIcon: { fontSize: 18 },
  cardTitle: { fontWeight: "800", letterSpacing: 0.2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowLabel: { fontWeight: "600" },
  rowDesc: { marginTop: 2 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  fontSliderBlock: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  fontSliderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  fontSizeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  fontSizeBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  presetRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  presetChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  presetLabel: { fontWeight: "700", fontSize: 14 },
  slider: { width: "100%", height: 36 },
  sliderRange: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: -4,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sliderRangeText: { fontSize: 13, fontWeight: "600" },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  previewLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 6 },
  previewSample: { fontWeight: "600", marginBottom: 4 },
  actionBtn: {
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  infoCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  infoAppName: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  infoVersion: { fontSize: 13, marginBottom: 4 },
  infoTagline: { fontSize: 12, fontStyle: "italic" },
});
