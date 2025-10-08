import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert, 
  StyleSheet,
  Switch,
  ActivityIndicator
} from 'react-native';
import * as Speech from 'expo-speech';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiService, Reminder } from '@/services/api';

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId] = useState(1); // For demo, using user ID 1

  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    time: '',
  });

  const [isAddingReminder, setIsAddingReminder] = useState(false);

  // Load reminders from backend
  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUserReminders(currentUserId);
      setReminders(data);
    } catch (error) {
      console.error('Error loading reminders:', error);
      Alert.alert('Error', 'Failed to load reminders. Using offline mode.');
      // Fallback to local data
      setReminders([
        {
          reminder_id: 1,
          title: 'Take Medication',
          description: 'Morning blood pressure medication',
          reminder_datetime: new Date(Date.now() + 3600000).toISOString(),
          frequency: 'daily',
          priority: 'high',
          is_active: true,
          is_completed: false,
          created_at: new Date().toISOString(),
        },
        {
          reminder_id: 2,
          title: 'Doctor Appointment',
          description: 'Annual checkup with Dr. Smith',
          reminder_datetime: new Date(Date.now() + 7200000).toISOString(),
          frequency: 'once',
          priority: 'urgent',
          is_active: true,
          is_completed: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string) => {
    Speech.speak(text, {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      language: 'en-US',
    });
  };

  const addReminder = async () => {
    if (!newReminder.title || !newReminder.time) {
      Alert.alert('Error', 'Please fill in title and time');
      return;
    }

    try {
      // Create datetime from time input
      const today = new Date();
      const [hours, minutes] = newReminder.time.split(':');
      const reminderDateTime = new Date(today);
      reminderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const newReminderData = await apiService.createReminder(currentUserId, {
        title: newReminder.title,
        description: newReminder.description,
        reminder_datetime: reminderDateTime.toISOString(),
        frequency: 'once',
        priority: 'medium',
      });

      setReminders([...reminders, newReminderData]);
      setNewReminder({ title: '', description: '', time: '' });
      setIsAddingReminder(false);
      speakText(`Reminder added: ${newReminderData.title} at ${newReminder.time}`);
    } catch (error) {
      console.error('Error adding reminder:', error);
      Alert.alert('Error', 'Failed to add reminder. Please try again.');
    }
  };

  const toggleReminder = async (reminderId: number, currentStatus: boolean) => {
    try {
      await apiService.updateReminder(reminderId, {
        is_active: !currentStatus,
      });
      
      setReminders(reminders.map(reminder => 
        reminder.reminder_id === reminderId 
          ? { ...reminder, is_active: !currentStatus }
          : reminder
      ));
    } catch (error) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', 'Failed to update reminder. Please try again.');
    }
  };

  const deleteReminder = async (reminderId: number) => {
    try {
      await apiService.deleteReminder(reminderId);
      const reminder = reminders.find(r => r.reminder_id === reminderId);
      setReminders(reminders.filter(reminder => reminder.reminder_id !== reminderId));
      if (reminder) {
        speakText(`Reminder deleted: ${reminder.title}`);
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
      Alert.alert('Error', 'Failed to delete reminder. Please try again.');
    }
  };

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
            speakText(isAddingReminder ? 'Add reminder form closed' : 'Add reminder form opened');
          }}
          accessibilityLabel="Add new reminder"
          accessibilityHint="Double tap to open form for adding a new reminder"
        >
          <Text style={styles.addButtonText}>
            {isAddingReminder ? '❌ Cancel' : '➕ Add Reminder'}
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
            accessibilityLabel="Reminder title input"
          />
          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={newReminder.description}
            onChangeText={(text) => setNewReminder({ ...newReminder, description: text })}
            accessibilityLabel="Reminder description input"
          />
          <TextInput
            style={styles.input}
            placeholder="Time (HH:MM)"
            value={newReminder.time}
            onChangeText={(text) => setNewReminder({ ...newReminder, time: text })}
            accessibilityLabel="Reminder time input"
          />
          <TouchableOpacity
            style={styles.saveButton}
            onPress={addReminder}
            accessibilityLabel="Save reminder"
          >
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
            const reminderTime = new Date(reminder.reminder_datetime);
            const timeString = reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <ThemedView key={reminder.reminder_id} style={styles.reminderCard}>
                <View style={styles.reminderHeader}>
                  <View style={styles.reminderInfo}>
                    <ThemedText style={styles.reminderTitle}>
                      {reminder.title}
                    </ThemedText>
                    <ThemedText style={styles.reminderTime}>
                      🕐 {timeString}
                    </ThemedText>
                    <ThemedText style={styles.reminderPriority}>
                      Priority: {reminder.priority} | Frequency: {reminder.frequency}
                    </ThemedText>
                  </View>
                  <Switch
                    value={reminder.is_active}
                    onValueChange={() => toggleReminder(reminder.reminder_id, reminder.is_active)}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={reminder.is_active ? '#f5dd4b' : '#f4f3f4'}
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
                    onPress={() => speakText(`${reminder.title} at ${timeString}. ${reminder.description || ''}`)}
                    accessibilityLabel={`Read reminder: ${reminder.title}`}
                  >
                    <Text style={styles.actionButtonText}>🔊 Read</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteReminder(reminder.reminder_id)}
                    accessibilityLabel={`Delete reminder: ${reminder.title}`}
                  >
                    <Text style={styles.actionButtonText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            );
          })
        )}
      </ThemedView>

      {/* Quick Actions */}
      <ThemedView style={styles.quickActionsContainer}>
        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              const activeReminders = reminders.filter(r => r.isActive);
              speakText(`You have ${activeReminders.length} active reminders`);
            }}
            accessibilityLabel="Check active reminders"
          >
            <Text style={styles.quickActionText}>📊 Check Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              const nextReminder = reminders
                .filter(r => r.isActive)
                .sort((a, b) => a.time.localeCompare(b.time))[0];
              
              if (nextReminder) {
                speakText(`Next reminder: ${nextReminder.title} at ${nextReminder.time}`);
              } else {
                speakText('No active reminders scheduled');
              }
            }}
            accessibilityLabel="Check next reminder"
          >
            <Text style={styles.quickActionText}>⏰ Next Up</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#32CD32',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F8E8',
    textAlign: 'center',
  },
  addButtonContainer: {
    margin: 20,
  },
  addButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#32CD32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  remindersContainer: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
    fontSize: 16,
  },
  reminderPriority: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  reminderTime: {
    fontSize: 16,
    color: '#666666',
  },
  reminderDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
    lineHeight: 20,
  },
  reminderActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickActionsContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    backgroundColor: '#6C7B7F',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
