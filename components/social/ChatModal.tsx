import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { speakIfEnabled } from '../../services/ttsService';
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  type Connection,
  type Message,
} from '../../services/socialService';

interface Props {
  visible: boolean;
  connection: Connection;
  onClose: () => void;
  userId: string;
  ui: any;
  scale: (n: number) => number;
}

export default function ChatModal({ visible, connection, onClose, userId, ui, scale }: Props) {

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);

  const flatRef = useRef<FlatList>(null);
  const other   = connection.other_profile;

  // ── load messages ────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    try {
      const data = await getMessages(connection.id);
      setMessages(data);
    } catch (e) {
      console.error('ChatModal load error', e);
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadMessages();
    }
  }, [visible, loadMessages]);

  // ── scroll to bottom when new messages arrive ────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // ── realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const channel = subscribeToMessages(connection.id, (newMsg: Message) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    return () => { channel.unsubscribe(); };
  }, [visible, connection.id]);

  // ── send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!userId || !draft.trim() || sending) return;
    const content = draft.trim();
    setDraft('');
    Keyboard.dismiss();
    setSending(true);
    try {
      await sendMessage(connection.id, userId, content);
      // Realtime subscription delivers the message — no optimistic add needed
    } catch (e: any) {
      console.error('sendMessage error:', JSON.stringify(e));
      setDraft(content); // restore on failure
      Alert.alert('Error', 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ── time formatting ───────────────────────────────────────────────────────
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMine = (msg: Message) => msg.sender_id === userId;

  // ── render message bubble ─────────────────────────────────────────────────
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = isMine(item);
    const prev = messages[index - 1];
    const showAvatar = !mine && (!prev || prev.sender_id !== item.sender_id);

    return (
      <View
        style={[
          styles.msgRow,
          mine ? styles.msgRowMine : styles.msgRowOther,
          { marginTop: showAvatar ? 12 : 4 },
        ]}
        accessibilityLabel={`${mine ? 'You' : other?.display_name ?? 'Them'}: ${item.content}`}
      >
        {/* Other-person avatar */}
        {!mine && (
          <View style={styles.msgAvatarSlot}>
            {showAvatar ? (
              other?.profile_picture ? (
                <Image source={{ uri: other.profile_picture }} style={styles.msgAvatar} />
              ) : (
                <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.msgAvatar}>
                  <Text style={[styles.msgAvatarText, { fontSize: scale(13) }]}>
                    {(other?.display_name || '?').charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )
            ) : (
              <View style={styles.msgAvatar} />
            )}
          </View>
        )}

        {/* Bubble */}
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: '#7C3AED' }
              : { backgroundColor: ui.cardBg, borderColor: ui.divider, borderWidth: 1 },
          ]}
        >
          <Text style={[styles.bubbleText, { color: mine ? '#FFF' : ui.text, fontSize: scale(15) }]}>
            {item.content}
          </Text>
          <Text
            style={[
              styles.bubbleTime,
              { color: mine ? 'rgba(255,255,255,0.65)' : ui.subtext, fontSize: scale(10) },
            ]}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.root, { backgroundColor: ui.bg }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
        >
          {/* ── Header ─────────────────────────────────────────── */}
          <LinearGradient
            colors={['#4C1D95', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <TouchableOpacity
              onPress={onClose}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back to connections"
            >
              <Text style={[styles.backBtnText, { fontSize: scale(15) }]}>‹ Back</Text>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              {/* Avatar */}
              <View style={styles.headerAvatarWrap}>
                {other?.profile_picture ? (
                  <Image source={{ uri: other.profile_picture }} style={styles.headerAvatar} />
                ) : (
                  <View style={styles.headerAvatarPlaceholder}>
                    <Text style={[styles.headerAvatarText, { fontSize: scale(18) }]}>
                      {(other?.display_name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {/* Online dot */}
                <View style={styles.onlineDot} />
              </View>
              <View>
                <Text style={[styles.headerName, { fontSize: scale(16) }]}>
                  {other?.display_name ?? 'Connection'}
                </Text>
                {other?.disability_tags?.[0] && (
                  <Text style={[styles.headerTag, { fontSize: scale(11) }]}>
                    Connected
                  </Text>
                )}
              </View>
            </View>

            <View style={{ width: 64 }} />
          </LinearGradient>

          {/* ── Messages ───────────────────────────────────────── */}
          {loading ? (
            <View style={styles.centred}>
              <ActivityIndicator size="large" color="#7C3AED" />
            </View>
          ) : (
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatEmoji}>👋</Text>
                  <Text style={[styles.emptyChatTitle, { color: ui.text, fontSize: scale(17) }]}>
                    Say hello to {other?.display_name ?? 'your new connection'}!
                  </Text>
                  <Text style={[styles.emptyChatSub, { color: ui.subtext, fontSize: scale(13) }]}>
                    You're connected — start the conversation.
                  </Text>
                </View>
              }
              onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {/* ── Input bar ──────────────────────────────────────── */}
          <View style={[styles.inputBar, { backgroundColor: ui.cardBg, borderTopColor: ui.divider }]}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: ui.inputBg,
                  borderColor: ui.inputBorder,
                  color: ui.inputText,
                  fontSize: scale(15),
                },
              ]}
              placeholder={`Message ${other?.display_name ?? ''}…`}
              placeholderTextColor={ui.subtext}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={true}
              accessibilityLabel="Message input"
              onFocus={() => speakIfEnabled('Message input')}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { opacity: draft.trim() ? 1 : 0.4 },
              ]}
              onPress={handleSend}
              disabled={!draft.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.sendBtnGrad}>
                {sending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ fontSize: scale(20) }}>➤</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 64 },
  backBtnText: { color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  headerAvatarPlaceholder: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  headerAvatarText: { color: '#FFF', fontWeight: '800' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2, borderColor: '#7C3AED',
  },
  headerName: { color: '#FFF', fontWeight: '700' },
  headerTag: { color: 'rgba(255,255,255,0.7)' },

  // Messages
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { padding: 16, paddingBottom: 8 },

  emptyChat: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyChatEmoji: { fontSize: 56 },
  emptyChatTitle: { fontWeight: '700', textAlign: 'center' },
  emptyChatSub: { textAlign: 'center', lineHeight: 20 },

  // Message rows
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  msgRowMine: { flexDirection: 'row-reverse' },
  msgRowOther: {},

  msgAvatarSlot: { width: 32, marginRight: 6 },
  msgAvatar: {
    width: 32, height: 32, borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  msgAvatarText: { color: '#FFF', fontWeight: '700' },

  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleText: { lineHeight: 22 },
  bubbleTime: { alignSelf: 'flex-end' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    lineHeight: 22,
  },
  sendBtn: { width: 46, height: 46 },
  sendBtnGrad: {
    flex: 1,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
