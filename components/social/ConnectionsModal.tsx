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
}

type Tab = 'connected' | 'requests';

export default function ConnectionsModal({ visible, onClose, onOpenChat, userId, ui, scale }: Props) {

  const [tab, setTab]                   = useState<Tab>('connected');
  const [connections, setConnections]   = useState<Connection[]>([]);
  const [requests, setRequests]         = useState<Connection[]>([]);
  const [loading, setLoading]           = useState(true);
  const [responding, setResponding]     = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [conns, reqs] = await Promise.all([
        getMyConnections(userId),
        getPendingRequests(userId),
      ]);
      setConnections(conns);
      setRequests(reqs);
    } catch (e) {
      console.error('ConnectionsModal load error', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible) loadData();
  }, [visible, loadData]);

  // ── respond to request ────────────────────────────────────────────────────
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

  // ── avatar lookup ─────────────────────────────────────────────────────────
  const getTagEmoji = (tagId: string) =>
    DISABILITY_TAGS.find((t: typeof DISABILITY_TAGS[number]) => t.id === tagId)?.emoji ?? '⭐';

  const getTagColor = (tagId: string) =>
    DISABILITY_TAGS.find((t: typeof DISABILITY_TAGS[number]) => t.id === tagId)?.color ?? '#6B7280';

  // ── profile display ───────────────────────────────────────────────────────
  const renderAvatar = (conn: Connection, size = 54) => {
    const p = conn.other_profile;
    const initials = (p?.display_name || '?').charAt(0).toUpperCase();
    const tag = p?.disability_tags?.[0];
    const gradColors: [string, string] = tag
      ? [getTagColor(tag), '#A855F7']
      : ['#7C3AED', '#A855F7'];

    if (p?.profile_picture) {
      return (
        <Image
          source={{ uri: p.profile_picture }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityLabel={`${p.display_name}'s avatar`}
        />
      );
    }
    return (
      <LinearGradient
        colors={gradColors}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: size * 0.4 }}>{initials}</Text>
      </LinearGradient>
    );
  };

  // ── connected item ────────────────────────────────────────────────────────
  const renderConnection = ({ item }: { item: Connection }) => {
    const p = item.other_profile;
    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: ui.cardBg, borderColor: ui.divider }]}
        onPress={() => { onOpenChat(item); speakIfEnabled(`Chatting with ${p?.display_name}`); }}
        accessibilityRole="button"
        accessibilityLabel={`Chat with ${p?.display_name ?? 'connection'}`}
      >
        {renderAvatar(item)}

        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, { color: ui.text, fontSize: scale(16) }]}>
            {p?.display_name ?? 'Unknown'}
          </Text>
          {p?.disability_tags?.length ? (
            <View style={styles.miniTags}>
              {p.disability_tags.slice(0, 3).map((id: string) => (
                <Text key={id} style={{ fontSize: scale(14) }}>{getTagEmoji(id)}</Text>
              ))}
            </View>
          ) : null}
          {p?.bio ? (
            <Text
              style={[styles.rowBio, { color: ui.subtext, fontSize: scale(12) }]}
              numberOfLines={1}
            >
              {p.bio}
            </Text>
          ) : null}
        </View>

        <LinearGradient
          colors={['#7C3AED', '#A855F7']}
          style={styles.chatBtn}
        >
          <Text style={{ fontSize: scale(18) }}>💬</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // ── request item ──────────────────────────────────────────────────────────
  const renderRequest = ({ item }: { item: Connection }) => {
    const p = item.other_profile;
    const isProcessing = responding === item.id;
    return (
      <View style={[styles.row, { backgroundColor: ui.cardBg, borderColor: ui.divider }]}>
        {renderAvatar(item)}

        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, { color: ui.text, fontSize: scale(15) }]}>
            {p?.display_name ?? 'Someone'}
          </Text>
          {p?.disability_tags?.length ? (
            <View style={styles.miniTags}>
              {p.disability_tags.slice(0, 3).map((id: string) => (
                <Text key={id} style={{ fontSize: scale(14) }}>{getTagEmoji(id)}</Text>
              ))}
            </View>
          ) : null}
          <Text style={[styles.requestLabel, { color: ui.subtext, fontSize: scale(11) }]}>
            Wants to connect
          </Text>
        </View>

        {isProcessing ? (
          <ActivityIndicator color="#7C3AED" />
        ) : (
          <View style={styles.requestBtns}>
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: ui.danger }]}
              onPress={() => handleRespond(item, 'declined')}
              accessibilityRole="button"
              accessibilityLabel={`Decline ${p?.display_name}`}
            >
              <Text style={[{ color: ui.danger, fontWeight: '700', fontSize: scale(12) }]}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleRespond(item, 'accepted')}
              accessibilityRole="button"
              accessibilityLabel={`Accept ${p?.display_name}`}
            >
              <LinearGradient colors={['#059669', '#34D399']} style={styles.acceptGrad}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: scale(12) }}>✓</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const currentList = tab === 'connected' ? connections : requests;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={[styles.root, { backgroundColor: ui.bg }]}>
          {/* ── Header ───────────────────────────────────────────── */}
          <LinearGradient
            colors={['#1D4ED8', '#60A5FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <Text style={[styles.headerTitle, { fontSize: scale(20) }]}>My Community</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close connections"
            >
              <Text style={[styles.closeBtnText, { fontSize: scale(14) }]}>Done</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* ── Tab bar ──────────────────────────────────────────── */}
          <View style={[styles.tabBar, { backgroundColor: ui.cardBg, borderBottomColor: ui.divider }]}>
            {(['connected', 'requests'] as Tab[]).map(t => {
              const label = t === 'connected'
                ? `Connected  ${connections.length > 0 ? `(${connections.length})` : ''}`
                : `Requests  ${requests.length > 0 ? `(${requests.length})` : ''}`;
              const active = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, active && styles.tabBtnActive]}
                  onPress={() => { setTab(t); speakIfEnabled(label); }}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: active ? '#7C3AED' : ui.subtext,
                        fontWeight: active ? '700' : '500',
                        fontSize: scale(14),
                      },
                    ]}
                  >
                    {t === 'connected' ? '🤝 ' : '📬 '}
                    {t === 'connected' ? 'Connected' : 'Requests'}
                  </Text>
                  {t === 'requests' && requests.length > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{requests.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── List ─────────────────────────────────────────────── */}
          {loading ? (
            <View style={styles.centred}>
              <ActivityIndicator size="large" color="#7C3AED" />
            </View>
          ) : (
            <FlatList
              data={currentList}
              keyExtractor={item => item.id}
              renderItem={tab === 'connected' ? renderConnection : renderRequest}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>{tab === 'connected' ? '🤝' : '📭'}</Text>
                  <Text style={[styles.emptyTitle, { color: ui.text, fontSize: scale(18) }]}>
                    {tab === 'connected' ? 'No connections yet' : 'No pending requests'}
                  </Text>
                  <Text style={[styles.emptySub, { color: ui.subtext, fontSize: scale(13) }]}>
                    {tab === 'connected'
                      ? 'Use Discover to find and connect with others.'
                      : 'When someone wants to connect, they will appear here.'}
                  </Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
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
    paddingVertical: 16,
  },
  headerTitle: { color: '#FFF', fontWeight: '800' },
  closeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 99,
  },
  closeBtnText: { color: '#FFF', fontWeight: '600' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#7C3AED' },
  tabLabel: {},
  tabBadge: {
    minWidth: 18, height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  // List
  list: { padding: 16, gap: 12 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontWeight: '700', textAlign: 'center' },
  emptySub: { textAlign: 'center', lineHeight: 20 },

  // Row (shared between connections and requests)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowInfo: { flex: 1 },
  rowName: { fontWeight: '700', marginBottom: 2 },
  rowBio: { marginTop: 2 },
  miniTags: { flexDirection: 'row', gap: 3, marginTop: 3 },

  chatBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },

  requestLabel: { marginTop: 2 },
  requestBtns: { flexDirection: 'row', gap: 8 },
  declineBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  acceptBtn: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  acceptGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
