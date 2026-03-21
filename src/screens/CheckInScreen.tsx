/**
 * CheckInScreen.tsx
 *
 * Daily wellness check-in for AccessAid users.
 * Users tap big emoji buttons to log their mood, pain level, and energy.
 * All check-ins are saved to Supabase and shown as a history list below.
 *
 * Designed for accessibility:
 *  - Large tap targets (no typing required)
 *  - TTS announces selections and confirmations
 *  - Full dark mode support
 *  - Screen-reader labels on every interactive element
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getThemeConfig } from '../../constants/theme';
import { BackgroundLogo } from '../components/BackgroundLogo';
import { ModernCard } from '../components/ModernCard';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../../lib/supabase';

//  Types  
type MoodOption = { emoji: string; label: string; value: number; color: string };
type PainOption = { emoji: string; label: string; value: number; color: string };
type EnergyOption = { emoji: string; label: string; value: number; color: string };

interface CheckIn {
  id: string;
  mood: number;
  pain: number;
  energy: number;
  note?: string;
  created_at: string;
}

//  Data  

const MOOD_OPTIONS: MoodOption[] = [
  { emoji: '😄', label: 'Great',   value: 5, color: '#22C55E' },
  { emoji: '🙂', label: 'Good',    value: 4, color: '#84CC16' },
  { emoji: '😐', label: 'Okay',    value: 3, color: '#F59E0B' },
  { emoji: '😔', label: 'Low',     value: 2, color: '#F97316' },
  { emoji: '😢', label: 'Bad',     value: 1, color: '#EF4444' },
];

const PAIN_OPTIONS: PainOption[] = [
  { emoji: '✅', label: 'None',    value: 0, color: '#22C55E' },
  { emoji: '😌', label: 'Mild',    value: 1, color: '#84CC16' },
  { emoji: '😣', label: 'Moderate',value: 2, color: '#F59E0B' },
  { emoji: '😖', label: 'Severe',  value: 3, color: '#F97316' },
  { emoji: '🆘', label: 'Crisis',  value: 4, color: '#EF4444' },
];

const ENERGY_OPTIONS: EnergyOption[] = [
  { emoji: '⚡', label: 'High',    value: 3, color: '#22C55E' },
  { emoji: '🔋', label: 'Normal',  value: 2, color: '#84CC16' },
  { emoji: '🪫', label: 'Low',     value: 1, color: '#F59E0B' },
  { emoji: '😴', label: 'Drained', value: 0, color: '#EF4444' },
];

//  Helpers  

const moodLabel  = (v: number) => MOOD_OPTIONS.find(o => o.value === v)?.label   ?? '–';
const painLabel  = (v: number) => PAIN_OPTIONS.find(o => o.value === v)?.label   ?? '–';
const energyLabel= (v: number) => ENERGY_OPTIONS.find(o => o.value === v)?.label ?? '–';

const moodEmoji  = (v: number) => MOOD_OPTIONS.find(o => o.value === v)?.emoji   ?? '–';
const painEmoji  = (v: number) => PAIN_OPTIONS.find(o => o.value === v)?.emoji   ?? '–';
const energyEmoji= (v: number) => ENERGY_OPTIONS.find(o => o.value === v)?.emoji ?? '–';

const moodColor  = (v: number) => MOOD_OPTIONS.find(o => o.value === v)?.color   ?? '#94A3B8';
const painColor  = (v: number) => PAIN_OPTIONS.find(o => o.value === v)?.color   ?? '#94A3B8';
const energyColor= (v: number) => ENERGY_OPTIONS.find(o => o.value === v)?.color ?? '#94A3B8';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

//  Sub-components 

interface SelectorProps<T extends { emoji: string; label: string; value: number; color: string }> {
  options: T[];
  selected: number | null;
  onSelect: (value: number, label: string) => void;
  themeTextPrimary: string;
  themeCardBackground: string;
  themeCardBorder: string;
}

function OptionSelector<T extends { emoji: string; label: string; value: number; color: string }>({
  options, selected, onSelect, themeTextPrimary, themeCardBackground, themeCardBorder,
}: SelectorProps<T>) {
  return (
    <View style={selectorStyles.row}>
      {options.map(opt => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              selectorStyles.option,
              {
                backgroundColor: isSelected ? opt.color + '33' : themeCardBackground,
                borderColor: isSelected ? opt.color : themeCardBorder,
                borderWidth: isSelected ? 2.5 : 1,
              },
            ]}
            onPress={() => onSelect(opt.value, opt.label)}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={selectorStyles.emoji}>{opt.emoji}</Text>
            <Text style={[selectorStyles.label, { color: isSelected ? opt.color : themeTextPrimary }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const selectorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 4,
  },
  emoji: { fontSize: 24 },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});

//  Main Screen  

const CheckInScreen = () => {
  const { state } = useApp();
  const isDark = state.accessibilitySettings.isDarkMode;
  const theme = useMemo(() => getThemeConfig(isDark), [isDark]);

  // Form state
  const [mood,   setMood]   = useState<number | null>(null);
  const [pain,   setPain]   = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);

  // UI state
  const [isSaving,   setIsSaving]   = useState(false);
  const [isLoading,  setIsLoading]  = useState(true);
  const [history,    setHistory]    = useState<CheckIn[]>([]);
  const [todayDone,  setTodayDone]  = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  //  TTS helper  
  const speak = useCallback((text: string) => {
    if (!state.voiceAnnouncementsEnabled) return;
    try { Speech.stop(); } catch {}
    try { Speech.speak(text, { rate: state.accessibilitySettings.voiceSpeed }); } catch {}
  }, [state.voiceAnnouncementsEnabled, state.accessibilitySettings.voiceSpeed]);

  // Load history from Supabase  
  const loadHistory = useCallback(async () => {
    if (!state.user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', state.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      
      if (error) throw error;
 
      setHistory(data || []);
 
      // Check if user already checked in today
      if (data && data.length > 0) {
        const latest = new Date(data[0].created_at);
        const today  = new Date();
        const sameDay =
          latest.getFullYear() === today.getFullYear() &&
          latest.getMonth()    === today.getMonth()    &&
          latest.getDate()     === today.getDate();
        setTodayDone(sameDay);
      }
    } catch (err) {
      console.warn('CheckIn: failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [state.user?.id]);
 
  //  On mount  
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadHistory();
    speak('Daily check-in screen. How are you feeling today?');
  }, []);
 
  // Save check-in  
  const handleSubmit = async () => {
    if (mood === null || pain === null || energy === null) {
      Alert.alert('Almost there!', 'Please select an option for mood, pain, and energy.');
      speak('Please fill in all three sections before saving.');
      return;
    }
 
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
 
    try {
      const { error } = await supabase.from('check_ins').insert({
        user_id: state.user!.id,
        mood,
        pain,
        energy,
      });
 
      if (error) throw error;
 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      speak(`Check-in saved. Mood ${moodLabel(mood)}, pain ${painLabel(pain)}, energy ${energyLabel(energy)}.`);
      setTodayDone(true);
      setMood(null);
      setPain(null);
      setEnergy(null);
      await loadHistory();
    } catch (err) {
      console.warn('CheckIn: save failed:', err);
      Alert.alert('Save failed', 'Could not save your check-in. Please try again.');
      speak('Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
 
  // History item  
  const renderHistoryItem = ({ item }: { item: CheckIn }) => (
    <ModernCard variant="elevated" style={[histStyles.card, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
      <Text style={[histStyles.date, { color: theme.textSecondary }]}>{formatDate(item.created_at)}</Text>
      <View style={histStyles.row}>
        {/* Mood */}
        <View style={histStyles.pill}>
          <Text style={histStyles.pillEmoji}>{moodEmoji(item.mood)}</Text>
          <View style={[histStyles.pillBadge, { backgroundColor: moodColor(item.mood) + '22' }]}>
            <Text style={[histStyles.pillText, { color: moodColor(item.mood) }]}>{moodLabel(item.mood)}</Text>
          </View>
        </View>
        {/* Pain */}
        <View style={histStyles.pill}>
          <Text style={histStyles.pillEmoji}>{painEmoji(item.pain)}</Text>
          <View style={[histStyles.pillBadge, { backgroundColor: painColor(item.pain) + '22' }]}>
            <Text style={[histStyles.pillText, { color: painColor(item.pain) }]}>{painLabel(item.pain)}</Text>
          </View>
        </View>
        {/* Energy */}
        <View style={histStyles.pill}>
          <Text style={histStyles.pillEmoji}>{energyEmoji(item.energy)}</Text>
          <View style={[histStyles.pillBadge, { backgroundColor: energyColor(item.energy) + '22' }]}>
            <Text style={[histStyles.pillText, { color: energyColor(item.energy) }]}>{energyLabel(item.energy)}</Text>
          </View>
        </View>
      </View>
    </ModernCard>
  );
 
  //  Render 
  return (
    <LinearGradient colors={theme.gradient as any} style={styles.container}>
      <BackgroundLogo />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      
