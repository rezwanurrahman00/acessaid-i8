import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const QUEUE_KEY = 'reminder_sync_queue_v1';

// ─── Types ────────────────────────────────────────────────────────────────────

type CreateData = {
  title: string;
  description?: string;
  reminder_datetime: string;
  frequency: string;
  priority: string;
};

type UpdateData = Partial<CreateData>;

export type SyncOp =
  | { id: string; type: 'create'; userId: string; data: CreateData }
  | { id: string; type: 'update'; reminderId: string; data: UpdateData }
  | { id: string; type: 'delete'; reminderId: string }
  | { id: string; type: 'complete'; reminderId: string; isCompleted: boolean };

// ─── Internal helpers ─────────────────────────────────────────────────────────

const loadQueue = async (): Promise<SyncOp[]> => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveQueue = async (queue: SyncOp[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Add an operation to the offline queue. */
export const addToQueue = async (op: Omit<SyncOp, 'id'>): Promise<void> => {
  const queue = await loadQueue();
  const entry = {
    ...op,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
  } as SyncOp;
  queue.push(entry);
  await saveQueue(queue);
  console.log(`📥 Queued offline op: ${op.type}`);
};

/** How many operations are waiting to sync. */
export const getQueueLength = async (): Promise<number> => {
  const queue = await loadQueue();
  return queue.length;
};

/**
 * Replay all queued operations against Supabase.
 * Operations that succeed are removed; failed ones stay for the next retry.
 * Returns the number of successfully synced operations.
 */
export const processQueue = async (): Promise<number> => {
  const queue = await loadQueue();
  if (queue.length === 0) return 0;

  console.log(`🔄 Processing ${queue.length} pending offline operation(s)...`);

  const remaining: SyncOp[] = [];
  let synced = 0;

  for (const op of queue) {
    try {
      let result: { error: any };

      if (op.type === 'create') {
        result = await supabase.from('reminders').insert({
          user_id: op.userId,
          ...op.data,
        });
      } else if (op.type === 'update') {
        result = await supabase
          .from('reminders')
          .update(op.data)
          .eq('id', op.reminderId);
      } else if (op.type === 'delete') {
        result = await supabase
          .from('reminders')
          .delete()
          .eq('id', op.reminderId);
      } else {
        // complete
        result = await supabase
          .from('reminders')
          .update({
            is_completed: op.isCompleted,
            is_active: !op.isCompleted,
          })
          .eq('id', op.reminderId);
      }

      if (result.error) throw result.error;
      synced++;
      console.log(`✅ Synced: ${op.type}`);
    } catch {
      remaining.push(op);
      console.log(`⚠️ Kept in queue (will retry): ${op.type}`);
    }
  }

  await saveQueue(remaining);
  if (synced > 0) {
    console.log(`✅ Synced ${synced} of ${queue.length} offline operations`);
  }
  return synced;
};
