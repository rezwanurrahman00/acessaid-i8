import { useState, useCallback } from "react";
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
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";

import { useAuth } from "@/contexts/AuthContext";
import {
  speakIfEnabled,
  setAccessibilitySetting,
  getAccessibilitySetting,
} from "@/services/ttsService";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showTTSModal, setShowTTSModal] = useState(false);
  const [customText, setCustomText] = useState("");
  const router = useRouter();
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const hc = await getAccessibilitySetting("highContrast");
        const lt = await getAccessibilitySetting("largeText");
        if (active) {
          setHighContrast(hc);
          setLargeText(lt);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const C = {
    bg: highContrast ? "#000" : "#F2F4F8",
    card: highContrast ? "#111" : "#FFFFFF",
    text: highContrast ? "#FFF" : "#111827",
    sub: highContrast ? "#CCC" : "#6B7280",
    divider: highContrast ? "#333" : "#E5E7EB",
    blue: "#4F46E5",
    purple: "#7C3AED",
    green: "#059669",
    amber: "#D97706",
    red: "#EF4444",
  };

  const s = (n: number) => (largeText ? Math.round(n * 1.25) : n);

  const speakText = async (text: string) => {
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
        onError: () => setIsSpeaking(false),
      });
    } catch {
      setIsSpeaking(false);
    }
  };

  const welcomeMsg = user
    ? `Welcome back, ${user.name}! AccessAid is ready to help you.`
    : "Welcome to AccessAid! Your personal accessibility assistant.";

  const handleCustomTTS = () => {
    if (!customText.trim()) {
      Alert.alert("Error", "Please enter some text to speak");
      return;
    }
    speakText(customText);
    setShowTTSModal(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ─── HEADER ─── */}
        <LinearGradient
          colors={highContrast ? ["#000", "#000"] : ["#0F0C29", "#4F46E5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.headerGreeting, { fontSize: s(13) }]}>
                {user ? `Hello, ${user.name} 👋` : "Hello there 👋"}
              </Text>
              <Text style={[styles.headerTitle, { fontSize: s(30) }]}>
                AccessAid
              </Text>
              <Text style={[styles.headerSub, { fontSize: s(13) }]}>
                Your Accessibility Assistant
              </Text>
            </View>
            <View style={styles.logoWrap}>
              <Image
                source={require("@/assets/images/partial-react-logo.png")}
                style={styles.logo}
              />
            </View>
          </View>

          {/* Stats strip */}
          <View style={styles.statsRow}>
            {[
              { icon: "🔊", label: "TTS" },
              { icon: "📅", label: "Reminders" },
              { icon: "🎤", label: "Voice" },
              { icon: "♿", label: "Access" },
            ].map((item) => (
              <View key={item.label} style={styles.statPill}>
                <Text style={styles.statIcon}>{item.icon}</Text>
                <Text style={[styles.statLabel, { fontSize: s(11) }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.body}>

          {/* ─── FEATURES ─── */}
          <Text style={[styles.section, { color: C.sub, fontSize: s(11) }]}>
            FEATURES
          </Text>

          {/* TTS card */}
          <LinearGradient
            colors={highContrast ? ["#111", "#111"] : ["#4F46E5", "#818CF8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bigCard}
          >
            <View style={styles.bigCardLeft}>
              <Text style={[styles.bigCardTitle, { fontSize: s(18) }]}>
                Text-to-Speech
              </Text>
              <Text style={[styles.bigCardSub, { fontSize: s(13) }]}>
                Hear any content read aloud instantly
              </Text>
              <TouchableOpacity
                style={[
                  styles.bigCardBtn,
                  { backgroundColor: isSpeaking ? C.red : "rgba(255,255,255,0.25)" },
                ]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); speakText(welcomeMsg); }}
              >
                <Text style={[styles.bigCardBtnText, { fontSize: s(14) }]}>
                  {isSpeaking ? "⏹ Stop" : "▶ Play"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.bigCardEmoji}>🔊</Text>
          </LinearGradient>

          {/* Row: Custom Speech + Voice Nav */}
          <View style={styles.twoCol}>
            <TouchableOpacity
              style={[styles.halfCard, { backgroundColor: C.card }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTTSModal(true); }}
            >
              <View style={[styles.halfIcon, { backgroundColor: "#F3F0FF" }]}>
                <Text style={styles.halfEmoji}>✏️</Text>
              </View>
              <Text style={[styles.halfTitle, { color: C.text, fontSize: s(14) }]}>
                Custom Speech
              </Text>
              <Text style={[styles.halfSub, { color: C.sub, fontSize: s(12) }]}>
                Type & speak any text
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.halfCard, { backgroundColor: C.card }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Alert.alert("Voice Navigation", "Navigate the app using voice commands. Coming soon!");
                speakIfEnabled("Voice navigation coming soon");
              }}
            >
              <View style={[styles.halfIcon, { backgroundColor: "#FFFBEB" }]}>
                <Text style={styles.halfEmoji}>🎤</Text>
              </View>
              <Text style={[styles.halfTitle, { color: C.text, fontSize: s(14) }]}>
                Voice Nav
              </Text>
              <Text style={[styles.halfSub, { color: C.sub, fontSize: s(12) }]}>
                Coming soon
              </Text>
            </TouchableOpacity>
          </View>

          {/* Reminders banner */}
          <TouchableOpacity
            onPress={() => {
              speakIfEnabled("Opening reminders");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/reminders");
            }}
          >
            <LinearGradient
              colors={highContrast ? ["#111", "#111"] : ["#059669", "#34D399"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bannerCard}
            >
              <View>
                <Text style={[styles.bannerTitle, { fontSize: s(16) }]}>
                  Smart Reminders
                </Text>
                <Text style={[styles.bannerSub, { fontSize: s(12) }]}>
                  Task & appointment reminders
                </Text>
              </View>
              <View style={styles.bannerRight}>
                <Text style={styles.bannerEmoji}>📅</Text>
                <Text style={[styles.bannerArrow, { fontSize: s(13) }]}>Open →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* ─── ACCESSIBILITY ─── */}
          <Text style={[styles.section, { color: C.sub, fontSize: s(11), marginTop: 10 }]}>
            ACCESSIBILITY
          </Text>

          <View style={[styles.settingsBlock, { backgroundColor: C.card }]}>
            {/* High Contrast */}
            <View style={[styles.settRow, { borderBottomColor: C.divider }]}>
              <View style={styles.settLeft}>
                <View style={[styles.settIconBox, { backgroundColor: "#EEF2FF" }]}>
                  <Text style={styles.settEmoji}>🌗</Text>
                </View>
                <View>
                  <Text style={[styles.settName, { color: C.text, fontSize: s(14) }]}>
                    High Contrast
                  </Text>
                  <Text style={[styles.settDesc, { color: C.sub, fontSize: s(12) }]}>
                    Bold black & white mode
                  </Text>
                </View>
              </View>
              <Switch
                value={highContrast}
                onValueChange={(v) => {
                  Haptics.impactAsync(v ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
                  setHighContrast(v);
                  setAccessibilitySetting("highContrast", v);
                  speakIfEnabled(v ? "High contrast on" : "High contrast off");
                }}
                trackColor={{ false: C.divider, true: C.blue }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Large Text */}
            <View style={[styles.settRow, { borderBottomColor: C.divider }]}>
              <View style={styles.settLeft}>
                <View style={[styles.settIconBox, { backgroundColor: "#F0FDF4" }]}>
                  <Text style={styles.settEmoji}>🔤</Text>
                </View>
                <View>
                  <Text style={[styles.settName, { color: C.text, fontSize: s(14) }]}>
                    Large Text
                  </Text>
                  <Text style={[styles.settDesc, { color: C.sub, fontSize: s(12) }]}>
                    25% bigger font size
                  </Text>
                </View>
              </View>
              <Switch
                value={largeText}
                onValueChange={(v) => {
                  Haptics.impactAsync(v ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
                  setLargeText(v);
                  setAccessibilitySetting("largeText", v);
                  speakIfEnabled(v ? "Large text on" : "Large text off");
                }}
                trackColor={{ false: C.divider, true: C.blue }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Speech Rate */}
            <View style={[styles.settRow, { borderBottomColor: "transparent" }]}>
              <View style={styles.settLeft}>
                <View style={[styles.settIconBox, { backgroundColor: "#FFF7ED" }]}>
                  <Text style={styles.settEmoji}>🎚️</Text>
                </View>
                <View>
                  <Text style={[styles.settName, { color: C.text, fontSize: s(14) }]}>
                    Speech Rate
                  </Text>
                  <Text style={[styles.settDesc, { color: C.sub, fontSize: s(12) }]}>
                    Current: {speechRate.toFixed(1)}× speed
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.adjustBtn, { backgroundColor: C.blue }]}
                onPress={() => {
                  const next = speechRate >= 2.0 ? 0.5 : Number((speechRate + 0.5).toFixed(1));
                  setSpeechRate(next);
                  speakIfEnabled(`Speed ${next} times`);
                }}
              >
                <Text style={[styles.adjustBtnText, { fontSize: s(13) }]}>Adjust</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── QUICK ACTIONS ─── */}
          <Text style={[styles.section, { color: C.sub, fontSize: s(11), marginTop: 10 }]}>
            QUICK ACTIONS
          </Text>

          <View style={styles.grid}>
            {[
              { icon: "📅", label: "Reminders", route: "/reminders", color: "#ECFDF5", iconBg: "#059669" },
              { icon: "⚙️", label: "Settings",  route: "/settings",  color: "#EFF6FF", iconBg: "#4F7BFF" },
              { icon: "📊", label: "Activity",  route: "/activity",  color: "#FDF4FF", iconBg: "#7C3AED" },
              { icon: "👤", label: "Profile",   route: "/profile",   color: "#FFFBEB", iconBg: "#D97706" },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.gridCard, { backgroundColor: C.card }]}
                onPress={() => {
                  speakIfEnabled(`Opening ${item.label}`);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.route as any);
                }}
              >
                <View style={[styles.gridIconBox, { backgroundColor: highContrast ? "#222" : item.color }]}>
                  <Text style={styles.gridEmoji}>{item.icon}</Text>
                </View>
                <Text style={[styles.gridLabel, { color: C.text, fontSize: s(13) }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.footer, { color: C.sub, fontSize: s(12) }]}>
            AccessAid · Making technology accessible for everyone
          </Text>
        </View>
      </ScrollView>

      {/* ─── CUSTOM TTS MODAL ─── */}
      <Modal visible={showTTSModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: C.text, fontSize: s(18) }]}>
              Custom Text-to-Speech
            </Text>
            <Text style={[styles.modalSub, { color: C.sub, fontSize: s(13) }]}>
              Type the text you want to hear spoken
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { color: C.text, borderColor: C.divider, backgroundColor: C.bg, fontSize: s(14) },
              ]}
              placeholder="Enter text to speak..."
              placeholderTextColor={C.sub}
              value={customText}
              onChangeText={setCustomText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.divider }]}
                onPress={() => { setShowTTSModal(false); setCustomText(""); }}
              >
                <Text style={[styles.modalBtnTxt, { color: C.text, fontSize: s(14) }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.blue }]}
                onPress={handleCustomTTS}
              >
                <Text style={[styles.modalBtnTxt, { color: "#FFF", fontSize: s(14) }]}>🔊 Speak</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerGreeting: { color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  headerTitle: { color: "#FFF", fontWeight: "800", letterSpacing: 0.3 },
  headerSub: { color: "rgba(255,255,255,0.6)", marginTop: 2 },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 44, height: 44, borderRadius: 10 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingVertical: 8,
    marginHorizontal: 3,
  },
  statIcon: { fontSize: 18, marginBottom: 2 },
  statLabel: { color: "rgba(255,255,255,0.85)", fontWeight: "600" },

  body: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 48 },

  section: {
    fontWeight: "700",
    letterSpacing: 1.3,
    marginBottom: 12,
  },

  // Big TTS card
  bigCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bigCardLeft: { flex: 1 },
  bigCardTitle: { color: "#FFF", fontWeight: "800", marginBottom: 4 },
  bigCardSub: { color: "rgba(255,255,255,0.75)", marginBottom: 14 },
  bigCardBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 12,
  },
  bigCardBtnText: { color: "#FFF", fontWeight: "700" },
  bigCardEmoji: { fontSize: 54, marginLeft: 10 },

  // Two column cards
  twoCol: { flexDirection: "row", gap: 14, marginBottom: 14 },
  halfCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  halfIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  halfEmoji: { fontSize: 22 },
  halfTitle: { fontWeight: "700", marginBottom: 3 },
  halfSub: {},

  // Banner card
  bannerCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  bannerTitle: { color: "#FFF", fontWeight: "800", marginBottom: 3 },
  bannerSub: { color: "rgba(255,255,255,0.75)" },
  bannerRight: { alignItems: "center" },
  bannerEmoji: { fontSize: 34, marginBottom: 4 },
  bannerArrow: { color: "#FFF", fontWeight: "700" },

  // Settings block
  settingsBlock: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  settRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  settIconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settEmoji: { fontSize: 19 },
  settName: { fontWeight: "600" },
  settDesc: { marginTop: 1 },
  adjustBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  adjustBtnText: { color: "#FFF", fontWeight: "700" },

  // Grid quick actions
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 32,
  },
  gridCard: {
    width: "46%",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  gridIconBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  gridEmoji: { fontSize: 26 },
  gridLabel: { fontWeight: "700" },

  footer: { textAlign: "center", fontStyle: "italic" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 44,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitle: { fontWeight: "800", marginBottom: 5 },
  modalSub: { marginBottom: 18 },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    minHeight: 110,
    marginBottom: 18,
  },
  modalRow: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  modalBtnTxt: { fontWeight: "700" },
});
