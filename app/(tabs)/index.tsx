import { TouchableOpacity, Text, Alert, ScrollView, Switch } from 'react-native';
import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const router = useRouter();

  // TTS Function
  const speakText = async (text: string) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    try {
      setIsSpeaking(true);
      await Speech.speak(text, {
        rate: speechRate,
        pitch: 1.0,
        volume: 1.0,
        language: 'en-US',
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
      Alert.alert('TTS Error', 'Unable to use text-to-speech. Please check your device settings.');
    }
  };

  // Welcome message with TTS
  const welcomeMessage = "Welcome to AccessAid! Your personal accessibility assistant. Tap the buttons below to explore features.";

  return (
    <ScrollView style={[styles.container, highContrast && styles.highContrast]}>
      {/* Header */}
      <ThemedView style={[styles.header, highContrast && styles.highContrastHeader]}>
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.logo}
        />
        <ThemedText style={[styles.title, largeText && styles.largeText]}>
          AccessAid
        </ThemedText>
        <ThemedText style={[styles.subtitle, largeText && styles.largeSubtext]}>
          Your Accessibility Assistant
        </ThemedText>
        <ThemedText style={[styles.teamText, largeText && styles.largeSubtext]}>
          by Code Innovators
        </ThemedText>
      </ThemedView>

      {/* Accessibility Settings */}
      <ThemedView style={[styles.settingsContainer, highContrast && styles.highContrastCard]}>
        <ThemedText style={[styles.sectionTitle, largeText && styles.largeText]}>
          Accessibility Settings
        </ThemedText>
        
        <ThemedView style={styles.settingRow}>
          <ThemedText style={[styles.settingLabel, largeText && styles.largeSubtext]}>
            High Contrast Mode
          </ThemedText>
          <Switch
            value={highContrast}
            onValueChange={setHighContrast}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={highContrast ? '#f5dd4b' : '#f4f3f4'}
          />
        </ThemedView>

        <ThemedView style={styles.settingRow}>
          <ThemedText style={[styles.settingLabel, largeText && styles.largeSubtext]}>
            Large Text
          </ThemedText>
          <Switch
            value={largeText}
            onValueChange={setLargeText}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={largeText ? '#f5dd4b' : '#f4f3f4'}
          />
        </ThemedView>

        <ThemedView style={styles.settingRow}>
          <ThemedText style={[styles.settingLabel, largeText && styles.largeSubtext]}>
            Speech Rate: {speechRate.toFixed(1)}x
          </ThemedText>
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => setSpeechRate(prev => prev === 2.0 ? 0.5 : prev + 0.5)}
          >
            <Text style={styles.rateButtonText}>Adjust</Text>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      {/* Main Features */}
      <ThemedView style={[styles.featuresContainer, highContrast && styles.highContrastCard]}>
        <ThemedText style={[styles.sectionTitle, largeText && styles.largeText]}>
          Main Features
        </ThemedText>

        {/* TTS Feature */}
        <TouchableOpacity
          style={[
            styles.featureButton,
            isSpeaking && styles.speakingButton,
            highContrast && styles.highContrastButton
          ]}
          onPress={() => speakText(welcomeMessage)}
          accessibilityLabel={isSpeaking ? "Stop speaking" : "Start text to speech"}
          accessibilityHint="Double tap to hear the welcome message"
        >
          <Text style={[styles.featureButtonText, largeText && styles.largeButtonText]}>
            {isSpeaking ? "🔇 Stop Speaking" : "🔊 Text-to-Speech"}
          </Text>
          <ThemedText style={[styles.featureDescription, largeText && styles.largeSubtext]}>
            {isSpeaking ? "Tap to stop" : "Tap to hear welcome message"}
          </ThemedText>
        </TouchableOpacity>

        {/* Reminders Feature */}
        <TouchableOpacity
          style={[
            styles.featureButton,
            styles.remindersButton,
            highContrast && styles.highContrastButton
          ]}
          onPress={() => speakText("Reminders feature coming soon! This will help you manage your daily tasks and appointments.")}
          accessibilityLabel="Reminders feature"
          accessibilityHint="Double tap to learn about reminders"
        >
          <Text style={[styles.featureButtonText, largeText && styles.largeButtonText]}>
            📅 Smart Reminders
          </Text>
          <ThemedText style={[styles.featureDescription, largeText && styles.largeSubtext]}>
            Intelligent task and appointment reminders
          </ThemedText>
        </TouchableOpacity>

        {/* Voice Navigation */}
        <TouchableOpacity
          style={[
            styles.featureButton,
            styles.navigationButton,
            highContrast && styles.highContrastButton
          ]}
          onPress={() => speakText("Voice navigation helps you move through the app using voice commands. This feature is coming soon!")}
          accessibilityLabel="Voice navigation feature"
          accessibilityHint="Double tap to learn about voice navigation"
        >
          <Text style={[styles.featureButtonText, largeText && styles.largeButtonText]}>
            🎤 Voice Navigation
          </Text>
          <ThemedText style={[styles.featureDescription, largeText && styles.largeSubtext]}>
            Navigate the app using voice commands
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Quick Actions */}
      <ThemedView style={[styles.quickActionsContainer, highContrast && styles.highContrastCard]}>
        <ThemedText style={[styles.sectionTitle, largeText && styles.largeText]}>
          Quick Actions
        </ThemedText>
        
        <ThemedView style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.remindersQuickButton, highContrast && styles.highContrastButton]}
            onPress={() => {
              speakText("Opening reminders");
              router.push('/reminders');
            }}
            accessibilityLabel="Open reminders"
            accessibilityHint="Double tap to go to reminders screen"
          >
            <Text style={[styles.quickActionText, largeText && styles.largeSubtext]}>📅 Reminders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.quickActionButton, styles.settingsQuickButton, highContrast && styles.highContrastButton]}
            onPress={() => {
              speakText("Opening settings");
              router.push('/settings');
            }}
            accessibilityLabel="Open settings"
            accessibilityHint="Double tap to go to settings screen"
          >
            <Text style={[styles.quickActionText, largeText && styles.largeSubtext]}>⚙️ Settings</Text>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      {/* Footer */}
      <ThemedView style={styles.footer}>
        <ThemedText style={[styles.footerText, largeText && styles.largeSubtext]}>
          AccessAid - Making technology accessible for everyone
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  highContrast: {
    backgroundColor: '#000000',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#4A90E2',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  highContrastHeader: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  logo: {
    height: 80,
    width: 80,
    marginBottom: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
    textAlign: 'center',
  },
  largeText: {
    fontSize: 40,
  },
  subtitle: {
    fontSize: 18,
    color: '#E8F4FD',
    marginBottom: 5,
    textAlign: 'center',
  },
  largeSubtext: {
    fontSize: 22,
  },
  teamText: {
    fontSize: 14,
    color: '#B8D4F0',
    fontStyle: 'italic',
  },
  settingsContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highContrastCard: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  rateButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  featuresContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureButton: {
    backgroundColor: '#4A90E2',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  speakingButton: {
    backgroundColor: '#FF6B6B',
  },
  remindersButton: {
    backgroundColor: '#32CD32',
  },
  navigationButton: {
    backgroundColor: '#FF8C00',
  },
  highContrastButton: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  featureButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  largeButtonText: {
    fontSize: 22,
  },
  featureDescription: {
    color: '#E8F4FD',
    fontSize: 14,
    textAlign: 'center',
  },
  quickActionsContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    backgroundColor: '#6C7B7F',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  remindersQuickButton: {
    backgroundColor: '#32CD32',
  },
  settingsQuickButton: {
    backgroundColor: '#6C7B7F',
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
