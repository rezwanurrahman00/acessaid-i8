import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { speakIfEnabled } from '../../services/ttsService';
import {
  getMySocialProfile,
  upsertSocialProfile,
  getPendingRequests,
  getMyConnections,
  subscribeToConnectionUpdates,
  DISABILITY_TAGS,
} from '../../services/socialService';
import DiscoverModal from './DiscoverModal';
import ConnectionsModal from './ConnectionsModal';
import ChatModal from './ChatModal';
import { type Connection } from '../../services/socialService';

interface Props {
  userId: string;
  userName: string;
  ui: any;
  scale: (n: number) => number;
}

export default function SocialSection({ userId, userName, ui, scale }: Props) {

  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [isPublic, setIsPublic]             = useState(false);
  const [bio, setBio]                       = useState('');
  const [selectedTags, setSelectedTags]     = useState<string[]>([]);
  const [experiences, setExperiences]       = useState('');
  const [pendingCount, setPendingCount]     = useState(0);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [hasChanges, setHasChanges]         = useState(false);
  const [showDiscover, setShowDiscover]     = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [chatConn, setChatConn]             = useState<Connection | null>(null);
  const [dataLoaded, setDataLoaded]         = useState(false);

  // Pulse animation — only for the public button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isPublic) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => pulseLoop.current?.stop();
  }, [isPublic]);

  // ── load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [profile, pending, connections] = await Promise.all([
        getMySocialProfile(userId),
        getPendingRequests(userId),
        getMyConnections(userId),
      ]);
      if (profile) {
        setIsPublic(profile.is_public ?? false);
        setBio(profile.bio ?? '');
        setSelectedTags(profile.disability_tags ?? []);
        setExperiences(profile.experiences ?? '');
      }
      setPendingCount(pending.length);
      setConnectionsCount(connections.length);
    } catch (e) {
      console.error('SocialSection loadData error:', e);
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // realtime badge refresh
  useEffect(() => {
    if (!userId) return;
    const channel = subscribeToConnectionUpdates(userId, loadData);
    return () => { channel.unsubscribe(); };
  }, [userId, loadData]);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleTogglePublic = async () => {
    if (!userId) return;
    const next = !isPublic;
    setIsPublic(next);
    speakIfEnabled(next ? 'Profile is now public' : 'Profile is now private');
    try {
      await upsertSocialProfile(userId, {
        is_public: next,
        display_name: userName,
        bio,
        disability_tags: selectedTags,
        experiences,
      });
    } catch (e: any) {
      setIsPublic(!next);
      console.error('togglePublic error:', JSON.stringify(e));
      Alert.alert('Error', 'Could not update visibility. Please try again.');
    }
  };

  const handleTagToggle = (tagId: string) => {
    const tag = DISABILITY_TAGS.find((t: typeof DISABILITY_TAGS[number]) => t.id === tagId);
    speakIfEnabled(tag?.label ?? tagId);
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId],
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await upsertSocialProfile(userId, {
        is_public: isPublic,
        display_name: userName,
        bio,
        disability_tags: selectedTags,
        experiences,
      });
      setHasChanges(false);
      speakIfEnabled('Community profile saved');
      Alert.alert('Saved!', 'Your community profile has been updated.');
    } catch (e: any) {
      console.error('handleSave error:', JSON.stringify(e));
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDiscover = () => {
    if (!isPublic) {
      Alert.alert(
        'Go Public First',
        'Make your profile public so others can discover you.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Go Public', onPress: handleTogglePublic },
        ],
      );
      return;
    }
    speakIfEnabled('Opening discover community');
    setShowDiscover(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>

      {/* ── BANNER ────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#4C1D95', '#7C3AED', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <Text style={[styles.bannerTitle, { fontSize: scale(22) }]}>🌍 Community</Text>
        <Text style={[styles.bannerSub, { fontSize: scale(13) }]}>
          Connect with people who understand your journey
        </Text>
      </LinearGradient>

      {/* ── loading overlay ───────────────────────────────────────────── */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#7C3AED" />
          <Text style={[styles.loadingText, { color: ui.subtext, fontSize: scale(13) }]}>
            Loading community…
          </Text>
        </View>
      )}

      {/* ── GO PUBLIC TOGGLE ──────────────────────────────────────────── */}
      <View style={[styles.card, { backgroundColor: ui.cardBg }]}>
        <Text style={[styles.cardTitle, { color: ui.subtext, fontSize: scale(11) }]}>
          VISIBILITY
        </Text>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPress={handleTogglePublic}
            accessibilityRole="switch"
            accessibilityLabel={
              isPublic
                ? 'Your profile is public. Tap to make private.'
                : 'Your profile is private. Tap to go public.'
            }
            accessibilityState={{ checked: isPublic }}
            activeOpacity={0.85}
          >
            {isPublic ? (
              <LinearGradient
                colors={['#7C3AED', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.publicBtn}
              >
                <Text style={{ fontSize: scale(28) }}>🌐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.publicLabel, { fontSize: scale(16) }]}>Public Profile</Text>
                  <Text style={[styles.publicSub, { fontSize: scale(12) }]}>Others can discover you ✓</Text>
                </View>
                <View style={styles.dotOn} />
              </LinearGradient>
            ) : (
              <View style={[styles.publicBtn, styles.publicBtnOff, { borderColor: ui.divider }]}>
                <Text style={{ fontSize: scale(28) }}>🔒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.publicLabelOff, { fontSize: scale(16), color: ui.text }]}>Go Public</Text>
                  <Text style={[styles.publicSub, { fontSize: scale(12), color: ui.subtext }]}>Tap to join the community</Text>
                </View>
                <View style={[styles.dotOff, { backgroundColor: ui.divider }]} />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── DISABILITY TAGS ───────────────────────────────────────────── */}
      <View style={[styles.card, { backgroundColor: ui.cardBg }]}>
        <Text style={[styles.cardTitle, { color: ui.subtext, fontSize: scale(11) }]}>
          MY EXPERIENCES (SELECT ALL THAT APPLY)
        </Text>
        <View style={styles.tagsWrap}>
          {DISABILITY_TAGS.map((tag: typeof DISABILITY_TAGS[number]) => {
            const sel = selectedTags.includes(tag.id);
            return (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tag,
                  sel
                    ? { backgroundColor: tag.color, borderColor: tag.color }
                    : { backgroundColor: 'transparent', borderColor: ui.divider },
                ]}
                onPress={() => handleTagToggle(tag.id)}
                accessibilityRole="checkbox"
                accessibilityLabel={`${tag.label} ${sel ? 'selected' : 'not selected'}`}
                accessibilityState={{ checked: sel }}
              >
                <Text style={{ fontSize: scale(15) }}>{tag.emoji}</Text>
                <Text style={[styles.tagLabel, { color: sel ? '#FFF' : ui.text, fontSize: scale(12) }]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── SHARE YOUR STORY ──────────────────────────────────────────── */}
      <View style={[styles.card, { backgroundColor: ui.cardBg }]}>
        <Text style={[styles.cardTitle, { color: ui.subtext, fontSize: scale(11) }]}>
          SHARE YOUR STORY
        </Text>
        <TextInput
          style={[
            styles.textarea,
            {
              backgroundColor: ui.inputBg,
              borderColor: ui.inputBorder,
              color: ui.inputText,
              fontSize: scale(15),
            },
          ]}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={experiences}
          onChangeText={t => { setExperiences(t); setHasChanges(true); }}
          placeholder="Share your challenges, what you've learned, or what you're looking for…"
          placeholderTextColor={ui.subtext}
          accessibilityLabel="Share your story"
        />
      </View>

      {/* ── SAVE BUTTON ───────────────────────────────────────────────── */}
      {hasChanges && (
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: ui.accent }]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save community profile"
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={[styles.saveBtnText, { fontSize: scale(15) }]}>💾  Save Community Profile</Text>
          }
        </TouchableOpacity>
      )}

      {/* ── ACTION BUTTONS ────────────────────────────────────────────── */}
      <View style={styles.actionsRow}>

        {/* Discover */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleOpenDiscover}
          accessibilityRole="button"
          accessibilityLabel="Discover community members"
        >
          <LinearGradient colors={['#6C3483', '#A855F7']} style={styles.actionGrad}>
            <Text style={{ fontSize: scale(26) }}>🔍</Text>
            <Text style={[styles.actionLabel, { fontSize: scale(12) }]}>Discover</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Connections */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { setShowConnections(true); speakIfEnabled('Opening connections'); }}
          accessibilityRole="button"
          accessibilityLabel={`My connections, ${connectionsCount} total`}
        >
          <LinearGradient colors={['#1D4ED8', '#60A5FA']} style={styles.actionGrad}>
            <Text style={{ fontSize: scale(26) }}>💬</Text>
            <Text style={[styles.actionLabel, { fontSize: scale(12) }]}>Connections</Text>
            {connectionsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{connectionsCount}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Requests */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { setShowConnections(true); speakIfEnabled(`${pendingCount} requests`); }}
          accessibilityRole="button"
          accessibilityLabel={`${pendingCount} pending requests`}
        >
          <LinearGradient
            colors={pendingCount > 0 ? ['#B91C1C', '#F87171'] : ['#374151', '#6B7280']}
            style={styles.actionGrad}
          >
            <Text style={{ fontSize: scale(26) }}>📬</Text>
            <Text style={[styles.actionLabel, { fontSize: scale(12) }]}>Requests</Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </View>

      {/* ── MODALS ────────────────────────────────────────────────────── */}
      <DiscoverModal
        visible={showDiscover}
        onClose={() => setShowDiscover(false)}
        userId={userId}
        ui={ui}
        scale={scale}
      />
      <ConnectionsModal
        visible={showConnections}
        onClose={() => { setShowConnections(false); loadData(); }}
        onOpenChat={(conn) => {
          setShowConnections(false);
          setChatConn(conn);
        }}
        userId={userId}
        ui={ui}
        scale={scale}
      />
      {chatConn && (
        <ChatModal
          visible={!!chatConn}
          connection={chatConn}
          onClose={() => {
            setChatConn(null);
            setShowConnections(true);
          }}
          userId={userId}
          ui={ui}
          scale={scale}
        />
      )}
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginTop: 32,
    paddingBottom: 40,
  },

  banner: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  bannerTitle: { color: '#FFF', fontWeight: '800', marginBottom: 6, letterSpacing: 0.4 },
  bannerSub:   { color: 'rgba(255,255,255,0.85)', lineHeight: 20 },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  loadingText: {},

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 12,
  },

  publicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    padding: 18,
  },
  publicBtnOff: {
    borderWidth: 1.5,
  },
  publicLabel:    { color: '#FFF', fontWeight: '700', marginBottom: 2 },
  publicLabelOff: { fontWeight: '700', marginBottom: 2 },
  publicSub:      { fontWeight: '400' },
  dotOn:  { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E' },
  dotOff: { width: 12, height: 12, borderRadius: 6 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1.5,
  },
  tagLabel: { fontWeight: '600' },

  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    lineHeight: 22,
  },

  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: { color: '#FFF', fontWeight: '700' },

  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn:  { flex: 1 },
  actionGrad: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  actionLabel: { color: '#FFF', fontWeight: '700', textAlign: 'center' },

  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#000', fontSize: 10, fontWeight: '800' },
});
