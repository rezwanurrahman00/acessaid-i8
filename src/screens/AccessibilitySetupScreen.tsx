import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useApp } from '../contexts/AppContext';
import { AccessAidLogo } from '../components/AccessAidLogo';
import { AccessibilitySetupPopup } from '../components/AccessibilitySetupPopup';
import { BackgroundLogo } from '../components/BackgroundLogo';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AccessibilitySetupScreen = () => {
  const { state, dispatch } = useApp();
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Welcome message
    Speech.speak(
      'Welcome to AccessAid! Let\'s set up your accessibility preferences for the best experience.',
      {
        rate: state.accessibilitySettings.voiceSpeed,
        pitch: 1.0,
        quality: Speech.VoiceQuality.Enhanced,
      }
    );
  }, []);

  const handleSaveSettings = (settings: {
    brightness: number;
    textZoom: number;
    voiceSpeed: number;
  }) => {
    // Update accessibility settings
    dispatch({
      type: 'UPDATE_ACCESSIBILITY_SETTINGS',
      payload: {
        brightness: settings.brightness,
        textZoom: settings.textZoom,
        voiceSpeed: settings.voiceSpeed,
      },
    });

    // Mark setup as completed
    dispatch({ type: 'COMPLETE_SETUP' });

    // Success feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClose = () => {
    // This shouldn't be called as the popup is not dismissible
    // until settings are saved
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
    >
      <BackgroundLogo />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <AccessAidLogo size={100} showText={true} />
          <Text style={styles.welcomeText}>
            Welcome to AccessAid!
          </Text>
          <Text style={styles.subtitleText}>
            Let's customize your accessibility experience
          </Text>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>
            Setting Up Your Preferences
          </Text>
          <Text style={styles.instructionsText}>
            The setup screen will appear below. You can adjust:
          </Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>☀️</Text>
              <Text style={styles.featureText}>Display Brightness</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📝</Text>
              <Text style={styles.featureText}>Text Size & Zoom</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🎤</Text>
              <Text style={styles.featureText}>Voice Speed Control</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🗣️</Text>
              <Text style={styles.featureText}>Voice Commands</Text>
            </View>
          </View>

          <Text style={styles.instructionsNote}>
            Use voice commands like "Increase brightness" or "Make text bigger" 
            to control the settings hands-free.
          </Text>
        </View>
      </Animated.View>

      {/* Accessibility Setup Popup */}
      <AccessibilitySetupPopup
        visible={true}
        onSave={handleSaveSettings}
        onClose={handleClose}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    backdropFilter: 'blur(10px)',
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  featureList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    flex: 1,
  },
  instructionsNote: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default AccessibilitySetupScreen;