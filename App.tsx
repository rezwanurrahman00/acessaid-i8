import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppProvider } from './src/contexts/AppContext';

// Must be set at module level — controls how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import { NetworkBanner } from './src/components/NetworkBanner';
import { networkMonitor } from './src/utils/networkMonitor';


export default function App() {
  useEffect(() => {
  networkMonitor.start();
  return () => networkMonitor.stop();
}, []);
  useEffect(() => {
    // Handle notification tap while the app is open or backgrounded
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Main' as any, { screen: 'Reminders' } as any);
      }
    });

    // Handle cold-start: app was closed when the user tapped the notification banner
    let interval: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification?.request?.content?.data?.reminderId) {
        // Poll until the navigation container is ready (typically < 500 ms)
        interval = setInterval(() => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('Main' as any, { screen: 'Reminders' } as any);
            clearInterval(interval!);
            interval = null;
          }
        }, 100);
        // Stop polling after 5 seconds to avoid an infinite loop
        timeout = setTimeout(() => {
          if (interval) clearInterval(interval);
          interval = null;
        }, 5000);
      }
    });

    return () => {
      sub.remove();
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <StatusBar style="auto" />
        <AppNavigator />
        <NetworkBanner />
      </AppProvider>
    </ErrorBoundary>
  );
}
