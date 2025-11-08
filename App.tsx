import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from './src/contexts/AppContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import { runDatabaseTests } from './src/utils/databaseTest';

// Expose database test function globally for console testing
if (typeof global !== 'undefined') {
  (global as any).runDatabaseTests = runDatabaseTests;
  console.log('✅ Database test function available: runDatabaseTests()');
  console.log('💡 Usage: runDatabaseTests(true) - clears storage before testing');
  console.log('💡 Usage: runDatabaseTests(false) - keeps existing data');
}

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
