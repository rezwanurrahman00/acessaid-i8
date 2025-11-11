import { useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  TextInput,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/AuthContext";
import { speakIfEnabled } from "@/services/ttsService"; // 🗣 connect to toggle system

export default function HomeScreen() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showTTSModal, setShowTTSModal] = useState(false);
  const [customText, setCustomText] = useState("");
  const router = useRouter();
  const { user } = useAuth();

  const ui = {
    bg: highContrast ? "#000000" : "#f5f5f5",
    cardBg: highContrast ? "#000000" : "#FFFFFF",
    text: highContrast ? "#FFFFFF" : "#333333",
    subtext: highContrast ? "#E6E6E6" : "#666666",
    divider: highContrast ? "rgba(255,255,255,0.25)" : "#E0E0E0",
    headerBg: highContrast ? "#000000" : "#4A90E2",
    headerBorder: highContrast ? "#FFFFFF" : "transparent",
    accent: highContrast ? "#FFD700" : "#4A90E2",
    accentMuted: highContrast ? "#E6C200" : "#81b0ff",
    switchThumbTrue: highContrast ? "#000000" : "#f5dd4b",
  };

  const scale = (n: number) => (largeText ? Math.round(n * 1.25) : n);

  const speakText = async (text: string) => {
    // only speak if talking is enabled
    const allowed = await (async () => {
      try {
        const { getTalkingPreference } = await import("@/services/ttsService");
        return await getTalkingPreference();
      } catch {
        return true;
      }
    })();

    if (!allowed) return;

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    try {
      setIsSpeaking(true);
      await Speech.stop();
      await Speech.speak(text, {
        rate: speechRate,
        pitch: 1.0,
        volume: 1.0,
        language: "en-US",
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: (error) => {
          console.error("TTS Error:", error);
          setIsSpeaking(false);
          Alert.alert(
            "TTS Error",
            "Unable to use text-to-speech. Please check your device volume and settings."
          );
        },
      });
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
      Alert.alert(
        "TTS Error",
        "Unable to use text-to-speech. Please check your device volume and settings."
      );
    }
  };

  const welcomeMessage = user
    ? `Welcome back, ${user.name}! AccessAid is ready to help you. Tap the buttons below to explore features.`
    : "Welcome to AccessAid! Your personal accessibility assistant. Tap the buttons below to explore features.";

  const handleCustomTTS = () => {
    if (!customText.trim()) {
      Alert.alert("Error", "Please enter some text to speak");
      return;
    }
    speakText(customText);
    setShowTTSModal(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: ui.bg }]}>
      {/* Header */}
      <ThemedView
        style={[
          styles.header,
          { backgroundColor: ui.headerBg, borderColor: ui.headerBorder },
          highContrast && styles.headerContrastBorder,
        ]}
      >
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.logo}
        />
        <ThemedText
          style={[styles.title, { color: "#FFFFFF", fontSize: scale(32) }]}
        >
          AccessAid
        </ThemedText>
        <ThemedText
          style={[styles.subtitle, { color: "#E8F4FD", fontSize: scale(18) }]}
        >
          Your Accessibility Assistant
        </ThemedText>
        <ThemedText
          style={[styles.teamText, { color: "#B8D4F0", fontSize: scale(14) }]}
        >
          by Code Innovators
        </ThemedText>
      </ThemedView>

      {/* Accessibility Settings */}
      <ThemedView
        style={[
          styles.card,
          { backgroundColor: ui.cardBg },
          highContrast && { borderColor: "#FFFFFF", borderWidth: 2 },
        ]}
      >
        <ThemedText
          style={[styles.sectionTitle, { color: ui.text, fontSize: scale(20) }]}
        >
          Accessibility Settings
        </ThemedText>

        <View style={[styles.settingRow, { borderBottomColor: ui.divider }]}>
          <ThemedText
            style={[styles.settingLabel, { color: ui.text, fontSize: scale(16) }]}
          >
            High Contrast Mode
          </ThemedText>
          <Switch
            value={highContrast}
            onValueChange={(v) => {
              setHighContrast(v);
              speakIfEnabled(v ? "High contrast mode on" : "High contrast mode off");
            }}
            trackColor={{ false: "#767577", true: ui.accentMuted }}
            thumbColor={highContrast ? ui.switchThumbTrue : "#f4f3f4"}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomColor: ui.divider }]}>
          <ThemedText
            style={[styles.settingLabel, { color: ui.text, fontSize: scale(16) }]}
          >
            Large Text
          </ThemedText>
          <Switch
            value={largeText}
            onValueChange={(v) => {
              setLargeText(v);
              speakIfEnabled(v ? "Large text enabled" : "Large text disabled");
            }}
            trackColor={{ false: "#767577", true: ui.accentMuted }}
            thumbColor={largeText ? ui.switchThumbTrue : "#f4f3f4"}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomColor: "transparent" }]}>
          <ThemedText
            style={[styles.settingLabel, { color: ui.text, fontSize: scale(16) }]}
          >
            Speech Rate: {speechRate.toFixed(1)}x
          </ThemedText>
          <TouchableOpacity
            style={[styles.rateButton, { backgroundColor: ui.accent }]}
            onPress={() => {
              const next = speechRate >= 2.0 ? 0.5 : Number((speechRate + 0.5).toFixed(1));
              setSpeechRate(next);
              speakIfEnabled(`Speech rate set to ${next} times`);
            }}
          >
            <Text style={styles.rateButtonText}>Adjust</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Main Features */}
      <ThemedView
        style={[
          styles.card,
          { backgroundColor: ui.cardBg },
          highContrast && { borderColor: "#FFFFFF", borderWidth: 2 },
        ]}
      >
        <ThemedText
          style={[styles.sectionTitle, { color: ui.text, fontSize: scale(20) }]}
        >
          Main Features
        </ThemedText>

        {/* TTS */}
        <TouchableOpacity
          style={[
            styles.featureButton,
            { backgroundColor: isSpeaking ? "#FF6B6B" : "#4A90E2" },
          ]}
          onPress={() => speakText(welcomeMessage)}
        >
          <Text style={[styles.featureButtonText, { fontSize: scale(18) }]}>
            {isSpeaking ? "🔇 Stop Speaking" : "🔊 Text-to-Speech"}
          </Text>
          <ThemedText
            style={[styles.featureDescription, { color: ui.subtext, fontSize: scale(14) }]}
          >
            {isSpeaking ? "Tap to stop" : "Tap to hear welcome message"}
          </ThemedText>
        </TouchableOpacity>

        {/* Reminders */}
        <TouchableOpacity
          style={[
            styles.featureButton,
            { backgroundColor: "#32CD32" },
          ]}
          onPress={() => speakIfEnabled("Reminders feature coming soon")}
        >
          <Text style={[styles.featureButtonText, { fontSize: scale(18) }]}>
            📅 Smart Reminders
          </Text>
          <ThemedText
            style={[styles.featureDescription, { color: ui.subtext, fontSize: scale(14) }]}
          >
            Intelligent task and appointment reminders
          </ThemedText>
        </TouchableOpacity>

        {/* Voice Navigation */}
        <TouchableOpacity
          style={[
            styles.featureButton,
            { backgroundColor: "#FF8C00" },
          ]}
          onPress={() =>
            speakIfEnabled(
              "Voice navigation helps you move through the app using voice commands. Coming soon!"
            )
          }
        >
          <Text style={[styles.featureButtonText, { fontSize: scale(18) }]}>
            🎤 Voice Navigation
          </Text>
          <ThemedText
            style={[styles.featureDescription, { color: ui.subtext, fontSize: scale(14) }]}
          >
            Navigate the app using voice commands
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Quick Actions */}
      <ThemedView
        style={[
          styles.card,
          { backgroundColor: ui.cardBg },
          highContrast && { borderColor: "#FFFFFF", borderWidth: 2 },
        ]}
      >
        <ThemedText
          style={[styles.sectionTitle, { color: ui.text, fontSize: scale(20) }]}
        >
          Quick Actions
        </ThemedText>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: "#32CD32" }]}
            onPress={() => {
              speakIfEnabled("Opening reminders");
              router.push("/reminders");
            }}
          >
            <Text style={[styles.quickActionText, { fontSize: scale(16) }]}>
              📅 Reminders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: "#6C7B7F" }]}
            onPress={() => {
              speakIfEnabled("Opening settings");
              router.push("/settings");
            }}
          >
            <Text style={[styles.quickActionText, { fontSize: scale(16) }]}>
              ⚙️ Settings
            </Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Footer */}
      <ThemedView style={styles.footer}>
        <ThemedText
          style={[styles.footerText, { color: ui.subtext, fontSize: scale(14) }]}
        >
          AccessAid - Making technology accessible for everyone
        </ThemedText>
      </ThemedView>

      {/* TTS Modal */}
      <Modal visible={showTTSModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ThemedView
            style={[styles.modalContainer, highContrast && styles.highContrastCard]}
          >
            <ThemedText style={[styles.modalTitle, largeText && styles.largeText]}>
              Text-to-Speech
            </ThemedText>
            <ThemedText
              style={[styles.modalSubtitle, largeText && styles.largeSubtext]}
            >
              Type the text you want to hear spoken
            </ThemedText>

            <TextInput
              style={[styles.textInput, largeText && styles.largeTextInput]}
              placeholder="Enter text to speak..."
              value={customText}
              onChangeText={setCustomText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowTTSModal(false);
                  setCustomText("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.speakButton]}
                onPress={handleCustomTTS}
              >
                <Text style={styles.modalButtonText}>🔊 Speak</Text>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerContrastBorder: { borderWidth: 2 },
  logo: { height: 80, width: 80, marginBottom: 15 },
  title: { fontWeight: "bold", marginBottom: 5, textAlign: "center" },
  subtitle: { marginBottom: 5, textAlign: "center" },
  teamText: { fontStyle: "italic" },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: { fontWeight: "bold", marginBottom: 15 },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLabel: { flex: 1 },
  rateButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rateButtonText: { color: "#000", fontWeight: "bold", fontSize: 14 },
  featureButton: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  featureButtonText: { color: "#FFFFFF", fontWeight: "bold", marginBottom: 5 },
  featureDescription: { textAlign: "center" },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  quickActionButton: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    minWidth: 120,
    alignItems: "center",
  },
  quickActionText: { color: "#FFFFFF", fontWeight: "bold" },
  footer: { padding: 20, alignItems: "center", marginTop: 10 },
  footerText: { textAlign: "center", fontStyle: "italic" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "85%",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  modalButton: {
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: { backgroundColor: "#ccc" },
  speakButton: { backgroundColor: "#4A90E2" },
  modalButtonText: { color: "#fff", fontWeight: "bold" },
});


