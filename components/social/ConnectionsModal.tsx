import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { speakIfEnabled } from '../../services/ttsService';
import {
  getMyConnections,
  getPendingRequests,
  respondToConnection,
  removeConnection,
  deleteChatMessages,
  DISABILITY_TAGS,
  type Connection,
} from '../../services/socialService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenChat: (conn: Connection) => void;
  userId: string;
  ui: any;
  scale: (n: number) => number;
  initialTab?: 'connections' | 'requests';
}

const TAG_GRADIENTS: Record<string, [string, string]> = {
  visual:    ['#7C3AED', '#A855F7'],
  hearing:   ['#1D4ED8', '#60A5FA'],
  mobility:  ['#059669', '#34D399'],
  autism:    ['#D97706', '#FBBF24'],
  cognitive: ['#DC2626', '#F87171'],
  chronic:   ['#DB2777', '#F472B6'],
  mental:    ['#6D28D9', '#C4B5FD'],
  speech:    ['#0891B2', '#67E8F9'],
  other:     ['#475569', '#94A3B8'],
};

const getTagInfo = (id: string) =>
  DISABILITY_TAGS.find((t: typeof DISABILITY_TAGS[number]) => t.id === id) ??
  { label: id, emoji: '⭐', color: '#6B7280' };

const avatarGradient = (conn: Connection): [string, string] => {
  const tag = conn.other_profile?.disability_tags?.[0];
  return (tag && TAG_GRADIENTS[tag]) ? TAG_GRADIENTS[tag] : ['#7C3AED', '#A855F7'];
};

