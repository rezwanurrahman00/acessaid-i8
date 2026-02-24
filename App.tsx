import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppProvider } from './src/contexts/AppContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Handle notification tap while the app is open or backgrounded
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Main' as any, { screen: 'Reminders' } as any);
      }
    });

    // Handle cold-start: app was closed when the user tapped the notification banner
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification?.request?.content?.data?.reminderId) {
        // Poll until the navigation container is ready (typically < 500 ms)
        const interval = setInterval(() => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('Main' as any, { screen: 'Reminders' } as any);
            clearInterval(interval);
          }
        }, 100);
        // Stop polling after 5 seconds to avoid an infinite loop
        setTimeout(() => clearInterval(interval), 5000);
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AppProvider>
    </ErrorBoundary>
  );
}
