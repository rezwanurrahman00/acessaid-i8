import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useAccessibilitySettings } from '@/hooks/useAccessibilitySettings';
import { speakIfEnabled } from '@/services/ttsService';
import {
  ACTIVITY_COLOR,
  ACTIVITY_EMOJI,
  ActivityEntry,
  ActivityType,
  clearActivityLog,
  getActivityLog,
  getWeeklyStats,
} from '@/src/utils/activityLogger';

// shows time in a friendly way instead of a raw date
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

const ALL_TYPES: ActivityType[] = ['tts', 'ocr', 'voice', 'reminder', 'sos', 'community'];

const TYPE_LABELS: Record<ActivityType, string> = {
  tts:       'Voice',
  ocr:       'OCR',
  voice:     'Cmd',
  reminder:  'Reminder',
  sos:       'SOS',
  community: 'Community',
};

// small card showing count for each feature this week
type StatCardProps = {
  type: ActivityType;
  count: number;
  isDark: boolean;
  scale: (n: number) => number;
};

const StatCard = ({ type, count, isDark, scale }: StatCardProps) => {
  const bg = isDark ? '#1F2937' : '#F8FAFC';
  const border = isDark ? '#334155' : '#E2E8F0';
  return (
    <View style={[statStyles.card, { backgroundColor: bg, borderColor: border }]}>
      <Text style={statStyles.emoji}>{ACTIVITY_EMOJI[type]}</Text>
      <Text style={[statStyles.count, { color: ACTIVITY_COLOR[type], fontSize: scale(22) }]}>
        {count}
      </Text>
      <Text style={[statStyles.label, { color: isDark ? '#94A3B8' : '#6B7280', fontSize: scale(11) }]}>
        {TYPE_LABELS[type]}
      </Text>
    </View>
  );
};

const statStyles = StyleSheet.create({
  card: {
    width: 80,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginRight: 10,
  },
  emoji: { fontSize: 22, marginBottom: 4 },
  count: { fontWeight: '800' },
  label: { fontWeight: '600', marginTop: 2 },
});

// filter pill to show only one type of activity
type PillProps = {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
  isDark: boolean;
  scale: (n: number) => number;
};

const FilterPill = ({ label, active, color, onPress, isDark, scale }: PillProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      pillStyles.pill,
      {
        backgroundColor: active ? color : isDark ? '#1E293B' : '#F1F5F9',
        borderColor: active ? color : isDark ? '#334155' : '#E2E8F0',
      },
    ]}
  >
    <Text style={[pillStyles.text, { color: active ? '#fff' : isDark ? '#94A3B8' : '#6B7280', fontSize: scale(12) }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  text: { fontWeight: '600' },
});

// each row in the activity list
type RowProps = {
  item: ActivityEntry;
  isDark: boolean;
  scale: (n: number) => number;
};

const ActivityRow = ({ item, isDark, scale }: RowProps) => {
  const bg      = isDark ? '#1F2937' : '#FFFFFF';
  const border  = isDark ? '#334155' : '#F1F5F9';
  const textCol = isDark ? '#F8FAFC' : '#1F2933';
  const mutedCol = isDark ? '#64748B' : '#9CA3AF';
  const dotColor = ACTIVITY_COLOR[item.type];

  return (
    <View style={[rowStyles.row, { backgroundColor: bg, borderBottomColor: border }]}>
      <View style={[rowStyles.dot, { backgroundColor: dotColor }]} />
      <View style={rowStyles.info}>
        <View style={rowStyles.topLine}>
          <Text>{ACTIVITY_EMOJI[item.type]}</Text>
          <Text style={[rowStyles.label, { color: textCol, fontSize: scale(14) }]} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
        <Text style={[rowStyles.time, { color: mutedCol, fontSize: scale(12) }]}>
          {relativeTime(item.timestamp)}
        </Text>
      </View>
      <View style={[rowStyles.badge, { backgroundColor: dotColor + '22' }]}>
        <Text style={[rowStyles.badgeText, { color: dotColor, fontSize: scale(11) }]}>
          {TYPE_LABELS[item.type]}
        </Text>
      </View>
    </View>
  );
};

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  info: { flex: 1 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontWeight: '600', flex: 1 },
  time: { marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
  },
  badgeText: { fontWeight: '700' },
});

