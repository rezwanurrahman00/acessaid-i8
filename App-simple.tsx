import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ModernButton } from './src/components/ModernButton';
import { ModernCard } from './src/components/ModernCard';

export default function App() {
  const handlePress = () => {
    Alert.alert('Success', 'TouchableOpacity is working!');
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>AccessAid Test</Text>
        
        <ModernCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Test Components</Text>
          <Text style={styles.cardText}>Testing TouchableOpacity and components</Text>
          
          <ModernButton
            title="Test Modern Button"
            onPress={handlePress}
            variant="primary"
            style={styles.button}
          />
          
          <TouchableOpacity style={styles.basicButton} onPress={handlePress}>
            <Text style={styles.basicButtonText}>Basic TouchableOpacity</Text>
          </TouchableOpacity>
        </ModernCard>
      </View>
      <StatusBar style="auto" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    marginBottom: 15,
  },
  basicButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  basicButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
