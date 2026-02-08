import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { apiService, Reminder } from "@/services/api";
import { speakIfEnabled } from "@/services/ttsService";
import React, { useEffect, useRef, useState } from "react";
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
  console.log(
    "⚠️ Voice recognition not available (Expo Go). Use development build."
  );
}

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId] = useState(1);

  const [newReminder, setNewReminder] = useState({
    title: "",
    description: "",
    time: "",
  });

  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState("");

  const listenersInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    speakIfEnabled(
      "Reminders screen loaded. You can add, view, or delete reminders."
    );
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
      const data = await apiService.getUserReminders(currentUserId);
      setReminders(data);
      speakIfEnabled(`Loaded ${data.length} reminders`);
    } catch {
      setReminders([
        {
          reminder_id: 1,
          title: "Take a short break",
          description: "Stretch and drink water",
          reminder_datetime: new Date().toISOString(),
          frequency: "Daily",
          priority: "Medium",
          is_active: true,
          is_completed: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const normalizeSpokenTime = (spokenTime: string): string | null => {
    const value = spokenTime.trim().toLowerCase();
    const words: Record<string, string> = {
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9",
      ten: "10",
      eleven: "11",
      twelve: "12",
    };

    const normalized = value.replace(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g,
      (m) => words[m]
    );

    const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] ?? "0", 10);
    const suffix = match[3];

    if (minutes > 59) return null;

    if (suffix) {
      if (suffix.toLowerCase() === "pm" && hours !== 12) hours += 12;
      if (suffix.toLowerCase() === "am" && hours === 12) hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

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

    const today = new Date();
    const [h, m] = time.split(":");
    today.setHours(parseInt(h), parseInt(m), 0, 0);

    const reminder: Reminder = {
      reminder_id: Math.floor(Math.random() * 10000),
      title,
      description,
      reminder_datetime: today.toISOString(),
      frequency: "once",
      priority: "medium",
      is_active: true,
      is_completed: false,
      created_at: new Date().toISOString(),
    };

    try {
      await apiService.updateReminder(reminder.reminder_id, reminder);
    } catch {}

    setReminders((prev) => [...prev, reminder]);

    if (options?.closeForm ?? true) {
      setIsAddingReminder(false);
    }

    speakIfEnabled(`Reminder added: ${title} at ${time}`);
  };

  const addReminder = async () => {
    await createReminder(
      newReminder.title,
      newReminder.description,
      newReminder.time
    );
    setNewReminder({ title: "", description: "", time: "" });
  };

  const readRemindersOutLoud = async () => {
    if (!reminders.length) {
      speakIfEnabled("You have no reminders.");
      return;
    }

    const speech = reminders
      .map((r, i) => {
        const t = new Date(r.reminder_datetime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `Reminder ${i + 1}: ${r.title} at ${t}.`;
      })
      .join(" ");

    speakIfEnabled(speech);
  };

  const handleVoiceCommand = async (text: string) => {
  const command = text
    .toLowerCase()
    .replace(/\./g, "")     // remove dots → p.m. → pm
    .replace(/\s+/g, " ")   // clean extra spaces
    .trim();

  setLastVoiceCommand(text);


    if (command.includes("read my reminders")) {
      await readRemindersOutLoud();
      return;
    }

    const match = command.match(
  /create(?: a)? reminder\s+(?:for\s+)?(.+?)\s+(?:at|for)\s+([\w: ]+(?:am|pm)?)/
    );


    if (match) {
      const title = match[1].trim();
      const time = normalizeSpokenTime(match[2]);
      if (!time) {
        speakIfEnabled("Time not recognized.");
        return;
      }
      setIsAddingReminder(true);
      await createReminder(title, "", time, { closeForm: false });
      return;
    }

    speakIfEnabled("Command not recognized.");
  };

  const startVoiceListening = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert("Voice unavailable", "Use a development build.");
      return;
    }

    const permission =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission?.granted) return;

    if (!listenersInitializedRef.current) {
      ExpoSpeechRecognitionModule.addListener("result", (e: any) => {
        const transcript =
          e?.results?.[0]?.transcript ??
          e?.results?.[0]?.[0]?.transcript ??
          "";
        if (transcript) handleVoiceCommand(transcript);
      });

      ExpoSpeechRecognitionModule.addListener("end", () =>
        setIsListening(false)
      );
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
      <View style={{ marginTop: 40 }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Smart Reminders</ThemedText>
        <ThemedText style={styles.subtitle}>
          Manage your daily tasks
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addButton, isListening && styles.voiceActiveButton]}
          onPress={isListening ? stopVoiceListening : startVoiceListening}
        >
          <Text style={styles.addButtonText}>
            {isListening ? "🛑 Stop Voice" : "🎤 Voice Commands"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddingReminder(!isAddingReminder)}
        >
          <Text style={styles.addButtonText}>
            {isAddingReminder ? "❌ Cancel" : "➕ Add Reminder"}
          </Text>
        </TouchableOpacity>
      </ThemedView>

      {lastVoiceCommand ? (
        <ThemedText style={styles.voiceHint}>
          Last voice command: “{lastVoiceCommand}”
        </ThemedText>
      ) : null}

      {isAddingReminder && (
        <ThemedView style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={newReminder.title}
            onChangeText={(t) =>
              setNewReminder({ ...newReminder, title: t })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={newReminder.description}
            onChangeText={(t) =>
              setNewReminder({ ...newReminder, description: t })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Time (HH:MM)"
            value={newReminder.time}
            onChangeText={(t) =>
              setNewReminder({ ...newReminder, time: t })
            }
          />
          <TouchableOpacity style={styles.saveButton} onPress={addReminder}>
            <Text style={styles.addButtonText}>Save</Text>
          </TouchableOpacity>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    backgroundColor: "#32CD32",
    padding: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 16, color: "#e8f8e8" },
  addButtonContainer: { margin: 20 },
  addButton: {
    backgroundColor: "#4A90E2",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  addButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  voiceActiveButton: { backgroundColor: "#F39C12" },
  voiceHint: {
    marginHorizontal: 20,
    marginBottom: 10,
    fontStyle: "italic",
  },
  formContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#32CD32",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
});
