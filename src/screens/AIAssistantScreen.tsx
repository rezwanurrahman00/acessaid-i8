/**
 * AIAssistantScreen.tsx
 * Modern ChatGPT-style AI assistant powered by Groq.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getThemeConfig } from '../../constants/theme';
import { useApp } from '../contexts/AppContext';
import { ChatMessage, sendChatMessage, sendImageMessage } from '../services/geminiService';

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = ChatMessage & { imageUri?: string };

// ─── Quick prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { icon: 'medkit-outline',      text: 'Missed a dose?' },
  { icon: 'body-outline',        text: 'Managing chronic pain' },
  { icon: 'moon-outline',        text: 'Improve my sleep' },
  { icon: 'accessibility-outline', text: 'My disability rights' },
];

// ─── Animated typing dots ─────────────────────────────────────────────────────

const TypingDots = ({ color }: { color: string }) => {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 150),
        ]),
      ),
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={dotStyles.row}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[dotStyles.dot, { backgroundColor: color, opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}
        />
      ))}
    </View>
  );
};

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

// ─── Message bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
  message: Message;
  accent: string;
  bg: string;
  textPrimary: string;
  textMuted: string;
  isDark: boolean;
}

const MessageBubble = React.memo(({ message, accent, bg, textPrimary, textMuted, isDark }: BubbleProps) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={bStyles.userRow}>
        <View style={[bStyles.userBubble, { backgroundColor: accent }]}>
          {message.imageUri && (
            <Image source={{ uri: message.imageUri }} style={bStyles.image} resizeMode="cover" />
          )}
          <Text style={bStyles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={bStyles.aiRow}>
      <View style={[bStyles.aiAvatar, { backgroundColor: accent + '22', borderColor: accent + '44', borderWidth: 1 }]}>
        <Text style={{ fontSize: 14 }}>✦</Text>
      </View>
      <View style={[bStyles.aiBubble, { backgroundColor: isDark ? '#1e2433' : '#f7f7f8', borderColor: isDark ? '#2d3348' : '#e8e8e8' }]}>
        <Text style={[bStyles.aiText, { color: textPrimary }]}>{message.text}</Text>
      </View>
    </View>
  );
});

const bStyles = StyleSheet.create({
  userRow:   { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginVertical: 6 },
  userBubble:{ maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderBottomRightRadius: 4 },
  userText:  { color: '#fff', fontSize: 15, lineHeight: 22 },

  aiRow:    { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, marginVertical: 6, gap: 10 },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  aiBubble: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1 },
  aiText:   { fontSize: 15, lineHeight: 23 },

  image:    { width: '100%', height: 160, borderRadius: 12, marginBottom: 8 },
});

// ─── Welcome screen ───────────────────────────────────────────────────────────

interface WelcomeProps {
  accent: string;
  textPrimary: string;
  textMuted: string;
  isDark: boolean;
  onPrompt: (text: string) => void;
}

const WelcomeView = ({ accent, textPrimary, textMuted, isDark, onPrompt }: WelcomeProps) => (
  <View style={wStyles.container}>
    <View style={[wStyles.logo, { backgroundColor: accent + '18', borderColor: accent + '33', borderWidth: 1 }]}>
      <Text style={{ fontSize: 32 }}>✦</Text>
    </View>
    <Text style={[wStyles.title, { color: textPrimary }]}>AccessAid AI</Text>
    <Text style={[wStyles.subtitle, { color: textMuted }]}>
      Ask me anything about your health,{'\n'}medications, or accessibility.
    </Text>
    <View style={wStyles.grid}>
      {QUICK_PROMPTS.map(p => (
        <TouchableOpacity
          key={p.text}
          style={[wStyles.chip, { backgroundColor: isDark ? '#1e2433' : '#f7f7f8', borderColor: isDark ? '#2d3348' : '#e8e8e8' }]}
          onPress={() => onPrompt(p.text)}
          accessibilityRole="button"
          accessibilityLabel={p.text}
        >
          <Ionicons name={p.icon as any} size={18} color={accent} />
          <Text style={[wStyles.chipText, { color: textPrimary }]}>{p.text}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const wStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  logo:      { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:     { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle:  { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  grid:      { width: '100%', gap: 10 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  chipText:  { fontSize: 14, fontWeight: '500', flex: 1 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

const AIAssistantScreen = () => {
  const { state } = useApp();
  const isDark = state.accessibilitySettings.isDarkMode;
  const theme  = useMemo(() => getThemeConfig(isDark), [isDark]);

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const listRef = useRef<FlatList>(null);

  const speak = useCallback((text: string) => {
    if (!state.voiceAnnouncementsEnabled) return;
    try { Speech.stop(); } catch {}
    try { Speech.speak(text, { rate: state.accessibilitySettings.voiceSpeed }); } catch {}
  }, [state.voiceAnnouncementsEnabled, state.accessibilitySettings.voiceSpeed]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollToBottom();

    try {
      const history = [...messages, userMsg].slice(0, -1);
      const reply = await sendChatMessage(history, trimmed);
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      speak(reply);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Sorry, something went wrong: ${err?.message ?? 'Unknown error'}` }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [messages, isLoading, speak, scrollToBottom]);

  const pickImage = useCallback(() => {
    Alert.alert('Analyse Image', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          const p = await ImagePicker.requestCameraPermissionsAsync();
          if (!p.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
          const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!r.canceled) processImage(r.assets[0]);
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!p.granted) { Alert.alert('Permission needed', 'Gallery access is required.'); return; }
          const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!r.canceled) processImage(r.assets[0]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [input]);

  const processImage = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    const prompt = input.trim() || 'What is in this image? Please explain it clearly.';
    const userMsg: Message = { role: 'user', text: prompt, imageUri: asset.uri };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollToBottom();

    try {
      // Resize to max 800px wide and re-encode as JPEG to keep payload small
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );

      if (!manipulated.base64) throw new Error('Could not encode image');

      const reply = await sendImageMessage(manipulated.base64, 'image/jpeg', prompt);
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      speak(reply);
    } catch (err: any) {
      console.error('Vision error:', err);
      setMessages(prev => [...prev, { role: 'model', text: `Sorry, I couldn't analyse that image: ${err?.message}` }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [input, speak, scrollToBottom]);

  const clearChat = useCallback(() => {
    Alert.alert('New Chat', 'Clear this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setMessages([]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  }, []);

  const bg         = isDark ? '#0d1117' : '#ffffff';
  const headerBg   = isDark ? '#161b22' : '#ffffff';
  const borderCol  = isDark ? '#21262d' : '#e8e8e8';
  const inputBg    = isDark ? '#1e2433' : '#f7f7f8';
  const canSend    = input.trim().length > 0 && !isLoading;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: headerBg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: borderCol }]}>
        <View style={styles.headerCenter}>
          <View style={[styles.headerDot, { backgroundColor: '#22c55e' }]} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>AccessAid AI</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearChat} style={styles.newChatBtn} accessibilityLabel="New chat">
            <Ionicons name="create-outline" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Body */}
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {messages.length === 0 ? (
          <WelcomeView
            accent={theme.accent}
            textPrimary={theme.textPrimary}
            textMuted={theme.textMuted}
            isDark={isDark}
            onPrompt={handleSend}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                accent={theme.accent}
                bg={bg}
                textPrimary={theme.textPrimary}
                textMuted={theme.textMuted}
                isDark={isDark}
              />
            )}
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              isLoading ? (
                <View style={[bStyles.aiRow, { paddingHorizontal: 16, marginVertical: 6, gap: 10 }]}>
                  <View style={[bStyles.aiAvatar, { backgroundColor: theme.accent + '22', borderColor: theme.accent + '44', borderWidth: 1 }]}>
                    <Text style={{ fontSize: 14 }}>✦</Text>
                  </View>
                  <View style={[bStyles.aiBubble, { backgroundColor: isDark ? '#1e2433' : '#f7f7f8', borderColor: isDark ? '#2d3348' : '#e8e8e8' }]}>
                    <TypingDots color={theme.accent} />
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputWrap, { backgroundColor: bg, borderTopColor: borderCol }]}>
          <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: borderCol }]}>
            <TouchableOpacity
              onPress={pickImage}
              disabled={isLoading}
              style={styles.inputIcon}
              accessibilityLabel="Send image"
            >
              <Ionicons name="image-outline" size={22} color={theme.textMuted} />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              value={input}
              onChangeText={setInput}
              placeholder="Message AccessAid AI..."
              placeholderTextColor={theme.placeholder}
              multiline
              maxLength={1000}
              accessibilityLabel="Message input"
            />

            <TouchableOpacity
              onPress={() => handleSend(input)}
              disabled={!canSend}
              style={[styles.sendBtn, { backgroundColor: canSend ? theme.accent : 'transparent' }]}
              accessibilityLabel="Send"
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={canSend ? '#fff' : theme.textMuted}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
            AI can make mistakes. Always consult a professional for medical advice.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AIAssistantScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  flex:   { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerDot:    { width: 8, height: 8, borderRadius: 4 },
  headerTitle:  { fontSize: 17, fontWeight: '700' },
  newChatBtn:   { position: 'absolute', right: 16 },

  msgList: { paddingVertical: 16, paddingBottom: 8 },

  inputWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  inputIcon: { padding: 6 },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
});
