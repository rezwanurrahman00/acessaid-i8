import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { speakIfEnabled } from "@/services/ttsService";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

let ExpoSpeechRecognitionModule: any = null;
try {
  ExpoSpeechRecognitionModule =
    require("expo-speech-recognition").ExpoSpeechRecognitionModule;
} catch {
  console.log("Voice recognition not available (Expo Go). Use development build.");
}

// --- Mapping spoken numbers to digits ---
const SPOKEN_NUMBERS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9",
  ten: "10", eleven: "11", twelve: "12",
};

// Supabase reminder type (id is UUID string)
interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  reminder_datetime: string;
  frequency: string;
  priority: string;
  is_active: boolean;
  is_completed: boolean;
  created_at: string;
}

export default function RemindersScreen() {
  const { user } = useAuth();
  const { ui, scale } = useAccessibilitySettings();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const [newReminder, setNewReminder] = useState({ title: "", description: "", time: "" });
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState("");

  const listenersInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    speakIfEnabled("Reminders screen loaded. You can add, view, or delete reminders.");
    loadReminders();

    return () => {
      isMountedRef.current = false;
      try {
        ExpoSpeechRecognitionModule?.stop?.();
        ExpoSpeechRecognitionModule?.removeAllListeners?.("result");
        ExpoSpeechRecognitionModule?.removeAllListeners?.("error");
        ExpoSpeechRecognitionModule?.removeAllListeners?.("end");
      } catch {}
    };
  }, []);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('reminder_datetime', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
      speakIfEnabled(`Loaded ${data?.length ?? 0} reminders`);
    } catch (err) {
      console.error('Failed to load reminders:', err);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Normalize spoken times ------------------
  const normalizeSpokenTime = (spokenTime: string): string | null => {
    let value = spokenTime.toLowerCase().trim();

    value = value.replace(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g,
      (m) => SPOKEN_NUMBERS[m]
    );
    value = value.replace(/\./g, "").trim();

    const match = value.match(/^(\d{1,2}):?(\d{0,2})\s*(am|pm)?$/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] || "0", 10);
    const suffix = match[3];

    if (minutes > 59) return null;

    if (suffix) {
      if (suffix.toLowerCase() === "pm" && hours !== 12) hours += 12;
      if (suffix.toLowerCase() === "am" && hours === 12) hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };
  // -------------------------------------------------------------

  const createReminder = async (
    title: string,
    description: string,
    time: string,
    options?: { closeForm?: boolean }
  ) => {
    if (!title || !time) {
      Alert.alert("Missing info", "Please fill in title and time");
      return;
    }

    if (!user) {
      Alert.alert("Not signed in", "Please sign in to add reminders.");
      return;
    }

    const today = new Date();
    const [h, m] = time.split(":");
    today.setHours(parseInt(h), parseInt(m), 0, 0);

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        title,
        description,
        reminder_datetime: today.toISOString(),
        frequency: 'once',
        priority: 'medium',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create reminder:', error);
      Alert.alert('Error', 'Failed to create reminder. Please try again.');
      return;
    }

    setReminders(prev => [...prev, data]);

    if (options?.closeForm ?? true) {
      setIsAddingReminder(false);
    }
    speakIfEnabled(`Reminder added: ${title} at ${time}`);
  };

  const addReminder = async () => {
    await createReminder(newReminder.title, newReminder.description, newReminder.time);
    setNewReminder({ title: "", description: "", time: "" });
  };

  const deleteReminder = async (id: string, title: string) => {
    Alert.alert('Delete Reminder', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('reminders').delete().eq('id', id);
          if (error) {
            Alert.alert('Error', 'Failed to delete reminder.');
            return;
          }
          setReminders(prev => prev.filter(r => r.id !== id));
          speakIfEnabled('Reminder deleted');
        },
      },
    ]);
  };

  const completeReminder = async (id: string) => {
    const { data, error } = await supabase
      .from('reminders')
      .update({ is_completed: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      Alert.alert('Error', 'Failed to update reminder.');
      return;
    }
    setReminders(prev => prev.map(r => r.id === id ? data : r));
    speakIfEnabled('Reminder marked as complete');
  };

  const readRemindersOutLoud = async () => {
    if (!reminders.length) {
      speakIfEnabled("You have no reminders.");
      return;
    }
    const speech = reminders
      .map((r, i) => {
        const t = new Date(r.reminder_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return `Reminder ${i + 1}: ${r.title} at ${t}.`;
      })
      .join(" ");
    speakIfEnabled(speech);
  };

  // ------------------- VOICE COMMAND HANDLER -------------------
  const handleVoiceCommand = async (text: string) => {
    const sanitized = text
      .toLowerCase()
      .replace(/\blog\b/g, "")
      .replace(/voice command recognized:/g, "")
      .replace(/recording/g, "")
      .replace(/[^\w\s:]/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*(am|pm)\b/gi, "$1")
      .trim();

    console.log("sanitized voice command:", JSON.stringify(sanitized));
    setLastVoiceCommand(text);

    if (sanitized.includes("read my reminders")) {
      await readRemindersOutLoud();
      return;
    }

    const match = sanitized.match(
      /(?:create|add|set)(?: a)? reminder\s+(?:for\s+)?(.+?)\s+(?:at|for)\s+([\d\w\s]+(?:am|pm)?)/i
    );

    if (!match) {
      Alert.alert("Command Not Recognized", "Try saying: \"Set reminder for [title] at [time]\"\nExample: \"Set reminder for medicine at 8pm\"");
      speakIfEnabled("Command not recognized.");
      return;
    }

    const titleCandidate = match[1].trim();
    const timeCandidate = match[2].trim();
    const time = normalizeSpokenTime(timeCandidate);

    if (!titleCandidate || !time) {
      Alert.alert("Command Not Recognized", "Couldn't understand the title or time.");
      speakIfEnabled("Command not recognized.");
      return;
    }

    setNewReminder({ title: titleCandidate, description: "", time });
    setIsAddingReminder(true);
    await createReminder(titleCandidate, "", time, { closeForm: false });
  };
  // -------------------------------------------------------------

  const startVoiceListening = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert("Voice unavailable", "Use a development build.");
      return;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission?.granted) return;

    if (!listenersInitializedRef.current) {
      ExpoSpeechRecognitionModule.addListener("result", (e: any) => {
        const transcript = e?.results?.[0]?.transcript ?? e?.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) handleVoiceCommand(transcript);
      });
      ExpoSpeechRecognitionModule.addListener("end", () => setIsListening(false));
      listenersInitializedRef.current = true;
    }

    ExpoSpeechRecognitionModule.start({ lang: "en-US" });
    setIsListening(true);
    speakIfEnabled("Listening");
  };

  const stopVoiceListening = () => {
    ExpoSpeechRecognitionModule?.stop();
    setIsListening(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: ui.bg }]}>
      <ThemedView style={[styles.header, { backgroundColor: ui.headerReminders }]}>
        <ThemedText style={[styles.title, { fontSize: scale(28) }]}>Smart Reminders</ThemedText>
        <ThemedText style={[styles.subtitle, { fontSize: scale(16) }]}>
          Manage your daily tasks
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: isListening ? ui.warning : ui.accent }]}
          onPress={isListening ? stopVoiceListening : startVoiceListening}
        >
          <Text style={[styles.addButtonText, { fontSize: scale(18) }]}>
            {isListening ? "🛑 Stop Voice" : "🎤 Voice Commands"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: ui.accent }]}
          onPress={() => setIsAddingReminder(!isAddingReminder)}
        >
          <Text style={[styles.addButtonText, { fontSize: scale(18) }]}>
            {isAddingReminder ? "❌ Cancel" : "➕ Add Reminder"}
          </Text>
        </TouchableOpacity>
      </ThemedView>

      {lastVoiceCommand ? (
        <ThemedText style={[styles.voiceHint, { color: ui.subtext }]}>
          Last voice command: "{lastVoiceCommand}"
        </ThemedText>
      ) : null}

      {isAddingReminder && (
        <ThemedView style={[styles.formContainer, { backgroundColor: ui.cardBg }]}>
          <TextInput
            style={[styles.input, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder, color: ui.inputText }]}
            placeholder="Title"
            placeholderTextColor={ui.subtext}
            accessibilityLabel="Reminder title"
            value={newReminder.title}
            onChangeText={(t) => setNewReminder({ ...newReminder, title: t })}
          />
          <TextInput
            style={[styles.input, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder, color: ui.inputText }]}
            placeholder="Description (optional)"
            placeholderTextColor={ui.subtext}
            accessibilityLabel="Reminder description"
            value={newReminder.description}
            onChangeText={(t) => setNewReminder({ ...newReminder, description: t })}
          />
          <TextInput
            style={[styles.input, { backgroundColor: ui.inputBg, borderColor: ui.inputBorder, color: ui.inputText }]}
            placeholder="Time (HH:MM)"
            placeholderTextColor={ui.subtext}
            accessibilityLabel="Reminder time in HH colon MM format"
            value={newReminder.time}
            onChangeText={(t) => setNewReminder({ ...newReminder, time: t })}
          />
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: ui.success }]}
            onPress={addReminder}
          >
            <Text style={[styles.addButtonText, { fontSize: scale(18) }]}>Save</Text>
          </TouchableOpacity>
        </ThemedView>
      )}

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={[styles.emptyText, { color: ui.subtext }]}>
            No reminders yet. Add one above!
          </ThemedText>
        </View>
      ) : (
        <View style={styles.reminderListContainer}>
          <ThemedText style={[styles.sectionTitle, { color: ui.text, fontSize: scale(18) }]}>
            Your Reminders ({reminders.length})
          </ThemedText>
          {reminders.map((reminder) => (
            <ThemedView
              key={reminder.id}
              style={[
                styles.reminderCard,
                { backgroundColor: ui.cardBg, opacity: reminder.is_completed ? 0.6 : 1 },
              ]}
            >
              <View style={styles.reminderHeader}>
                <ThemedText
                  style={[
                    styles.reminderTitle,
                    {
                      color: ui.text,
                      fontSize: scale(16),
                      textDecorationLine: reminder.is_completed ? 'line-through' : 'none',
                    },
                  ]}
                  numberOfLines={2}
                >
                  {reminder.title}
                </ThemedText>
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor:
                        reminder.priority === 'high' ? '#e74c3c'
                        : reminder.priority === 'medium' ? '#f39c12'
                        : '#27ae60',
                    },
                  ]}
                >
                  <Text style={styles.priorityText}>{reminder.priority}</Text>
                </View>
              </View>

              {reminder.description ? (
                <ThemedText style={[styles.reminderDescription, { color: ui.subtext, fontSize: scale(14) }]}>
                  {reminder.description}
                </ThemedText>
              ) : null}

              <ThemedText style={[styles.reminderTime, { color: ui.subtext, fontSize: scale(13) }]}>
                {new Date(reminder.reminder_datetime).toLocaleString([], {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
                {reminder.frequency && reminder.frequency !== 'once' ? ` • ${reminder.frequency}` : ''}
              </ThemedText>

              <View style={styles.reminderActions}>
                {!reminder.is_completed && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: ui.success }]}
                    onPress={() => completeReminder(reminder.id)}
                    accessibilityLabel={`Mark ${reminder.title} as done`}
                  >
                    <Text style={styles.actionButtonText}>✓ Done</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#e74c3c' }]}
                  onPress={() => deleteReminder(reminder.id, reminder.title)}
                  accessibilityLabel={`Delete ${reminder.title}`}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </ThemedView>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
  },
  title: { fontWeight: "bold", color: "#fff" },
  subtitle: { color: "#e8f8e8" },
  addButtonContainer: { margin: 20 },
  addButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  voiceHint: { marginHorizontal: 20, marginBottom: 10, fontStyle: "italic" },
  formContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  saveButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  emptyContainer: { margin: 20, alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontStyle: 'italic', textAlign: 'center' },
  reminderListContainer: { marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12 },
  reminderCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reminderTitle: { fontWeight: '600', flex: 1, marginRight: 8 },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  priorityText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  reminderDescription: { marginBottom: 4 },
  reminderTime: { marginBottom: 10 },
  reminderActions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
