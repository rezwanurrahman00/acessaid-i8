import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { speakIfEnabled } from '../../services/ttsService';
import {
  getDiscoverProfiles,
  sendConnectionRequest,
  DISABILITY_TAGS,
  type SocialProfile,
} from '../../services/socialService';

// Color palette for avatar gradients (cycles through)
const AVATAR_GRADIENTS: [string, string][] = [
  ['#7C3AED', '#A855F7'],
  ['#1D4ED8', '#60A5FA'],
  ['#059669', '#34D399'],
  ['#DC2626', '#F87171'],
  ['#D97706', '#FBBF24'],
  ['#DB2777', '#F472B6'],
];

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  ui: any;
  scale: (n: number) => number;
}

export default function DiscoverModal({ visible, onClose, userId, ui, scale }: Props) {

  const [profiles, setProfiles]   = useState<SocialProfile[]>([]);
  const [index, setIndex]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [justConnected, setJustConnected] = useState(false);

  // Card animation
  const cardAnim = useRef(new Animated.Value(1)).current;
  const cardSlide = useRef(new Animated.Value(0)).current;

  // ── load profiles on open ────────────────────────────────────────────────
  useEffect(() => {
    if (visible && userId) {
      setLoading(true);
      setIndex(0);
      getDiscoverProfiles(userId)
        .then(setProfiles)
        .catch(() => setProfiles([]))
        .finally(() => setLoading(false));
    }
  }, [visible, userId]);

  const current = profiles[index];
  const isLast  = index >= profiles.length - 1;

  // ── animate out and advance card ─────────────────────────────────────────
  const advanceCard = (direction: 'left' | 'right', afterAnim?: () => void) => {
    const toX = direction === 'right' ? 400 : -400;
    Animated.parallel([
      Animated.timing(cardAnim,  { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: toX, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      afterAnim?.();
      setIndex(prev => prev + 1);
      setJustConnected(false);
      cardSlide.setValue(0);
      Animated.timing(cardAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  // ── connect ───────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!userId || !current || connecting) return;
    setConnecting(true);
    speakIfEnabled(`Connection request sent to ${current.display_name}`);
    try {
      await sendConnectionRequest(userId, current.user_id);
      setJustConnected(true);
      // Brief pause to show success feedback then advance
      setTimeout(() => advanceCard('right'), 700);
    } catch {
      Alert.alert('Error', 'Could not send request. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  // ── skip ─────────────────────────────────────────────────────────────────
  const handleSkip = () => {
    if (!current) return;
    speakIfEnabled('Skipped');
    advanceCard('left');
  };

  // ── disability tag lookups ────────────────────────────────────────────────
  const getTagInfo = (id: string) =>
    DISABILITY_TAGS.find((t: typeof DISABILITY_TAGS[number]) => t.id === id) ?? { label: id, emoji: '⭐', color: '#6B7280' };

  // ── gradient for avatar ───────────────────────────────────────────────────
  const avatarGradient = (userId: string): [string, string] => {
    const sum = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
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
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: ui.text, fontSize: scale(20) }]}>
              Discover
            </Text>
            {!loading && profiles.length > 0 && index < profiles.length && (
              <Text style={[styles.headerSub, { color: ui.subtext, fontSize: scale(13) }]}>
                {index + 1} of {profiles.length}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close discover"
          >
            <Text style={[styles.closeBtnText, { fontSize: scale(15), color: ui.text }]}>
              ✕ Close
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Progress bar ───────────────────────────────────────────── */}
        {!loading && profiles.length > 0 && (
          <View style={[styles.progressBg, { backgroundColor: ui.divider }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(((index) / profiles.length) * 100, 100)}%`,
                  backgroundColor: '#7C3AED',
                },
              ]}
            />
          </View>
        )}

        {/* ── Content ────────────────────────────────────────────────── */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centred}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={[styles.emptyText, { color: ui.subtext, fontSize: scale(15) }]}>
                Finding people near you…
              </Text>
            </View>
          ) : profiles.length === 0 ? (
            <View style={styles.centred}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={[styles.emptyTitle, { color: ui.text, fontSize: scale(20) }]}>
                You've seen everyone!
              </Text>
              <Text style={[styles.emptyText, { color: ui.subtext, fontSize: scale(14) }]}>
                Check back later as more people join the community.
              </Text>
            </View>
          ) : index >= profiles.length ? (
            <View style={styles.centred}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={[styles.emptyTitle, { color: ui.text, fontSize: scale(20) }]}>
                All caught up!
              </Text>
              <Text style={[styles.emptyText, { color: ui.subtext, fontSize: scale(14) }]}>
                You've reviewed all available profiles. Come back soon!
              </Text>
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: '#7C3AED' }]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close discover"
              >
                <Text style={[styles.doneBtnText, { fontSize: scale(15) }]}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── PROFILE CARD ─────────────────────────────────────── */
            <Animated.View
              style={[
                styles.cardWrap,
                {
                  opacity: cardAnim,
                  transform: [{ translateX: cardSlide }],
                },
              ]}
            >
              <LinearGradient
                colors={avatarGradient(current.user_id)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                {/* Decorative blobs */}
                <View style={[styles.blob, styles.blobTL]} />
                <View style={[styles.blob, styles.blobBR]} />

                {/* ── Avatar ──────────────────────────────────────── */}
                <View style={styles.avatarWrap}>
                  {current.profile_picture ? (
                    <Image
                      source={{ uri: current.profile_picture }}
                      style={styles.avatar}
                      accessibilityLabel={`${current.display_name}'s profile picture`}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={[styles.avatarInitial, { fontSize: scale(48) }]}>
                        {(current.display_name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── Name ────────────────────────────────────────── */}
                <Text style={[styles.cardName, { fontSize: scale(24) }]}>
                  {current.display_name || 'Anonymous'}
                </Text>

                {/* ── Tags ────────────────────────────────────────── */}
                {current.disability_tags?.length > 0 && (
                  <View style={styles.cardTags}>
                    {current.disability_tags.slice(0, 4).map((id: string) => {
                      const t = getTagInfo(id);
                      return (
                        <View
                          key={id}
                          style={[styles.cardTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                        >
                          <Text style={{ fontSize: scale(13) }}>{t.emoji}</Text>
                          <Text style={[styles.cardTagText, { fontSize: scale(12) }]}>
                            {t.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* ── Bio / Experience ─────────────────────────────── */}
                {(current.bio || current.experiences) ? (
                  <View style={styles.cardBioWrap}>
                    <Text
                      style={[styles.cardBio, { fontSize: scale(14) }]}
                      numberOfLines={4}
                    >
                      {current.experiences || current.bio}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.cardBioWrap}>
                    <Text style={[styles.cardBio, { fontSize: scale(14), opacity: 0.7 }]}>
                      No story shared yet.
                    </Text>
                  </View>
                )}

                {/* ── Just-connected feedback ───────────────────────── */}
                {justConnected && (
                  <View style={styles.connectedBadge}>
                    <Text style={[styles.connectedText, { fontSize: scale(14) }]}>
                      ✓ Request Sent!
                    </Text>
                  </View>
                )}
              </LinearGradient>

              {/* ── Action Buttons ────────────────────────────────── */}
              <View style={styles.btnsRow}>
                {/* Skip */}
                <TouchableOpacity
                  style={[styles.actionCircle, { backgroundColor: ui.cardBg, borderColor: ui.divider }]}
                  onPress={handleSkip}
                  disabled={connecting}
                  accessibilityRole="button"
                  accessibilityLabel={`Skip ${current.display_name}'s profile`}
                >
                  <Text style={{ fontSize: scale(30) }}>👋</Text>
                  <Text style={[styles.btnLabel, { color: ui.subtext, fontSize: scale(12) }]}>
                    Skip
                  </Text>
                </TouchableOpacity>

                {/* Connect */}
                <TouchableOpacity
                  style={styles.connectCircle}
                  onPress={handleConnect}
                  disabled={connecting}
                  accessibilityRole="button"
                  accessibilityLabel={`Connect with ${current.display_name}`}
                >
                  <LinearGradient
                    colors={['#059669', '#34D399']}
                    style={styles.connectCircleInner}
                  >
                    {connecting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Text style={{ fontSize: scale(34) }}>🤝</Text>
                        <Text style={[styles.btnLabel, { color: '#FFF', fontSize: scale(12) }]}>
                          Connect
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ── Hint text ─────────────────────────────────────── */}
              <Text style={[styles.hint, { color: ui.subtext, fontSize: scale(12) }]}>
                Connect to start chatting • Skip to see others
              </Text>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontWeight: '800' },
  headerSub: { marginTop: 2 },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  closeBtnText: { fontWeight: '600' },

  progressBg: { height: 4, marginHorizontal: 20, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontWeight: '800', textAlign: 'center' },
  emptyText: { textAlign: 'center', lineHeight: 22 },
  doneBtn: { marginTop: 8, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 99 },
  doneBtnText: { color: '#FFF', fontWeight: '700' },

  // Card
  cardWrap: { flex: 1, gap: 16 },
  card: {
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    minHeight: 380,
    alignItems: 'center',
    gap: 14,
    position: 'relative',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  blobTL: { width: 140, height: 140, top: -40, left: -40 },
  blobBR: { width: 100, height: 100, bottom: -30, right: -30 },

  avatarWrap: {
    width: 110, height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#FFF', fontWeight: '800' },

  cardName: {
    color: '#FFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  cardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  cardTagText: { color: '#FFF', fontWeight: '600' },

  cardBioWrap: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    padding: 14,
    width: '100%',
  },
  cardBio: { color: '#FFF', lineHeight: 22, textAlign: 'center' },

  connectedBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 99,
  },
  connectedText: { color: '#FFF', fontWeight: '700' },

  // Buttons
  btnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 4,
  },
  actionCircle: {
    width: 80, height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    gap: 2,
  },
  connectCircle: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden' },
  connectCircleInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  btnLabel: { fontWeight: '700' },

  hint: { textAlign: 'center', marginBottom: 8 },
});
