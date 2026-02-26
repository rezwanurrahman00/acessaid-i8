import { supabase } from '../lib/supabase';

// ─── Disability tag definitions ───────────────────────────────────────────────
export const DISABILITY_TAGS = [
  { id: 'visual',    label: 'Visual',      emoji: '👁️',  color: '#7C3AED' },
  { id: 'hearing',   label: 'Hearing',     emoji: '👂',  color: '#2563EB' },
  { id: 'mobility',  label: 'Mobility',    emoji: '♿',  color: '#059669' },
  { id: 'autism',    label: 'Autism',      emoji: '🧩',  color: '#D97706' },
  { id: 'cognitive', label: 'Cognitive',   emoji: '🧠',  color: '#DC2626' },
  { id: 'chronic',   label: 'Chronic',     emoji: '💊',  color: '#DB2777' },
  { id: 'mental',    label: 'Mental Health', emoji: '🌸', color: '#7C3AED' },
  { id: 'speech',    label: 'Speech',      emoji: '💬',  color: '#0891B2' },
  { id: 'other',     label: 'Other',       emoji: '⭐',  color: '#6B7280' },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SocialProfile {
  id?: string;
  user_id: string;
  is_public: boolean;
  display_name: string;
  bio: string;
  disability_tags: string[];
  experiences: string;
  profile_picture?: string;
}

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  other_profile?: SocialProfile;
}

export interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// ─── Social profile ───────────────────────────────────────────────────────────
export const getMySocialProfile = async (userId: string): Promise<SocialProfile | null> => {
  const { data } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data as SocialProfile | null;
};

export const upsertSocialProfile = async (
  userId: string,
  updates: Partial<SocialProfile>,
) => {
  const { error } = await supabase
    .from('social_profiles')
    .upsert(
      { user_id: userId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
};

// ─── Discovery ────────────────────────────────────────────────────────────────
export const getDiscoverProfiles = async (userId: string): Promise<SocialProfile[]> => {
  // Exclude users already in a connection (any status)
  const { data: existing } = await supabase
    .from('connections')
    .select('requester_id, receiver_id')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

  const excluded = new Set<string>([userId]);
  (existing ?? []).forEach((c: { requester_id: string; receiver_id: string }) => {
    excluded.add(c.requester_id);
    excluded.add(c.receiver_id);
  });

  const excludedArr = Array.from(excluded);

  const { data: socialProfiles } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('is_public', true)
    .not('user_id', 'in', `(${excludedArr.join(',')})`)
    .limit(20);

  if (!socialProfiles?.length) return [];

  // Join profile pictures
  const userIds = (socialProfiles as Record<string, any>[]).map((p: Record<string, any>) => p.user_id as string);
  const { data: pics } = await supabase
    .from('profiles')
    .select('id, profile_picture')
    .in('id', userIds);

  const picMap = new Map((pics ?? []).map((p: { id: string; profile_picture?: string }) => [p.id, p.profile_picture]));

  return (socialProfiles as Record<string, any>[]).map(p => ({
    ...p,
    profile_picture: picMap.get(p.user_id) ?? undefined,
  })) as SocialProfile[];
};

// ─── Remove connection + delete chat ─────────────────────────────────────────
export const removeConnection = async (connectionId: string) => {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('id', connectionId);
  if (error) throw error;
};

export const deleteChatMessages = async (connectionId: string) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('connection_id', connectionId);
  if (error) throw error;
};

// ─── Connection requests ───────────────────────────────────────────────────────
export const sendConnectionRequest = async (requesterId: string, receiverId: string) => {
  const { error } = await supabase
    .from('connections')
    .insert({ requester_id: requesterId, receiver_id: receiverId, status: 'pending' });
  if (error) throw error;
};

export const respondToConnection = async (
  connectionId: string,
  status: 'accepted' | 'declined',
) => {
  const { error } = await supabase
    .from('connections')
    .update({ status })
    .eq('id', connectionId);
  if (error) throw error;
};

// ─── My connections (accepted) ────────────────────────────────────────────────
export const getMyConnections = async (userId: string): Promise<Connection[]> => {
  const { data: conns } = await supabase
    .from('connections')
    .select('*')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  if (!conns?.length) return [];

  const otherIds = (conns as Record<string, any>[]).map((c: Record<string, any>) => (c.requester_id === userId ? c.receiver_id : c.requester_id) as string);

  const [{ data: social }, { data: pics }] = await Promise.all([
    supabase.from('social_profiles').select('*').in('user_id', otherIds),
    supabase.from('profiles').select('id, profile_picture').in('id', otherIds),
  ]);

  const socialMap = new Map((social ?? []).map((p: Record<string, any>) => [p.user_id, p]));
  const picMap    = new Map((pics ?? []).map((p: { id: string; profile_picture?: string }) => [p.id, p.profile_picture]));

  return (conns as Record<string, any>[]).map((c: Record<string, any>) => {
    const otherId: string = c.requester_id === userId ? c.receiver_id : c.requester_id;
    const sp = socialMap.get(otherId);
    return {
      ...c,
      other_profile: sp
        ? ({ ...sp, profile_picture: picMap.get(otherId) ?? undefined } as SocialProfile)
        : undefined,
    } as Connection;
  });
};

// ─── Pending incoming requests ────────────────────────────────────────────────
export const getPendingRequests = async (userId: string): Promise<Connection[]> => {
  const { data: conns } = await supabase
    .from('connections')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (!conns?.length) return [];

  const requesterIds = (conns as Record<string, any>[]).map((c: Record<string, any>) => c.requester_id as string);

  const [{ data: social }, { data: pics }] = await Promise.all([
    supabase.from('social_profiles').select('*').in('user_id', requesterIds),
    supabase.from('profiles').select('id, profile_picture').in('id', requesterIds),
  ]);

  const socialMap = new Map((social ?? []).map((p: Record<string, any>) => [p.user_id, p]));
  const picMap    = new Map((pics ?? []).map((p: { id: string; profile_picture?: string }) => [p.id, p.profile_picture]));

  return (conns as Record<string, any>[]).map(c => {
    const sp = socialMap.get(c.requester_id);
    return {
      ...c,
      other_profile: sp
        ? { ...sp, profile_picture: picMap.get(c.requester_id) ?? undefined }
        : undefined,
    };
  }) as Connection[];
};

// ─── Messaging ────────────────────────────────────────────────────────────────
export const getMessages = async (connectionId: string): Promise<Message[]> => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: true });
  return (data ?? []) as Message[];
};

export const sendMessage = async (
  connectionId: string,
  senderId: string,
  content: string,
) => {
  const { error } = await supabase
    .from('messages')
    .insert({ connection_id: connectionId, sender_id: senderId, content });
  if (error) throw error;
};

// ─── Realtime subscriptions ───────────────────────────────────────────────────
export const subscribeToMessages = (
  connectionId: string,
  callback: (msg: Message) => void,
) =>
  supabase
    .channel(`msg-${connectionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `connection_id=eq.${connectionId}`,
      },
      (payload: any) => callback(payload.new as Message),
    )
    .subscribe();

export const subscribeToConnectionUpdates = (userId: string, callback: () => void) =>
  supabase
    .channel(`conn-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'connections',
        filter: `receiver_id=eq.${userId}`,
      },
      callback,
    )
    .subscribe();