export default function ConnectionsModal({
  visible, onClose, onOpenChat, userId, ui, scale, initialTab = 'connections',
}: Props) {

  const [connections, setConnections] = useState<Connection[]>([]);
  const [requests, setRequests]       = useState<Connection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [responding, setResponding]   = useState<string | null>(null);
  const [managing, setManaging]       = useState<string | null>(null);

  const isConnections = initialTab === 'connections';

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      if (isConnections) {
        setConnections(await getMyConnections(userId));
      } else {
        setRequests(await getPendingRequests(userId));
      }
    } catch (e) {
      console.error('ConnectionsModal load error', e);
    } finally {
      setLoading(false);
    }
  }, [userId, isConnections]);

  useEffect(() => {
    if (visible) loadData();
  }, [visible, loadData]);

  const handleManage = (conn: Connection) => {
    const name = conn.other_profile?.display_name ?? 'this person';
    Alert.alert(
      name,
      'What would you like to do?',
      [
        {
          text: 'Delete Chat',
          onPress: () =>
            Alert.alert('Delete Chat', `Delete all messages with ${name}? This cannot be undone.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  setManaging(conn.id);
                  try {
                    await deleteChatMessages(conn.id);
                    speakIfEnabled('Chat deleted');
                  } catch {
                    Alert.alert('Error', 'Could not delete chat. Please try again.');
                  } finally {
                    setManaging(null);
                  }
                },
              },
            ]),
        },
        {
          text: 'Unfriend',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Unfriend', `Remove ${name} from your connections?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Unfriend',
                style: 'destructive',
                onPress: async () => {
                  setManaging(conn.id);
                  try {
                    await deleteChatMessages(conn.id);
                    await removeConnection(conn.id);
                    speakIfEnabled(`${name} removed`);
                    onClose(); // close modal → SocialSection refreshes counts
                  } catch (e: any) {
                    setManaging(null);
                    Alert.alert('Error', 'Could not remove connection. Please try again.');
                  }
                },
              },
            ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleRespond = async (conn: Connection, status: 'accepted' | 'declined') => {
    setResponding(conn.id);
    try {
      await respondToConnection(conn.id, status);
      speakIfEnabled(status === 'accepted' ? 'Connection accepted' : 'Request declined');
      await loadData();
    } catch {
      Alert.alert('Error', 'Could not respond. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  // ── Shared avatar ──────────────────────────────────────────────────────────
  const renderAvatar = (conn: Connection, size: number) => {
    const p = conn.other_profile;
    if (p?.profile_picture) {
      return (
        <Image
          source={{ uri: p.profile_picture }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityLabel={`${p.display_name}'s photo`}
        />
      );
    }
    return (
      <LinearGradient
        colors={avatarGradient(conn)}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: size * 0.42 }}>
          {(p?.display_name || '?').charAt(0).toUpperCase()}
        </Text>
      </LinearGradient>
    );
  };

  // ── CONNECTION card — chat-focused, no request actions ────────────────────
  const renderConnection = ({ item }: { item: Connection }) => {
    const p = item.other_profile;
    const busy = managing === item.id;
    return (
      <View style={[styles.connCard, { backgroundColor: ui.cardBg, borderColor: ui.divider }]}>
        <View style={styles.connTop}>
          <View style={styles.avatarWrap}>
            {renderAvatar(item, 56)}
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.connInfo}>
            <Text style={[styles.connName, { color: ui.text, fontSize: scale(16) }]}>
              {p?.display_name ?? 'Unknown'}
            </Text>
            {p?.disability_tags?.length ? (
              <View style={styles.tagRow}>
                {p.disability_tags.slice(0, 3).map((id: string) => {
                  const t = getTagInfo(id);
                  return (
                    <View key={id} style={[styles.tagPill, { backgroundColor: t.color + '22', borderColor: t.color + '55' }]}>
                      <Text style={{ fontSize: scale(10) }}>{t.emoji}</Text>
                      <Text style={[styles.tagPillText, { color: t.color, fontSize: scale(10) }]}>{t.label}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
          {/* Options button */}
          {busy ? (
            <ActivityIndicator size="small" color={ui.subtext} />
          ) : (
            <TouchableOpacity
              onPress={() => handleManage(item)}
              style={[styles.optionsBtn, { backgroundColor: ui.bg }]}
              accessibilityRole="button"
              accessibilityLabel={`Options for ${p?.display_name}`}
            >
              <Text style={[styles.optionsDots, { color: ui.subtext, fontSize: scale(18) }]}>⋯</Text>
            </TouchableOpacity>
          )}
        </View>

        {(p?.bio || p?.experiences) ? (
          <Text
            style={[styles.connBio, { color: ui.subtext, fontSize: scale(13), borderTopColor: ui.divider }]}
            numberOfLines={2}
          >
            {p.experiences || p.bio}
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.msgBtn}
          onPress={() => { onOpenChat(item); speakIfEnabled(`Opening chat with ${p?.display_name}`); }}
          accessibilityRole="button"
          accessibilityLabel={`Message ${p?.display_name ?? 'connection'}`}
        >
          <LinearGradient
            colors={['#7C3AED', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.msgBtnGrad}
          >
            <Text style={{ fontSize: scale(15) }}>💬</Text>
            <Text style={[styles.msgBtnText, { fontSize: scale(14) }]}>Send Message</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // ── REQUEST card — accept/decline only, no chat ───────────────────────────
  const renderRequest = ({ item }: { item: Connection }) => {
    const p = item.other_profile;
    const busy = responding === item.id;
    return (
      <View style={[styles.reqCard, { backgroundColor: ui.cardBg, borderColor: ui.divider }]}>
        {/* amber top strip */}
        <View style={[styles.reqStrip, { backgroundColor: '#D9770618' }]}>
          <Text style={[styles.reqStripText, { color: '#D97706', fontSize: scale(11) }]}>
            🔔  New Connection Request
          </Text>
        </View>

        <View style={styles.reqBody}>
          {renderAvatar(item, 60)}
          <View style={styles.reqInfo}>
            <Text style={[styles.reqName, { color: ui.text, fontSize: scale(17) }]}>
              {p?.display_name ?? 'Someone'}
            </Text>
            <Text style={[styles.reqSub, { color: ui.subtext, fontSize: scale(12) }]}>
              wants to connect with you
            </Text>
            {p?.disability_tags?.length ? (
              <View style={styles.tagRow}>
                {p.disability_tags.slice(0, 4).map((id: string) => {
                  const t = getTagInfo(id);
                  return (
                    <View key={id} style={[styles.tagPill, { backgroundColor: t.color + '22', borderColor: t.color + '55' }]}>
                      <Text style={{ fontSize: scale(10) }}>{t.emoji}</Text>
                      <Text style={[styles.tagPillText, { color: t.color, fontSize: scale(10) }]}>{t.label}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        {(p?.bio || p?.experiences) ? (
          <View style={[styles.reqBioBox, { backgroundColor: ui.bg, borderColor: ui.divider }]}>
            <Text style={[styles.reqBioLabel, { color: ui.subtext, fontSize: scale(10) }]}>THEIR STORY</Text>
            <Text style={[styles.reqBioText, { color: ui.text, fontSize: scale(13) }]} numberOfLines={3}>
              {p.experiences || p.bio}
            </Text>
          </View>
        ) : null}

        {busy ? (
          <View style={styles.reqActions}>
            <ActivityIndicator color="#D97706" />
          </View>
        ) : (
          <View style={styles.reqActions}>
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: ui.divider }]}
              onPress={() => handleRespond(item, 'declined')}
              accessibilityRole="button"
              accessibilityLabel={`Decline request from ${p?.display_name}`}
            >
              <Text style={[styles.declineTxt, { color: ui.subtext, fontSize: scale(14) }]}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleRespond(item, 'accepted')}
              accessibilityRole="button"
              accessibilityLabel={`Accept request from ${p?.display_name}`}
            >
              <LinearGradient
                colors={['#059669', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptBtnGrad}
              >
                <Text style={[styles.acceptTxt, { fontSize: scale(14) }]}>✓  Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  const list = isConnections ? connections : requests;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.root, { backgroundColor: ui.bg }]}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <LinearGradient
          colors={isConnections ? ['#1D4ED8', '#7C3AED'] : ['#92400E', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View>
            <Text style={[styles.headerTitle, { fontSize: scale(20) }]}>
              {isConnections ? 'My Connections' : 'Inbox'}
            </Text>
            <Text style={[styles.headerSub, { fontSize: scale(12) }]}>
              {isConnections
                ? `${connections.length} connection${connections.length !== 1 ? 's' : ''}`
                : requests.length > 0
                  ? `${requests.length} pending request${requests.length !== 1 ? 's' : ''}`
                  : 'All caught up'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={[styles.closeBtnText, { fontSize: scale(14) }]}>Done</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Content ─────────────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color={isConnections ? '#1D4ED8' : '#D97706'} />
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={item => item.id}
            renderItem={isConnections ? renderConnection : renderRequest}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>
                  {isConnections ? '🤝' : '📭'}
                </Text>
                <Text style={[styles.emptyTitle, { color: ui.text, fontSize: scale(18) }]}>
                  {isConnections ? 'No connections yet' : 'Your inbox is empty'}
                </Text>
                <Text style={[styles.emptySub, { color: ui.subtext, fontSize: scale(13) }]}>
                  {isConnections
                    ? 'Use Discover to find and connect with others in the community.'
                    : 'When someone sends you a connection request it will appear here.'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { color: '#FFF', fontWeight: '800', letterSpacing: 0.3 },
  headerSub:   { color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  closeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 99,
  },
  closeBtnText: { color: '#FFF', fontWeight: '600' },

  list:    { padding: 16, gap: 14 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingTop: 64, gap: 12, paddingHorizontal: 28 },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontWeight: '700', textAlign: 'center' },
  emptySub:   { textAlign: 'center', lineHeight: 20 },

  // Shared tag pills
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 99, borderWidth: 1,
  },
  tagPillText: { fontWeight: '600' },

  // ── Connections ───────────────────────────────────────────────────────────
  connCard: {
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  connTop:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatarWrap: { position: 'relative' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF',
  },
  connInfo: { flex: 1 },
  connName: { fontWeight: '800', marginBottom: 4 },
  optionsBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  optionsDots: { fontWeight: '800', letterSpacing: 1 },
  connBio:  {
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 10,
    lineHeight: 19, borderTopWidth: 1,
  },
  msgBtn: { marginHorizontal: 14, marginBottom: 14, borderRadius: 12, overflow: 'hidden' },
  msgBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
  },
  msgBtnText: { color: '#FFF', fontWeight: '700' },

  // ── Requests ──────────────────────────────────────────────────────────────
  reqCard: {
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  reqStrip: { paddingHorizontal: 16, paddingVertical: 8 },
  reqStripText: { fontWeight: '700', letterSpacing: 0.4 },
  reqBody:  { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, paddingTop: 12 },
  reqInfo:  { flex: 1 },
  reqName:  { fontWeight: '800', marginBottom: 3 },
  reqSub:   { marginBottom: 6 },
  reqBioBox: {
    marginHorizontal: 16, marginBottom: 14,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  reqBioLabel: { fontWeight: '700', letterSpacing: 0.5, marginBottom: 5 },
  reqBioText:  { lineHeight: 19 },
  reqActions:  {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  declineBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', borderWidth: 1.5,
  },
  declineTxt:  { fontWeight: '600' },
  acceptBtn:   { flex: 2, borderRadius: 12, overflow: 'hidden' },
  acceptBtnGrad: { paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  acceptTxt:   { color: '#FFF', fontWeight: '700' },
});
