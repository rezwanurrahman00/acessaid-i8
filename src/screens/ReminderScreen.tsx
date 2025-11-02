import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Modal,
  TextInput,
  Platform,
  FlatList,
} from 'react-native';
// BlurView fallback for environments without expo-blur
const BlurViewComponent: any = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-blur').BlurView;
  } catch {
    return View;
  }
})();
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { BackgroundLogo } from '../components/BackgroundLogo';
import Constants from 'expo-constants';
let Clipboard: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Clipboard = require('expo-clipboard');
} catch {
  Clipboard = { setStringAsync: async (_: string) => {} };
}

type Reminder = {
  id: string;
  title: string;
  description?: string;
  datetime: Date;
  isCompleted: boolean;
  createdAt: Date;
  hasFired?: boolean;
};

const baseKey = 'reminders_v2';
const storageKey = (userId?: string | null) => (userId ? `${baseKey}_${userId}` : baseKey);

const ReminderScreen: React.FC = () => {
  const { state } = useApp();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000));
  const [fadeIn] = useState(new Animated.Value(0));
  const [slideUp] = useState(new Animated.Value(40));
  const intervalRef = useRef<any>(null);
  const notifSubRef = useRef<Notifications.Subscription | null>(null);
  const spokenCooldownRef = useRef<Record<string, number>>({});
  const [alertReminder, setAlertReminder] = useState<Reminder | null>(null);
  const speakIntervalRef = useRef<any>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  // Optional import of DateTimePicker; fallback on web
  const DateTimePicker: any = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const key = storageKey(state.user?.id);
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsed: Reminder[] = JSON.parse(stored).map((r: any) => ({
            ...r,
            datetime: new Date(r.datetime),
            createdAt: new Date(r.createdAt),
          }));
          setReminders(parsed);
        } else {
          setReminders([]);
        }
      } catch (e) {
        console.warn('Failed to load reminders');
      }
    })();
  }, [state.user?.id]);

  useEffect(() => {
    const key = storageKey(state.user?.id);
    AsyncStorage.setItem(
      key,
      JSON.stringify(reminders.map(r => ({ ...r, datetime: r.datetime.toISOString(), createdAt: r.createdAt.toISOString() })))
    ).catch(() => {});
  }, [reminders, state.user?.id]);

  useEffect(() => {
    // Ask permissions once
    (async () => {
      await Notifications.requestPermissionsAsync();
      try {
        const projectId = (Constants as any).expoConfig?.extra?.eas?.projectId || (Constants as any).easConfig?.projectId || (Constants as any).expoConfig?.projectId;
        const tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined as any);
        if (tokenResp?.data) setPushToken(tokenResp.data);
      } catch {}
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          // For newer types
          // @ts-ignore
          shouldShowBanner: true,
          // @ts-ignore
          shouldShowList: true,
        }),
      });

      // Foreground listener to speak on receipt (iOS/Android)
      if (notifSubRef.current) {
        try { (Notifications as any).removeNotificationSubscription?.(notifSubRef.current); } catch {}
      }
      notifSubRef.current = Notifications.addNotificationReceivedListener((notification) => {
        const { title: notifTitle, body, data } = notification.request.content as any;
        const reminderId: string | undefined = data?.reminderId;
        const nowTs = Date.now();
        if (reminderId) {
          const last = spokenCooldownRef.current[reminderId] || 0;
          if (nowTs - last < 15000) {
            return; // prevent duplicates within 15s
          }
          spokenCooldownRef.current[reminderId] = nowTs;
          const rem = reminders.find(r => r.id === reminderId);
          if (rem) presentAlert(rem);
        }
      });
    })();

    // Web/background fallback checker (fires once per reminder)
    if (Platform.OS === 'web') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const now = new Date();
        reminders.forEach(rem => {
          if (!rem.isCompleted && !rem.hasFired && now.getTime() >= rem.datetime.getTime()) {
            triggerReminder(rem);
            setReminders(prev => prev.map(r => r.id === rem.id ? { ...r, hasFired: true } : r));
          }
        });
      }, 1000);
      return () => intervalRef.current && clearInterval(intervalRef.current);
    }
  }, [reminders]);

  const triggerReminder = async (rem: Reminder) => {
    try {
      // Default notification sound + TTS
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Reminder',
          body: `It's time for: ${rem.title}${rem.description ? `. ${rem.description}` : ''}`,
          sound: true,
          data: { reminderId: rem.id },
        },
        trigger: null,
      });
    } catch (_) {}
    presentAlert(rem);
  };

  const presentAlert = (rem: Reminder) => {
    setAlertReminder(rem);
    try { Speech.stop(); } catch {}
    Speech.speak(buildSpokenMessage(rem.title, rem.description));
    if (speakIntervalRef.current) clearInterval(speakIntervalRef.current);
    speakIntervalRef.current = setInterval(() => {
      // repeat speech every 7 seconds until user responds
      Speech.speak(buildSpokenMessage(rem.title, rem.description));
    }, 7000);
  };

  const handleAlertYes = () => {
    try { Speech.stop(); } catch {}
    if (speakIntervalRef.current) clearInterval(speakIntervalRef.current);
    if (alertReminder) {
      setReminders(prev => prev.map(r => r.id === alertReminder.id ? { ...r, hasFired: true } : r));
    }
    setAlertReminder(null);
  };

  const handleAlertNo = async () => {
    try { Speech.stop(); } catch {}
    if (speakIntervalRef.current) clearInterval(speakIntervalRef.current);
    if (alertReminder) {
      // Reschedule in +5 minutes
      const newDate = new Date(Date.now() + 5 * 60 * 1000);
      const updated = { ...alertReminder, datetime: newDate, hasFired: false };
      setReminders(prev => prev.map(r => r.id === alertReminder.id ? updated : r));
      await scheduleNative(updated);
    }
    setAlertReminder(null);
  };

  const scheduleNative = async (rem: Reminder) => {
    if (Platform.OS !== 'web') {
      const delayMs = Math.max(1, rem.datetime.getTime() - Date.now());
      await Notifications.scheduleNotificationAsync({
        content: { title: '⏰ Reminder', body: rem.title, sound: true, data: { reminderId: rem.id } },
        trigger: ({ date: new Date(Date.now() + delayMs) } as unknown) as Notifications.NotificationTriggerInput,
      });
    }
  };

  const openModal = () => {
    setTitle('');
    setDescription('');
    setDate(new Date(Date.now() + 60 * 60 * 1000));
    setModalVisible(true);
  };

  const handleCopyToken = async () => {
    if (!pushToken) return;
    try {
      await Clipboard.setStringAsync(pushToken);
      Alert.alert('Copied', 'Push token copied to clipboard.');
    } catch {
      Alert.alert('Error', 'Failed to copy token');
    }
  };

  const handleSendTestPush = async () => {
    if (!pushToken) return;
    try {
      setSendingTest(true);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          title: '⏰ Reminder (Test Push)',
          body: 'This is a test push notification.',
          sound: 'default',
          data: { kind: 'test' },
        }),
      });
      Alert.alert('Sent', 'Test push sent. Check your device.');
    } catch (e) {
      Alert.alert('Error', 'Failed to send test push');
    } finally {
      setSendingTest(false);
    }
  };

  const saveReminder = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a reminder title.');
      return;
    }
    if (reminders.length >= 20) {
      Alert.alert('Limit reached', 'You can only have up to 20 reminders.');
      return;
    }
    if (date.getTime() <= Date.now()) {
      Alert.alert('Invalid time', 'Please select a future date and time.');
      return;
    }
    const newReminder: Reminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      description: description.trim() || undefined,
      datetime: date,
      isCompleted: false,
      createdAt: new Date(),
    };
    setReminders(prev => [...prev, newReminder]);
    await scheduleNative(newReminder);
    setModalVisible(false);
  };

  const toggleComplete = (id: string) => {
    setReminders(prev => prev.map(r => (r.id === id ? { ...r, isCompleted: !r.isCompleted } : r)));
  };

  const removeReminder = (id: string) => {
    Alert.alert('Delete Reminder', 'Are you sure you want to delete this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setReminders(prev => prev.filter(r => r.id !== id)) },
    ]);
  };

  const renderItem = ({ item }: { item: Reminder }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardSubtitle}>🔔 {formatPreview(item.datetime)}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => toggleComplete(item.id)} style={styles.actionBtn} accessibilityLabel={item.isCompleted ? 'Mark as active' : 'Mark as completed'}>
          <Ionicons name={item.isCompleted ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={item.isCompleted ? '#34C759' : '#8E8E93'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeReminder(item.id)} style={styles.actionBtn} accessibilityLabel="Delete reminder">
          <Ionicons name="trash" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <BackgroundLogo />
      <Animated.View style={[styles.header, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}> 
        <Text style={styles.headerTitle}>Reminders</Text>
        <Text style={styles.headerSubtitle}>{reminders.filter(r => !r.isCompleted).length} Active • {reminders.length}/20 Total</Text>
        {!!pushToken && (
          <>
            <Text style={[styles.preview, { marginTop: 6 }]} numberOfLines={1}>Push Token: {pushToken}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity onPress={handleCopyToken} style={[styles.btn, styles.btnCancel, { flex: undefined, paddingHorizontal: 12 }]}>
                <Text style={[styles.btnText, { color: '#8E8E93' }]}>Copy Token</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={sendingTest} onPress={handleSendTestPush} style={[styles.btn, styles.btnPrimary, { flex: undefined, paddingHorizontal: 12, opacity: sendingTest ? 0.6 : 1 }]}>
                <Text style={[styles.btnText, { color: '#fff' }]}>{sendingTest ? 'Sending…' : 'Send Test Push'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>

      <FlatList
        data={reminders.sort((a, b) => a.datetime.getTime() - b.datetime.getTime())}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No reminders yet. Tap + to add one.</Text>}
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openModal} accessibilityLabel="Add Reminder">
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <BlurViewComponent intensity={40} tint={Platform.OS === 'ios' ? 'systemThinMaterial' : 'light'} style={styles.blurFill} />
          <Animated.View style={[styles.sheet, { opacity: fadeIn }]}> 
            <Text style={styles.sheetTitle}>⏰ Set Reminder</Text>
            <TextInput
              style={styles.input}
              placeholder="Reminder Title"
              placeholderTextColor="#8E8E93"
              value={title}
              onChangeText={setTitle}
              returnKeyType="done"
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Description (optional)"
              placeholderTextColor="#8E8E93"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {DateTimePicker ? (
              <View style={{ marginTop: 8 }}>
                <DateTimePicker
                  value={date}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_: any, selected?: Date) => {
                    if (selected) setDate(selected);
                  }}
                  minimumDate={new Date()}
                />
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.preview}>Pickers not supported on web. Enter ISO date-time:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD HH:MM"
                  placeholderTextColor="#8E8E93"
                  value={formatISOInput(date)}
                  onChangeText={(t) => {
                    const parsed = parseISOInput(t);
                    if (parsed) setDate(parsed);
                  }}
                />
              </View>
            )}

            <Text style={styles.preview}>🔔 {`Reminder set for ${formatPreview(date)}`}</Text>
            {!!description && (
              <Text style={[styles.preview, { marginTop: 4 }]} numberOfLines={2}>📝 {description}</Text>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.btnText, { color: '#8E8E93' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={saveReminder}>
                <Text style={[styles.btnText, { color: '#fff' }]}>Save Reminder</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Real-time Alert Modal */}
      <Modal visible={!!alertReminder} transparent animationType="fade" onRequestClose={handleAlertYes}>
        <View style={styles.modalBackdrop}>
          <BlurViewComponent intensity={50} tint={Platform.OS === 'ios' ? 'systemChromeMaterial' : 'light'} style={styles.blurFill} />
          <Animated.View style={[styles.sheet, { opacity: fadeIn }]}> 
            <Text style={styles.sheetTitle}>🔔 Reminder</Text>
            <Text style={[styles.preview, { marginTop: 8 }]}>{alertReminder?.title}</Text>
            {!!alertReminder?.description && (
              <Text style={[styles.preview, { marginTop: 6 }]} numberOfLines={3}>{alertReminder?.description}</Text>
            )}
            <Text style={[styles.preview, { marginTop: 6 }]}>{formatPreview(alertReminder?.datetime || new Date())}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={handleAlertNo}>
                <Text style={[styles.btnText, { color: '#8E8E93' }]}>No (Remind in 5m)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleAlertYes}>
                <Text style={[styles.btnText, { color: '#fff' }]}>Yes (Done)</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const formatPreview = (d: Date) => {
  try {
    return d.toLocaleString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  } catch {
    return d.toISOString();
  }
};

const formatISOInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const parseISOInput = (t: string) => {
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [_, y, mo, da, h, mi] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(da), Number(h), Number(mi), 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
};

const buildSpokenMessage = (title: string, description?: string) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const intro = `${greeting}. User, this is your reminder for ${title}.`;
  const desc = description ? ` ${description}.` : '';
  return `${intro}${desc} Please take action now.`;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#111' },
  headerSubtitle: { marginTop: 4, color: '#6B7280' },
  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 40 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  cardSubtitle: { marginTop: 6, color: '#6B7280' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { paddingHorizontal: 8, paddingVertical: 6 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', padding: 20 },
  blurFill: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#111' },
  input: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111',
    backgroundColor: '#F9FAFB',
  },
  preview: { marginTop: 12, color: '#6B7280' },
  actionsRow: { flexDirection: 'row', marginTop: 18, gap: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnCancel: { backgroundColor: '#EFEFF4' },
  btnPrimary: { backgroundColor: '#007AFF', shadowColor: '#007AFF', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  btnText: { fontWeight: '600' },
});

export default ReminderScreen;
