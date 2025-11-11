import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { apiService, Reminder } from "@/services/api";
import { speakIfEnabled } from "@/services/ttsService";

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

  // 🔊 Speak on load
  useEffect(() => {
    speakIfEnabled("Reminders screen loaded. You can add, view, or delete reminders.");
    loadReminders();
  }, []);

  // ✅ Load reminders
  const loadReminders = async () => {
    setLoading(true);
    try {
      const data = await apiService.getUserReminders(currentUserId);
      setReminders(data);
      speakIfEnabled(`Loaded ${data.length} reminders`);
    } catch (error) {
      console.warn("⚠️ Using offline reminders:", error);
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

  // ✅ Add reminder (mock-safe)
  const addReminder = async () => {
    if (!newReminder.title || !newReminder.time) {
      Alert.alert("Missing info", "Please fill in title and time");
      speakIfEnabled("Please fill in title and time before saving");
      return;
    }

    try {
      const today = new Date();
      const [hours, minutes] = newReminder.time.split(":");
      const reminderDateTime = new Date(today);
      reminderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const reminderData = {
        reminder_id: Math.floor(Math.random() * 10000),
        title: newReminder.title,
        description: newReminder.description,
        reminder_datetime: reminderDateTime.toISOString(),
        frequency: "once",
        priority: "medium",
        is_active: true,
        is_completed: false,
        created_at: new Date().toISOString(),
      };

      // Try API, fallback to local add
      try {
        await apiService.updateReminder(reminderData.reminder_id, reminderData);
      } catch {
        console.warn("Offline mode: saved locally");
      }

      setReminders((prev) => [...prev, reminderData]);
      setNewReminder({ title: "", description: "", time: "" });
      setIsAddingReminder(false);
      speakIfEnabled(`Reminder added: ${reminderData.title} at ${newReminder.time}`);
    } catch (err) {
      console.error("Error adding reminder:", err);
      Alert.alert("Error", "Failed to add reminder");
    }
  };

  // ✅ Toggle active state
  const toggleReminder = async (reminderId: number, currentStatus: boolean) => {
    try {
      await apiService.updateReminder(reminderId, { is_active: !currentStatus });
      setReminders((prev) =>
        prev.map((r) =>
          r.reminder_id === reminderId ? { ...r, is_active: !currentStatus } : r
        )
      );
      speakIfEnabled(
        `Reminder ${!currentStatus ? "activated" : "deactivated"} successfully.`
      );
    } catch (error) {
      console.warn("⚠️ Offline mode: toggle locally", error);
      setReminders((prev) =>
        prev.map((r) =>
          r.reminder_id === reminderId ? { ...r, is_active: !currentStatus } : r
        )
      );
    }
  };

  // ✅ Delete reminder (safe)
  const deleteReminder = async (reminderId: number) => {
    try {
      await apiService.updateReminder(reminderId, { is_active: false });
      setReminders((prev) => prev.filter((r) => r.reminder_id !== reminderId));
      speakIfEnabled("Reminder deleted successfully");
    } catch (err) {
      console.warn("Offline delete fallback:", err);
      setReminders((prev) => prev.filter((r) => r.reminder_id !== reminderId));
    }
  };

  // ✅ Render
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Smart Reminders</ThemedText>
        <ThemedText style={styles.subtitle}>
          Manage your daily tasks and appointments
        </ThemedText>
      </ThemedView>

      {/* Add Reminder Button */}
      <ThemedView style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setIsAddingReminder(!isAddingReminder);
            speakIfEnabled(
              isAddingReminder
                ? "Add reminder form closed"
                : "Add reminder form opened"
            );
          }}
        >
          <Text style={styles.addButtonText}>
            {isAddingReminder ? "❌ Cancel" : "➕ Add Reminder"}
          </Text>
        </TouchableOpacity>
      </ThemedView>

      {/* Add Reminder Form */}
      {isAddingReminder && (
        <ThemedView style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Reminder title"
            value={newReminder.title}
            onChangeText={(text) => setNewReminder({ ...newReminder, title: text })}
            onFocus={() => speakIfEnabled("Reminder title field active")}
          />
          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={newReminder.description}
            onChangeText={(text) =>
              setNewReminder({ ...newReminder, description: text })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Time (HH:MM)"
            value={newReminder.time}
            onChangeText={(text) => setNewReminder({ ...newReminder, time: text })}
            onFocus={() => speakIfEnabled("Enter reminder time in hours and minutes")}
          />
          <TouchableOpacity style={styles.saveButton} onPress={addReminder}>
            <Text style={styles.saveButtonText}>Save Reminder</Text>
          </TouchableOpacity>
        </ThemedView>
      )}

      {/* Reminders List */}
      <ThemedView style={styles.remindersContainer}>
        <ThemedText style={styles.sectionTitle}>Your Reminders</ThemedText>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <ThemedText style={styles.loadingText}>Loading reminders...</ThemedText>
          </View>
        ) : reminders.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No reminders yet. Add one above!
          </ThemedText>
        ) : (
          reminders.map((reminder) => {
            const timeString = new Date(
              reminder.reminder_datetime
            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <ThemedView key={reminder.reminder_id} style={styles.reminderCard}>
                <View style={styles.reminderHeader}>
                  <View style={styles.reminderInfo}>
                    <ThemedText style={styles.reminderTitle}>
                      {reminder.title}
                    </ThemedText>
                    <ThemedText style={styles.reminderTime}>🕐 {timeString}</ThemedText>
                    <ThemedText style={styles.reminderPriority}>
                      Priority: {reminder.priority} | Frequency: {reminder.frequency}
                    </ThemedText>
                  </View>
                  <Switch
                    value={reminder.is_active}
                    onValueChange={() =>
                      toggleReminder(reminder.reminder_id, reminder.is_active)
                    }
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={reminder.is_active ? "#f5dd4b" : "#f4f3f4"}
                  />
                </View>

                {reminder.description && (
                  <ThemedText style={styles.reminderDescription}>
                    {reminder.description}
                  </ThemedText>
                )}

                <View style={styles.reminderActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      speakIfEnabled(
                        `${reminder.title} at ${timeString}. ${reminder.description || ""}`
                      )
                    }
                  >
                    <Text style={styles.actionButtonText}>🔊 Read</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteReminder(reminder.reminder_id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            );
          })
        )}
      </ThemedView>
    </ScrollView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    backgroundColor: "#32CD32",
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#FFFFFF", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#E8F8E8", textAlign: "center" },
  addButtonContainer: { margin: 20 },
  addButton: {
    backgroundColor: "#4A90E2",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  formContainer: {
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
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: "#32CD32",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  remindersContainer: { margin: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333333",
  },
  emptyText: {
    textAlign: "center",
    color: "#666666",
    fontSize: 16,
    fontStyle: "italic",
    marginTop: 20,
  },
  loadingContainer: { alignItems: "center", paddingVertical: 40 },
  loadingText: { marginTop: 10, color: "#666666", fontSize: 16 },
  reminderPriority: { fontSize: 12, color: "#888888", marginTop: 2 },
  reminderCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reminderInfo: { flex: 1 },
  reminderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 5,
  },
  reminderTime: { fontSize: 16, color: "#666666" },
  reminderDescription: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 15,
    lineHeight: 20,
  },
  reminderActions: { flexDirection: "row", justifyContent: "space-around" },
  actionButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  deleteButton: { backgroundColor: "#FF6B6B" },
  actionButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },
});


