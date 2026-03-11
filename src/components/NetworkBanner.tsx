/**
 * NetworkBanner.tsx
 *
 * A slim status banner that slides in at the top of the screen whenever the
 * device goes offline, and confirms reconnection with a brief "Back online" 
 * message before hiding itself.
 *
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { networkMonitor } from '../utils/networkMonitor';

type BannerState = 'hidden' | 'offline' | 'reconnected';

export const NetworkBanner: React.FC = () => {
  const [bannerState, setBannerState] = useState<BannerState>('hidden');
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide the banner into view
  const showBanner = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  // Slide the banner out of view
  const hideBanner = (delay = 0) => {
    hideTimer.current = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setBannerState('hidden'));
    }, delay);
  };

  useEffect(() => {
    // Subscribe to network changes via the singleton monitor
    const unsubscribe = networkMonitor.addListener((isConnected: boolean) => {
      if (!isConnected) {
        setBannerState('offline');
        showBanner();
      } else {
        // Only show "Back online" if we were showing the offline banner
        setBannerState(prev => {
          if (prev === 'offline') {
            showBanner();
            // Auto-hide "Back online" after 2.5 s
            hideBanner(2500);
            return 'reconnected';
          }
          return 'hidden';
        });
      }
    });

    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (bannerState === 'hidden') return null;

  const isOffline = bannerState === 'offline';

  return (
    <Animated.View
      style={[
        styles.banner,
        isOffline ? styles.offlineBanner : styles.onlineBanner,
        { transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Text style={styles.icon}>{isOffline ? '📴' : '✅'}</Text>
        <View>
          <Text style={styles.title}>
            {isOffline ? 'No Internet Connection' : 'Back Online'}
          </Text>
          <Text style={styles.subtitle}>
            {isOffline
              ? 'Changes will sync automatically when reconnected'
              : 'Your changes are being synced now'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  offlineBanner: {
    backgroundColor: '#E53E3E', // red
  },
  onlineBanner: {
    backgroundColor: '#38A169', // green
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 1,
  },
});

