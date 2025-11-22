import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  ScrollView,
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
import { AppTheme, getThemeConfig } from '../../constants/theme';
let Clipboard: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Clipboard = require('expo-clipboard');
} catch {
  Clipboard = { setStringAsync: async (_: string) => {} };
}
type ReminderCategory = 'personal' | 'work' | 'health' | 'finance' | 'shopping' | 'other';
type ReminderPriority = 'low' | 'medium' | 'high';
type ReminderRecurrence = 'once' | 'daily' | 'weekly' | 'monthly';

type Reminder = {
  id: string;
  title: string;
  description?: string;
  datetime: Date;
  isCompleted: boolean;
  createdAt: Date;
  hasFired?: boolean;
  category?: ReminderCategory;
  priority?: ReminderPriority;
  recurrence?: ReminderRecurrence;
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
  const [category, setCategory] = useState<ReminderCategory>('personal');
  const [priority, setPriority] = useState<ReminderPriority>('medium');
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('once');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<ReminderCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [showFilters, setShowFilters] = useState(false);
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

  const theme = useMemo(() => getThemeConfig(state.accessibilitySettings.isDarkMode), [state.accessibilitySettings.isDarkMode]);
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
     // Announce screen load
    setTimeout(() => {
      Speech.speak('You are on the Reminders page. Here you can create, view, and manage your reminders.');
    }, 500);
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
    setCategory('personal');
    setPriority('medium');
    setRecurrence('once');
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
    if (reminders.length >= 50) {
      Alert.alert('Limit reached', 'You can only have up to 50 reminders.');
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
      category,
      priority,
      recurrence,
    };
    setReminders(prev => [...prev, newReminder]);
    await scheduleNative(newReminder);
      // Schedule recurring reminders
    if (recurrence !== 'once') {
      scheduleRecurringReminders(newReminder);
    }
    setModalVisible(false);
    Speech.speak(`Reminder "${title.trim()}" created successfully`);
  };

  const scheduleRecurringReminders = async (reminder: Reminder) => {
    // Schedule future occurrences for recurring reminders
    const occurrences = 5; // Schedule next 5 occurrences
    for (let i = 1; i <= occurrences; i++) {
      const nextDate = new Date(reminder.datetime);
      if (reminder.recurrence === 'daily') {
        nextDate.setDate(nextDate.getDate() + i);
      } else if (reminder.recurrence === 'weekly') {
        nextDate.setDate(nextDate.getDate() + (i * 7));
      } else if (reminder.recurrence === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + i);
      }
      
      if (Platform.OS !== 'web' && nextDate.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content: { 
            title: '⏰ Recurring Reminder', 
            body: reminder.title, 
            sound: true, 
            data: { reminderId: reminder.id } 
          },
          trigger: ({ date: nextDate } as unknown) as Notifications.NotificationTriggerInput,
        });
      }
    }
  };

  const toggleComplete = (id: string) => {
    setReminders(prev => prev.map(r => (r.id === id ? { ...r, isCompleted: !r.isCompleted } : r)));
  };

  const removeReminder = (id: string) => {
    Alert.alert('Delete Reminder', 'Are you sure you want to delete this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: () => {
          setReminders(prev => prev.filter(r => r.id !== id));
          Speech.speak('Reminder deleted');
        }
      },
    ]);
  };
  const getCategoryIcon = (cat?: ReminderCategory) => {
    switch (cat) {
      case 'work': return '💼';
      case 'health': return '❤️';
      case 'finance': return '💰';
      case 'shopping': return '🛒';
      case 'personal': return '👤';
      default: return '📌';
    }
  };

  const getPriorityColor = (pri?: ReminderPriority) => {
    switch (pri) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getRecurrenceText = (rec?: ReminderRecurrence) => {
    switch (rec) {
      case 'daily': return '🔁 Daily';
      case 'weekly': return '🔁 Weekly';
      case 'monthly': return '🔁 Monthly';
      default: return '🔔 Once';
    }
  };

  // Filter reminders
  const filteredReminders = useMemo(() => {
    let filtered = reminders;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(r => r.category === filterCategory);
    }

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(r => !r.isCompleted);
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(r => r.isCompleted);
    }

    return filtered.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  }, [reminders, searchQuery, filterCategory, filterStatus]);


  const renderItem = ({ item }: { item: Reminder }) => (
     <TouchableOpacity 
      style={[
        styles.card,
        item.isCompleted && styles.cardCompleted
      ]}
      activeOpacity={0.7}
      onPress={() => {
        const msg = `${item.title}. ${item.description || ''}. Scheduled for ${formatPreview(item.datetime)}`;
        Speech.speak(msg);
      }}
    >
      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority) }]}/>
      <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 20, marginRight: 8 }}>{getCategoryIcon(item.category)}</Text>
          <Text style={[styles.cardTitle, item.isCompleted && styles.cardTitleCompleted]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        {item.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 }}>
          <Text style={styles.cardSubtitle}>🔔 {formatPreview(item.datetime)}</Text>
          <Text style={[styles.recurrenceBadge, { color: theme.accent }]}>{getRecurrenceText(item.recurrence)}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity 
          onPress={() => toggleComplete(item.id)} 
          style={styles.actionBtn} 
          accessibilityLabel={item.isCompleted ? 'Mark as active' : 'Mark as completed'}
        >
          <Ionicons 
            name={item.isCompleted ? 'checkmark-circle' : 'ellipse-outline'} 
            size={24} 
            color={item.isCompleted ? theme.success : theme.textMuted} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => removeReminder(item.id)} 
          style={styles.actionBtn} 
          accessibilityLabel="Delete reminder"
        >
          <Ionicons name="trash" size={22} color={theme.danger} />
        </TouchableOpacity>
      </View>
    
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <BackgroundLogo />
      <Animated.View style={[styles.header, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}> 
      <Text style={styles.headerTitle}>✨ Reminders</Text>
      <Text style={styles.headerSubtitle}>
          {filteredReminders.filter(r => !r.isCompleted).length} Active • {reminders.length}/50 Total
      </Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reminders..."
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Button */}
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={18} color={theme.textInverted} />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>

        {/* Filters Panel */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <Text style={styles.filterLabel}>Category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {(['all', 'personal', 'work', 'health', 'finance', 'shopping', 'other'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    filterCategory === cat && styles.filterChipActive
                  ]}
                  onPress={() => setFilterCategory(cat)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterCategory === cat && styles.filterChipTextActive
                  ]}>
                    {cat === 'all' ? '🌟 All' : `${getCategoryIcon(cat as ReminderCategory)} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>Status:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {(['all', 'active', 'completed'] as const).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    filterStatus === status && styles.filterChipActive
                  ]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterStatus === status && styles.filterChipTextActive
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}

            </View>
          </View>
          
        )}
      </Animated.View>

      <FlatList
        data={filteredReminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>
              {searchQuery || filterCategory !== 'all' || filterStatus !== 'all' 
                ? 'No reminders match your filters' 
                : 'No reminders yet. Tap + to add one.'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openModal} accessibilityLabel="Add Reminder">
        <Ionicons name="add" size={28} color={theme.textInverted} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <BlurViewComponent intensity={40} tint={Platform.OS === 'ios' ? 'systemThinMaterial' : 'light'} style={styles.blurFill} />
          <View style={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
            <Animated.View style={[styles.sheet, { opacity: fadeIn }]}> 
              <Text style={styles.sheetTitle}>⏰ Create Reminder</Text>
              
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '80%' }}>
                <TextInput
                  style={styles.input}
                  placeholder="Reminder Title *"
                  placeholderTextColor={theme.placeholder}
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="done"
                />
                
                
              
              <TextInput
                style={[styles.input, { marginTop: 8, minHeight: 60 }]}
                placeholder="Description (optional)"
                placeholderTextColor={theme.placeholder}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              {/* Category Selector */}
              <Text style={styles.sectionLabel}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {(['personal', 'work', 'health', 'finance', 'shopping', 'other'] as ReminderCategory[]).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipActive
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={{ fontSize: 18 }}>{getCategoryIcon(cat)}</Text>
                    <Text style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextActive
                    ]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Priority Selector */}
              <Text style={styles.sectionLabel}>Priority</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {(['low', 'medium', 'high'] as ReminderPriority[]).map(pri => (
                  <TouchableOpacity
                    key={pri}
                    style={[
                      styles.priorityChip,
                      { borderColor: getPriorityColor(pri) },
                      priority === pri && { backgroundColor: getPriorityColor(pri) }
                    ]}
                    onPress={() => setPriority(pri)}
                  >
                    <Text style={[
                      styles.priorityChipText,
                      { color: priority === pri ? '#FFF' : getPriorityColor(pri) }
                    ]}>
                      {pri.charAt(0).toUpperCase() + pri.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Recurrence Selector */}
              <Text style={styles.sectionLabel}>Repeat</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {(['once', 'daily', 'weekly', 'monthly'] as ReminderRecurrence[]).map(rec => (
                  <TouchableOpacity
                    key={rec}
                    style={[
                      styles.recurrenceChip,
                      recurrence === rec && styles.recurrenceChipActive
                    ]}
                    onPress={() => setRecurrence(rec)}
                  >
                    <Text style={[
                      styles.recurrenceChipText,
                      recurrence === rec && styles.recurrenceChipTextActive
                    ]}>
                      {rec === 'once' ? 'Once' : rec.charAt(0).toUpperCase() + rec.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date Time Picker */}
              <Text style={styles.sectionLabel}>Date & Time</Text>
              {DateTimePicker ? (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={date}
                    mode="datetime"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_: any, selected?: Date) => {
                      if (selected) setDate(selected);
                    }}
                    minimumDate={new Date()}
                    textColor={theme.textPrimary}
                    style={styles.datePicker}
                  />
                </View>
              ) : (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.preview}>Pickers not supported on web. Enter ISO date-time:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD HH:MM"
                    placeholderTextColor={theme.placeholder}
                    value={formatISOInput(date)}
                    onChangeText={(t) => {
                      const parsed = parseISOInput(t);
                      if (parsed) setDate(parsed);
                    }}
                  />
                </View>
              )}

              <View style={styles.previewBox}>
                <Text style={styles.preview}>🔔 {formatPreview(date)}</Text>
                {!!description && (
                  <Text style={[styles.preview, { marginTop: 4 }]} numberOfLines={2}>📝 {description}</Text>
                )}
              </View>
              </ScrollView>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.btnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, !title.trim() && styles.btnDisabled, { opacity: title.trim() ? 1 : 0.6 }]}
                  onPress={saveReminder}
                  disabled={!title.trim()}
                >
                  <Text style={[styles.btnText, { color: theme.textInverted }]}>Create Reminder</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
          


            
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
                <Text style={[styles.btnText, { color: theme.textSecondary }]}>No (Remind in 5m)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleAlertYes}>
                <Text style={[styles.btnText, { color: theme.textInverted }]}>Yes (Done)</Text>
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

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      paddingTop: 52,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
       headerTitle: { fontSize: 32, fontWeight: '700', color: theme.textPrimary },
    headerSubtitle: { marginTop: 4, color: theme.textSecondary, fontSize: 15 },
    
    // Search & Filters
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginTop: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.inputBorder,
    },
    searchInput: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: 16,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginTop: 12,
      gap: 6,
    },
    filterButtonText: {
      color: theme.textInverted,
      fontWeight: '600',
      fontSize: 15,
    },
    filtersPanel: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 14,
      marginTop: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.cardBorder,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.tagBackground,
      marginRight: 8,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    filterChipActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    filterChipText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: theme.textInverted,
      fontWeight: '600',
    },

    // Empty State
    emptyContainer: {
      alignItems: 'center',
      marginTop: 60,
      paddingHorizontal: 40,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyText: { 
      textAlign: 'center', 
      color: theme.textMuted, 
      fontSize: 16,
      lineHeight: 24,
    },
    //Cards
    card: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: theme.isDark ? 6 : 4 },
      shadowOpacity: theme.isDark ? 0.25 : 0.08,
      shadowRadius: theme.isDark ? 14 : 10,
      elevation: theme.isDark ? 6 : 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: theme.isDark ? 1 : StyleSheet.hairlineWidth,
      borderColor: theme.cardBorder,
      overflow: 'hidden',
    },
    cardCompleted: {
      opacity: 0.6,
    },
    priorityIndicator: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    
    },
    cardTitle: { 
      fontSize: 17, 
      fontWeight: '600', 
      color: theme.textPrimary,
      lineHeight: 22,
    },
    cardTitleCompleted: {
      textDecorationLine: 'line-through',
      color: theme.textMuted,
    },
    cardDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
      lineHeight: 20,
    },
    cardSubtitle: { 
      fontSize: 13, 
      color: theme.textSecondary 
    },
    recurrenceBadge: {
      fontSize: 12,
      fontWeight: '600',
    },
    cardActions: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: { paddingHorizontal: 8, paddingVertical: 6 },

    fab: {
      position: 'absolute',
      right: 20,
      bottom: 30,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.fabBackground,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.fabShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: theme.isDark ? 0.35 : 0.2,
      shadowRadius: 12,
      elevation: 6,
    },

    //Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: theme.overlay,
      
    },
    blurFill: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
    sheet: {
      backgroundColor: theme.modalBackground,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 20,
      shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.isDark ? 0.35 : 0.15,
      shadowRadius: theme.isDark ? 24 : 18,
      elevation: 8,
      borderWidth: theme.isDark ? 1 : StyleSheet.hairlineWidth,
      borderColor: theme.cardBorder,
      maxHeight: '90%',
    },
    sheetTitle: { 
      fontSize: 24, 
      fontWeight: '700', 
      color: theme.textPrimary,
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textPrimary,
      marginTop: 12,
      marginBottom: 8,
    },
    input: {
      marginTop: 12,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.inputBorder,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.textPrimary,
      backgroundColor: theme.inputBackground,
      fontSize: 16,
    },
     // Date Picker Styles
    datePickerContainer: {
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.inputBorder,
      marginTop: 8,
      padding: 8,
      alignItems: 'center',
      overflow: 'hidden',
    },
    datePicker: {
      width: '100%',
      height: 200,
    },
    
    // Category Chips
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.tagBackground,
      marginRight: 10,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    categoryChipActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    categoryChipText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    categoryChipTextActive: {
      color: theme.textInverted,
      fontWeight: '600',
    },

    // Priority Chips
    priorityChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 2,
    },
    priorityChipText: {
      fontSize: 14,
      fontWeight: '600',
    },

    // Recurrence Chips
    recurrenceChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.tagBackground,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    recurrenceChipActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    recurrenceChipText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    recurrenceChipTextActive: {
      color: theme.textInverted,
      fontWeight: '600',
    },

    previewBox: {
      backgroundColor: theme.tagBackground,
      borderRadius: 12,
      padding: 12,
      marginTop: 12,
    },
    preview: { 
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    actionsRow: { flexDirection: 'row', marginTop: 20, gap: 12 },
   
    btn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    btnCancel: {
      backgroundColor: theme.tagBackground,
    },
    btnPrimary: {
      backgroundColor: theme.accent,
      shadowColor: theme.accent,
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
    btnDisabled: {
      backgroundColor: theme.accentSoft,
      shadowOpacity: 0,
    },
    btnText: { fontWeight: '600', fontSize: 16 },
  });

export default ReminderScreen;
