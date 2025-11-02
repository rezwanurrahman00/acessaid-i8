import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from './src/contexts/AppContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AppProvider>
    </ErrorBoundary>
  );
}