// main screen
export default function ActivityScreen() {
  const { isDark } = useAppTheme();
  const { ui, scale } = useAccessibilitySettings();

  const [log, setLog]       = useState<ActivityEntry[]>([]);
  const [stats, setStats]   = useState<Record<ActivityType, number>>({
    tts: 0, ocr: 0, voice: 0, reminder: 0, sos: 0, community: 0,
  });
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [entries, weekly] = await Promise.all([getActivityLog(), getWeeklyStats()]);
    setLog(entries);
    setStats(weekly);
  }, []);

  useEffect(() => {
    loadData();
    speakIfEnabled('Activity log opened');
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear Activity Log',
      'This will delete your entire activity history. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearActivityLog();
            await loadData();
            speakIfEnabled('Activity log cleared');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const filtered = filter === 'all' ? log : log.filter(e => e.type === filter);

  const bg      = isDark ? '#0B1120' : '#F8FAFC';
  const cardBg  = isDark ? '#111827' : '#FFFFFF';
  const textCol = isDark ? '#F8FAFC' : '#1F2933';
  const mutedCol = isDark ? '#64748B' : '#9CA3AF';

  // header with stats and filter pills
  const ListHeader = (
    <>
      <View style={[headerStyles.statsCard, { backgroundColor: cardBg }]}>
        <Text style={[headerStyles.sectionTitle, { color: textCol, fontSize: scale(16) }]}>
          📊 This Week
        </Text>
        <FlatList
          horizontal
          data={ALL_TYPES}
          keyExtractor={t => t}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: type }) => (
            <StatCard type={type} count={stats[type]} isDark={isDark} scale={scale} />
          )}
          style={{ marginTop: 12 }}
        />
      </View>

      <View style={headerStyles.filterRow}>
        <FilterPill
          label="All"
          active={filter === 'all'}
          color="#4A90E2"
          onPress={() => { setFilter('all'); Haptics.selectionAsync(); }}
          isDark={isDark}
          scale={scale}
        />
        {ALL_TYPES.map(type => (
          <FilterPill
            key={type}
            label={ACTIVITY_EMOJI[type] + ' ' + TYPE_LABELS[type]}
            active={filter === type}
            color={ACTIVITY_COLOR[type]}
            onPress={() => { setFilter(type); Haptics.selectionAsync(); }}
            isDark={isDark}
            scale={scale}
          />
        ))}
      </View>

      <Text style={[headerStyles.countText, { color: mutedCol, fontSize: scale(13) }]}>
        {filtered.length === 0 ? 'No activity recorded yet' : `${filtered.length} events`}
      </Text>
    </>
  );

  const EmptyState = (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>📋</Text>
      <Text style={[emptyStyles.title, { color: textCol, fontSize: scale(18) }]}>
        No activity yet
      </Text>
      <Text style={[emptyStyles.sub, { color: mutedCol, fontSize: scale(14) }]}>
        Use the app features and they will show up here.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.topBar, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <Text style={[styles.title, { color: textCol, fontSize: scale(22) }]}>
          Activity Log
        </Text>
        {log.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Text style={[styles.clearBtn, { fontSize: scale(14) }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ActivityRow item={item} isDark={isDark} scale={scale} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontWeight: '800' },
  clearBtn: { color: '#EF4444', fontWeight: '700' },
});

const headerStyles = StyleSheet.create({
  statsCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontWeight: '700' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  countText: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontWeight: '500',
  },
});

const emptyStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  icon: { fontSize: 52, marginBottom: 16 },
  title: { fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  sub: { textAlign: 'center', lineHeight: 22 },
});
