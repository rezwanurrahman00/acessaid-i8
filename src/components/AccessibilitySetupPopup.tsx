import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import * as Brightness from 'expo-brightness';
import { Ionicons } from '@expo/vector-icons';
import { AccessAidLogo } from './AccessAidLogo';
import { ModernButton } from './ModernButton';
import { TouchSlider } from './TouchSlider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AccessibilitySetupPopupProps {
  visible: boolean;
  onSave: (settings: {
    brightness: number;
    textZoom: number;
    voiceSpeed: number;
  }) => void;
  onClose: () => void;
}

export const AccessibilitySetupPopup: React.FC<AccessibilitySetupPopupProps> = ({
  visible,
  onSave,
  onClose,
}) => {
  const [brightness, setBrightness] = useState(50);
  const [textZoom, setTextZoom] = useState(100);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [isListening, setIsListening] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [waveAnim] = useState(new Animated.Value(0));

  const sampleText = "The quick brown fox jumps over the lazy dog. This is a preview of how text will appear with your selected settings.";

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    // Apply brightness changes live
    Brightness.setBrightnessAsync(brightness / 100);
  }, [brightness]);

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTextZoomChange = (value: number) => {
    setTextZoom(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleVoiceSpeedChange = (value: number) => {
    setVoiceSpeed(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const startVoiceListening = () => {
    setIsListening(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate microphone pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animate wave effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Simulate voice recognition (in real app, use expo-speech-recognition)
    setTimeout(() => {
      processVoiceCommand("increase brightness");
    }, 2000);
  };

  const stopVoiceListening = () => {
    setIsListening(false);
    pulseAnim.stopAnimation();
    waveAnim.stopAnimation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('brightness')) {
      if (lowerCommand.includes('increase') || lowerCommand.includes('brighter')) {
        setBrightness(Math.min(100, brightness + 20));
        speakText('Brightness increased');
      } else if (lowerCommand.includes('decrease') || lowerCommand.includes('dimmer')) {
        setBrightness(Math.max(0, brightness - 20));
        speakText('Brightness decreased');
      } else if (lowerCommand.includes('medium')) {
        setBrightness(50);
        speakText('Brightness set to medium');
      } else if (lowerCommand.includes('high') || lowerCommand.includes('maximum')) {
        setBrightness(100);
        speakText('Brightness set to maximum');
      } else if (lowerCommand.includes('low') || lowerCommand.includes('minimum')) {
        setBrightness(0);
        speakText('Brightness set to minimum');
      }
    } else if (lowerCommand.includes('text') || lowerCommand.includes('font')) {
      if (lowerCommand.includes('bigger') || lowerCommand.includes('larger')) {
        setTextZoom(Math.min(180, textZoom + 20));
        speakText('Text size increased');
      } else if (lowerCommand.includes('smaller')) {
        setTextZoom(Math.max(80, textZoom - 20));
        speakText('Text size decreased');
      } else if (lowerCommand.includes('normal')) {
        setTextZoom(100);
        speakText('Text size set to normal');
      } else if (lowerCommand.includes('large')) {
        setTextZoom(140);
        speakText('Text size set to large');
      }
    } else if (lowerCommand.includes('voice') || lowerCommand.includes('speed')) {
      if (lowerCommand.includes('faster')) {
        setVoiceSpeed(Math.min(2.0, voiceSpeed + 0.3));
        speakText('Voice speed increased');
      } else if (lowerCommand.includes('slower')) {
        setVoiceSpeed(Math.max(0.5, voiceSpeed - 0.3));
        speakText('Voice speed decreased');
      } else if (lowerCommand.includes('normal')) {
        setVoiceSpeed(1.0);
        speakText('Voice speed set to normal');
      }
    }
    
    stopVoiceListening();
  };

  const speakText = (text: string) => {
    Speech.speak(text, {
      rate: voiceSpeed,
      pitch: 1.0,
      quality: Speech.VoiceQuality.Enhanced,
    });
  };


  const handleSaveAndContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    speakText('Settings saved successfully. Welcome to AccessAid!');
    
    onSave({
      brightness,
      textZoom,
      voiceSpeed,
    });
    
    // Apply final settings
    Brightness.setBrightnessAsync(brightness / 100);
  };

  const getBrightnessLabel = (value: number) => {
    if (value <= 25) return 'Low';
    if (value <= 50) return 'Medium';
    if (value <= 75) return 'High';
    return 'Maximum';
  };

  const getTextZoomLabel = (value: number) => {
    if (value <= 90) return 'Small';
    if (value <= 110) return 'Normal';
    if (value <= 140) return 'Large';
    return 'Extra Large';
  };

  const getVoiceSpeedLabel = (value: number) => {
    if (value <= 0.7) return 'Slow';
    if (value <= 1.3) return 'Normal';
    return 'Fast';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={styles.popup}
          >
            {/* Header */}
            <View style={styles.header}>
              <AccessAidLogo size={40} showText={false} />
              <Text style={styles.title}>Accessibility Setup</Text>
              <Text style={styles.subtitle}>
                Customize your experience for better accessibility
              </Text>
              
              {/* Voice Control Button */}
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  isListening && styles.voiceButtonActive,
                ]}
                onPress={isListening ? stopVoiceListening : startVoiceListening}
                accessibilityLabel={isListening ? 'Stop voice control' : 'Start voice control'}
              >
                <Animated.View
                  style={[
                    styles.voiceIconContainer,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Ionicons
                    name={isListening ? 'mic' : 'mic-outline'}
                    size={20}
                    color={isListening ? '#FF6B6B' : '#4A90E2'}
                  />
                </Animated.View>
                
                {isListening && (
                  <Animated.View
                    style={[
                      styles.waveContainer,
                      {
                        opacity: waveAnim,
                        transform: [
                          {
                            scale: waveAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.5],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.wave} />
                  </Animated.View>
                )}
              </TouchableOpacity>
            </View>

            {/* Settings Cards */}
            <ScrollView 
              style={styles.settingsContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.settingsContent}
            >
              {/* Brightness Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingHeader}>
                  <Ionicons name="sunny" size={24} color="#FFA726" />
                  <Text style={styles.settingTitle}>Display Brightness</Text>
                  <Text style={styles.settingValue}>
                    {brightness}% • {getBrightnessLabel(brightness)}
                  </Text>
                </View>
                
                <TouchSlider
                  value={brightness}
                  min={0}
                  max={100}
                  onValueChange={handleBrightnessChange}
                  levelLabels={['Low', 'Medium', 'High', 'Max']}
                  unit="%"
                  accessibilityLabel="Brightness slider"
                />
                
                <Text style={styles.settingDescription}>
                  Adjust screen brightness for comfortable viewing
                </Text>
              </View>

              {/* Text Zoom Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingHeader}>
                  <Ionicons name="text" size={24} color="#42A5F5" />
                  <Text style={styles.settingTitle}>Text Size</Text>
                  <Text style={styles.settingValue}>
                    {textZoom}% • {getTextZoomLabel(textZoom)}
                  </Text>
                </View>
                
                <TouchSlider
                  value={textZoom}
                  min={80}
                  max={180}
                  onValueChange={handleTextZoomChange}
                  levelLabels={['Small', 'Normal', 'Large', 'XL']}
                  unit="%"
                  accessibilityLabel="Text size slider"
                />
                
                <Text style={styles.settingDescription}>
                  Make text larger or smaller for better readability
                </Text>
                
                {/* Preview Text */}
                <View style={styles.previewContainer}>
                  <Text style={styles.previewLabel}>Preview:</Text>
                  <Text
                    style={[
                      styles.previewText,
                      { fontSize: 16 * (textZoom / 100) },
                    ]}
                  >
                    {sampleText}
                  </Text>
                </View>
              </View>

              {/* Voice Speed Card */}
              <View style={styles.settingCard}>
                <View style={styles.settingHeader}>
                  <Ionicons name="volume-high" size={24} color="#66BB6A" />
                  <Text style={styles.settingTitle}>Voice Speed</Text>
                  <Text style={styles.settingValue}>
                    {voiceSpeed.toFixed(1)}x • {getVoiceSpeedLabel(voiceSpeed)}
                  </Text>
                </View>
                
                <TouchSlider
                  value={voiceSpeed}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onValueChange={handleVoiceSpeedChange}
                  levelLabels={['Slow', 'Normal', 'Fast']}
                  unit="x"
                  accessibilityLabel="Voice speed slider"
                />
                
                <Text style={styles.settingDescription}>
                  Control how fast text is spoken aloud
                </Text>
                
                <ModernButton
                  title="Test Voice"
                  onPress={() => speakText('This is how your voice will sound at the current speed.')}
                  variant="outline"
                  size="small"
                  icon={<Ionicons name="play" size={16} color="#4A90E2" />}
                  style={styles.testButton}
                />
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <ModernButton
                title="Save & Continue"
                onPress={handleSaveAndContinue}
                variant="primary"
                size="large"
                icon={<Ionicons name="checkmark" size={20} color="white" />}
                style={styles.saveButton}
              />
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.9,
  },
  popup: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  voiceButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F8FF',
    borderWidth: 2,
    borderColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  voiceButtonActive: {
    backgroundColor: '#FFE0E0',
    borderColor: '#FF6B6B',
  },
  voiceIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wave: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    opacity: 0.6,
  },
  settingsContainer: {
    marginBottom: 24,
    maxHeight: screenHeight * 0.5,
  },
  settingsContent: {
    paddingBottom: 10,
  },
  settingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 12,
    flex: 1,
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
  previewContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  testButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  actionButtons: {
    gap: 12,
  },
  saveButton: {
    width: '100%',
  },
});

export default AccessibilitySetupPopup;