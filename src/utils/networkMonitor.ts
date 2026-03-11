/**
 * networkMonitor.ts
 * 
 * Watches the device's network connection and automatically flushes
 * the offline sync queue (syncQueue.ts) when connectivity is restored.
 *
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { processQueue, getQueueLength } from './syncQueue';

// Callback type so UI components can react to connection changes
type ConnectionListener = (isConnected: boolean) => void;

class NetworkMonitor {
  private listeners: Set<ConnectionListener> = new Set();
  private isConnected: boolean = true;
  private unsubscribe: (() => void) | null = null;

  /**
   * Start watching network state.
   * Call this once from App.tsx on mount.
   */
  start() {
    if (this.unsubscribe) return; // already running

    this.unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
      const connected = !!(state.isConnected && state.isInternetReachable !== false);

      const wasOffline = !this.isConnected;
      this.isConnected = connected;

      // Notify all subscribed UI components
      this.listeners.forEach(cb => cb(connected));

      // If we just came back online, flush any queued offline operations
      if (connected && wasOffline) {
        console.log('🌐 Network restored — flushing offline sync queue...');
        try {
          const pending = await getQueueLength();
          if (pending > 0) {
            const synced = await processQueue();
            console.log(`✅ Auto-synced ${synced}/${pending} offline operation(s) after reconnect`);
          } else {
            console.log('✅ No offline operations to sync');
          }
        } catch (err) {
          console.warn('⚠️ Auto-sync after reconnect failed:', err);
        }
      }

      if (!connected) {
        console.log('📴 Network lost — changes will be queued for later sync');
      }
    });

    console.log('🔌 NetworkMonitor started');
  }

  /** Stop watching (call on unmount if needed) */
  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /** Subscribe a UI component to connection changes */
  addListener(cb: ConnectionListener): () => void {
    this.listeners.add(cb);
    // Immediately call with current state so the component is in sync
    cb(this.isConnected);
    return () => this.listeners.delete(cb);
  }

  /** Current connection state (synchronous read) */
  getIsConnected(): boolean {
    return this.isConnected;
  }
}

// Singleton — import and use from anywhere in the app
export const networkMonitor = new NetworkMonitor();
