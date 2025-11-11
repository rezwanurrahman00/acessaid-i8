import React, { useEffect, useState } from "react";
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
import * as Speech from "expo-speech";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { apiService, UserSetting } from "@/services/api";
import {
  getTalkingPreference,
  setTalkingPreference,
  speakIfEnabled,
  stopSpeech,
} from "@/services/ttsService";

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

export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId] = useState(1);

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
    } catch (error) {
      console.warn("⚠️ Offline mode: using cached settings");
      const localToggle = await getTalkingPreference();
      setLocalSettings((prev) => ({ ...prev, voice_navigation: localToggle }));
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingName: keyof LocalSettings, value: any) => {
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

    await speakIfEnabled(
      `Setting updated: ${String(settingName)} is now ${String(value)}`
    );
  };

  const adjustVoiceSpeed = () => {
    const next =
      localSettings.voice_speed >= 2.0
        ? 0.5
        : Number((localSettings.voice_speed + 0.5).toFixed(1));
    updateSetting("voice_speed", next);
  };

  const toggleSetting = (name: keyof LocalSettings, current: boolean) => {
    updateSetting(name, !current);
  };

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
            voice_speed: 1.0,
            high_contrast: false,
            large_text: false,
            voice_navigation: true,
            reminder_frequency: "normal",
            preferred_voice: "default",
            push_notifications: true,
            email_notifications: true,
            reminder_sound: true,
          };
          for (const [k, v] of Object.entries(defaults)) {
            await updateSetting(k as keyof LocalSettings, v);
          }
          await speakIfEnabled("Settings reset to default values.");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <ThemedText style={styles.loadingText}>Loading settings...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Settings</ThemedText>
        <ThemedText style={styles.subtitle}>
          Customize your AccessAid experience
        </ThemedText>
      </ThemedView>

      {/* Voice & Speech */}
      <ThemedView style={styles.settingsSection}>
        <ThemedText style={styles.sectionTitle}>Voice & Speech</ThemedText>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Talking (Voice Navigation)</ThemedText>
          <Switch
            value={localSettings.voice_navigation}
            onValueChange={() =>
              toggleSetting("voice_navigation", localSettings.voice_navigation)
            }
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={localSettings.voice_navigation ? "#f5dd4b" : "#f4f3f4"}
          />
        </View>

        <ThemedText style={styles.helperText}>
          When enabled, AccessAid speaks labels or actions when you tap icons.
        </ThemedText>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>
            Speech Rate: {localSettings.voice_speed.toFixed(1)}x
          </ThemedText>
          <TouchableOpacity style={styles.adjustButton} onPress={adjustVoiceSpeed}>
            <Text style={styles.adjustButtonText}>Adjust</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>
            Preferred Voice: {localSettings.preferred_voice}
          </ThemedText>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() =>
              updateSetting(
                "preferred_voice",
                cycle(
                  ["default", "enhanced", "clear", "simple"] as const,
                  localSettings.preferred_voice
                )
              )
            }
          >
            <Text style={styles.adjustButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Visual Settings */}
      <ThemedView style={styles.settingsSection}>
        <ThemedText style={styles.sectionTitle}>Visual Settings</ThemedText>
        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>High Contrast Mode</ThemedText>
          <Switch
            value={localSettings.high_contrast}
            onValueChange={() =>
              toggleSetting("high_contrast", localSettings.high_contrast)
            }
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={localSettings.high_contrast ? "#f5dd4b" : "#f4f3f4"}
          />
        </View>
        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Large Text</ThemedText>
          <Switch
            value={localSettings.large_text}
            onValueChange={() =>
              toggleSetting("large_text", localSettings.large_text)
            }
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={localSettings.large_text ? "#f5dd4b" : "#f4f3f4"}
          />
        </View>
      </ThemedView>

      {/* Notifications */}
      <ThemedView style={styles.settingsSection}>
        <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
        {[
          ["push_notifications", "Push Notifications"],
          ["email_notifications", "Email Notifications"],
          ["reminder_sound", "Reminder Sound"],
        ].map(([key, label]) => (
          <View key={key} style={styles.settingRow}>
            <ThemedText style={styles.settingLabel}>{label}</ThemedText>
            <Switch
              value={(localSettings as any)[key]}
              onValueChange={() =>
                toggleSetting(key as keyof LocalSettings, (localSettings as any)[key])
              }
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={(localSettings as any)[key] ? "#f5dd4b" : "#f4f3f4"}
            />
          </View>
        ))}
        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>
            Reminder Frequency: {localSettings.reminder_frequency}
          </ThemedText>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() =>
              updateSetting(
                "reminder_frequency",
                cycle(["low", "normal", "high"] as const, localSettings.reminder_frequency)
              )
            }
          >
            <Text style={styles.adjustButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Quick Actions */}
      <ThemedView style={styles.settingsSection}>
        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            localSettings.voice_navigation
              ? speakIfEnabled("Testing voice settings with current speech rate.")
              : Alert.alert("Talking is off", "Enable Talking to hear the test.")
          }
        >
          <Text style={styles.actionButtonText}>🔊 Test Voice</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.resetButton]}
          onPress={resetToDefaults}
        >
          <Text style={styles.actionButtonText}>🔄 Reset to Defaults</Text>
        </TouchableOpacity>
      </ThemedView>

      {/* Info */}
      <ThemedView style={styles.infoSection}>
        <ThemedText style={styles.sectionTitle}>App Information</ThemedText>
        <ThemedText style={styles.infoText}>AccessAid v1.0.0</ThemedText>
        <ThemedText style={styles.infoText}>by Code Innovators</ThemedText>
        <ThemedText style={styles.infoText}>
          Making technology accessible for everyone
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#666666", fontSize: 16 },
  header: {
    backgroundColor: "#6C7B7F",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#FFFFFF", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#E8F8E8", textAlign: "center" },
  settingsSection: {
    margin: 20,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, color: "#333333" },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  helperText: { fontSize: 13, color: "#666", marginTop: 8 },
  settingLabel: { fontSize: 16, color: "#333333", flex: 1 },
  adjustButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  adjustButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  actionButton: {
    backgroundColor: "#4A90E2",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  resetButton: { backgroundColor: "#FF6B6B" },
  actionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  infoSection: {
    margin: 20,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    alignItems: "center",
  },
  infoText: { fontSize: 14, color: "#666666", marginBottom: 5, textAlign: "center" },
});



