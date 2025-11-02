import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from './src/contexts/AppContext';
import { AccessAidLogo } from './src/components/AccessAidLogo';
import { ModernButton } from './src/components/ModernButton';

function TestScreen() {
  const handlePress = () => {
    console.log('Button pressed!');
    alert('TouchableOpacity is working!');
  };

  return (
    <View style={styles.container}>
      <AccessAidLogo size={80} showText={true} />
      <Text style={styles.title}>AccessAid Test</Text>
      
      <ModernButton
        title="Test Modern Button"
        onPress={handlePress}
        variant="primary"
        style={styles.button}
      />
      
      <TouchableOpacity style={styles.basicButton} onPress={handlePress}>
        <Text style={styles.basicButtonText}>Basic TouchableOpacity</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="auto" />
      <TestScreen />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    marginBottom: 15,
    width: '100%',
  },
  basicButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  basicButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
