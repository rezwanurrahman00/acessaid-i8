import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { AccessAidLogo } from '../components/AccessAidLogo';
import { BackgroundLogo } from '../components/BackgroundLogo';
import { ModernButton } from '../components/ModernButton';
import { ModernCard } from '../components/ModernCard';
import { voiceManager } from '../utils/voiceCommandManager';
let ImagePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImagePicker = require('expo-image-picker');
} catch {}
let ImageManipulator: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImageManipulator = require('expo-image-manipulator');
} catch {}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isPhone = screenWidth < 768;

const HomeScreen = () => {
  const { state } = useApp();
  const [ttsText, setTtsText] = useState('');
  const [isListening, setIsListening] = useState(false);
  // Camera feature removed
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Set up voice commands for home screen
    voiceManager.addCommand({
      keywords: ['read text', 'speak text', 'read aloud'],
      action: () => speakText(ttsText),
      description: 'Read the text in the input field',
      category: 'general'
    });

    // Camera commands removed


    voiceManager.addCommand({
      keywords: ['go to profile', 'profile', 'settings'],
      action: () => {
        // Navigation would be handled by tab navigator
        speakText('Navigating to profile');
      },
      description: 'Go to profile screen',
      category: 'navigation'
    });

    voiceManager.addCommand({
      keywords: ['go to reminders', 'reminders', 'show reminders'],
      action: () => {
        // Navigation would be handled by tab navigator
        speakText('Navigating to reminders');
      },
      description: 'Go to reminders screen',
      category: 'navigation'
    });

    voiceManager.addCommand({
      keywords: ['help', 'commands', 'what can I say'],
      action: () => {
        speakText('You can say: Read text, Open camera, Go to reminders, Go to profile, or Help');
      },
      description: 'Show available voice commands',
      category: 'general'
    });

    voiceManager.addCommand({
      keywords: ['enable voice', 'voice on', 'start voice'],
      action: () => {
        setIsListening(true);
        voiceManager.startListening();
        speakText('Voice commands enabled. You can now speak your commands.');
      },
      description: 'Enable voice commands',
      category: 'general'
    });

    voiceManager.addCommand({
      keywords: ['disable voice', 'voice off', 'stop voice'],
      action: () => {
        setIsListening(false);
        voiceManager.stopListening();
        speakText('Voice commands disabled');
      },
      description: 'Disable voice commands',
      category: 'general'
    });

    // Announce screen change
    voiceManager.announceScreenChange('home');
    speakText(`Welcome back, ${state.user?.name || 'User'}! You can use text-to-speech or camera reader. Say "help" for voice commands.`);

    return () => {
      // Clean up voice commands when component unmounts
      voiceManager.removeCommand(['read text', 'speak text', 'read aloud']);
      // Camera commands removed
      voiceManager.removeCommand(['go to profile', 'profile', 'settings']);
      voiceManager.removeCommand(['go to reminders', 'reminders', 'show reminders']);
      voiceManager.removeCommand(['help', 'commands', 'what can I say']);
      voiceManager.removeCommand(['enable voice', 'voice on', 'start voice']);
      voiceManager.removeCommand(['disable voice', 'voice off', 'stop voice']);
    };
  }, [ttsText]);

  const speakText = (text: string) => {
    if (!text.trim()) {
      Alert.alert('No Text', 'Please enter some text to read aloud.');
      return;
    }
    try { Speech.stop(); } catch {}
    try {
      const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
      Speech.speak(text, {
        rate: safeRate,
        pitch: 1.0,
      });
    } catch {}
  };

  const handleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      voiceManager.stopListening();
      return;
    }
    setIsListening(true);
    voiceManager.startListening();
  };

  const handleCameraFeature = async () => {
    try {
      if (!ImagePicker) {
        Alert.alert('Unavailable', 'Camera is unavailable in this environment.');
        return;
      }
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to capture text.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ base64: !ImageManipulator, quality: 1.0 });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      let b64: string | undefined = res.assets?.[0]?.base64;
      if (!b64) {
        if (!uri) {
          Alert.alert('No image', 'Could not read the captured image.');
          return;
        }
        if (ImageManipulator) {
          // Preprocess: resize for better OCR, generate base64
          let processed = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1600 } }],
            { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          b64 = processed.base64;
        }
      }
      if (!b64) {
        Alert.alert('Processing failed', 'Could not process the captured image.');
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      let text = await recognizeText(b64);
      // If no text, try rotated variants to handle orientation
      if (!text && ImageManipulator && uri) {
        try {
          const rot90 = await ImageManipulator.manipulateAsync(uri, [{ rotate: 90 }, { resize: { width: 1600 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true });
          text = await recognizeText(rot90.base64 || '');
        } catch {}
      }
      if (!text && ImageManipulator && uri) {
        try {
          const rot270 = await ImageManipulator.manipulateAsync(uri, [{ rotate: 270 }, { resize: { width: 1600 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true });
          text = await recognizeText(rot270.base64 || '');
        } catch {}
      }
      const description = await describeImage(b64);

      let combined = '';
      if (description) {
        combined += `Description: ${description}`;
      }
      if (text) {
        combined += (combined ? '\n' : '') + `Text: ${text}`;
      }

      if (combined) {
        setTtsText(combined);
        speakText(combined);
      } else {
        speakText('Nothing recognized. Please try again with better lighting and framing.');
        Alert.alert('Nothing recognized', 'Try again with better lighting and framing.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to capture or read text.');
    }
  };

  const recognizeText = async (base64: string): Promise<string> => {
    const apiKey = (Constants as any).expoConfig?.extra?.OCR_API_KEY || (Constants as any).manifest?.extra?.OCR_API_KEY;
    const customUrl = (Constants as any).expoConfig?.extra?.OCR_API_URL || (Constants as any).manifest?.extra?.OCR_API_URL;
    const customKey = (Constants as any).expoConfig?.extra?.OCR_API_KEY2 || (Constants as any).manifest?.extra?.OCR_API_KEY2;

    // Try providers in order
    // 1) OCR.space
    if (apiKey) {
      try {
        const form = new FormData();
        form.append('base64Image', `data:image/jpeg;base64,${base64}` as any);
        form.append('language', 'eng');
        form.append('isOverlayRequired', 'false');
        form.append('detectOrientation', 'true');
        form.append('scale', 'true');
        form.append('OCREngine', '2');
        const resp = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: { apikey: apiKey },
          body: form as any,
        });
        const json = await resp.json();
        const text = json?.ParsedResults?.[0]?.ParsedText || '';
        if (text && String(text).trim()) return String(text).trim();
      } catch {}
    }

    // 2) Custom OCR endpoint (POST JSON: { imageBase64 })
    if (customUrl && customKey) {
      try {
        const resp2 = await fetch(customUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customKey}`,
          },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const json2 = await resp2.json();
        const text2 = json2?.text || json2?.result || '';
        if (text2 && String(text2).trim()) return String(text2).trim();
      } catch {}
    }

    return '';
  };

  const describeImage = async (base64: string): Promise<string> => {
    // Prefer a custom vision endpoint if provided
    const visionUrl = (Constants as any).expoConfig?.extra?.VISION_API_URL || (Constants as any).manifest?.extra?.VISION_API_URL;
    const visionKey = (Constants as any).expoConfig?.extra?.VISION_API_KEY || (Constants as any).manifest?.extra?.VISION_API_KEY;
    if (!visionUrl || !visionKey) {
      return '';
    }
    try {
      const resp = await fetch(visionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${visionKey}`,
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const json = await resp.json();
      const desc = json?.description || json?.result || json?.caption || '';
      return String(desc).trim();
    } catch {
      return '';
    }
  };

  // Camera text extracted removed

  const FeatureCard = ({ 
    title, 
    description, 
    icon, 
    onPress, 
    gradientColors,
    accessibilityLabel 
  }: {
    title: string;
    description: string;
    icon: string;
    onPress: () => void;
    gradientColors: string[];
    accessibilityLabel: string;
  }) => (
    <ModernCard
      variant="gradient"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={styles.featureCard}
    >
      <View style={styles.cardContent}>
        <Ionicons name={icon as any} size={40} color="white" />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </ModernCard>
  );

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
    >
      <BackgroundLogo />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.logoContainer}>
              <AccessAidLogo size={70} showText={true} />
            </View>
            <Text style={styles.welcomeText}>
              Welcome back, {state.user?.name || 'User'}!
            </Text>
            <Text style={styles.subtitleText}>
              Choose an accessibility feature below
            </Text>
          </Animated.View>

          <ModernCard variant="elevated" style={styles.ttsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Text-to-Speech</Text>
              <ModernButton
                title={isListening ? 'Listening...' : 'Voice Input'}
                onPress={handleVoiceInput}
                variant={isListening ? 'danger' : 'outline'}
                size="small"
                icon={<Ionicons name={isListening ? "mic" : "mic-outline"} size={16} color={isListening ? "#FF6B6B" : "#4A90E2"} />}
                style={styles.voiceInputButton}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: 16 * (state.accessibilitySettings.textZoom / 100) }
                ]}
                value={ttsText}
                onChangeText={setTtsText}
                placeholder="Type or speak your text here..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Text input for speech"
                accessibilityHint="Enter text that you want the app to read aloud"
              />
            </View>
            
            <ModernButton
              title="Read Aloud"
              onPress={() => speakText(ttsText)}
              variant="primary"
              size="large"
              icon={<Ionicons name="volume-high" size={20} color="white" />}
              style={styles.speakButton}
            />
          </ModernCard>

          <View style={styles.featuresContainer}>
            <Text style={styles.sectionTitle}>Quick Access</Text>

            <FeatureCard
              title="Camera Reader"
              description="Capture text from camera and read aloud"
              icon="camera"
              onPress={handleCameraFeature}
              gradientColors={['#4A90E2', '#357ABD']}
              accessibilityLabel="Camera Reader feature"
            />

            {!(Constants as any).expoConfig?.extra?.VISION_API_URL && (
              <Text style={styles.infoText}>Tip: Add extra.VISION_API_URL and VISION_API_KEY in app config to enable AI object descriptions.</Text>
            )}
            {!(Constants as any).expoConfig?.extra?.OCR_API_KEY && !(Constants as any).expoConfig?.extra?.OCR_API_URL && (
              <Text style={styles.infoText}>Tip: Add extra.OCR_API_KEY (OCR.space) or OCR_API_URL/OCR_API_KEY2 to enable OCR.</Text>
            )}
            
            {/* Camera feature removed */}

            <FeatureCard
              title="Voice Commands"
              description="Control the app with your voice"
              icon="mic"
              onPress={() => {
                if (isListening) {
                  setIsListening(false);
                  voiceManager.stopListening();
                } else {
                  setIsListening(true);
                  voiceManager.startListening();
                }
              }}
              gradientColors={['#FF6B6B', '#E53E3E']}
              accessibilityLabel="Voice Commands feature"
            />
          </View>

          <ModernCard variant="outlined" style={styles.voiceCommandsContainer}>
            <Text style={styles.sectionTitle}>Voice Commands</Text>
            <Text style={styles.voiceCommandsText}>
              Try saying: "Read text", "Open camera", or "Go to profile"
            </Text>
            
            <ModernButton
              title="Voice Help"
              onPress={() => {
                speakText('Available commands: Read text, Open camera, Go to profile, Help');
              }}
              variant="outline"
              icon={<Ionicons name="help-circle" size={16} color="#4A90E2" />}
              style={styles.voiceCommandButton}
            />
          </ModernCard>

          <ModernCard variant="elevated" style={styles.quickStatsContainer}>
            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {Math.round(state.accessibilitySettings.brightness)}%
                </Text>
                <Text style={styles.statLabel}>Brightness</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {Math.round(state.accessibilitySettings.textZoom)}%
                </Text>
                <Text style={styles.statLabel}>Text Size</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {Math.round(state.accessibilitySettings.voiceSpeed * 100)}%
                </Text>
                <Text style={styles.statLabel}>Voice Speed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {state.reminders.filter(r => !r.isCompleted).length}
                </Text>
                <Text style={styles.statLabel}>Reminders</Text>
              </View>
            </View>
          </ModernCard>


        </ScrollView>
      </Animated.View>

      {/* Camera modal removed */}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 20 : 30,
    paddingTop: isSmallScreen ? 15 : 20,
    paddingHorizontal: isSmallScreen ? 10 : 0,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isSmallScreen ? 15 : 20,
    minWidth: isSmallScreen ? 180 : 200,
    maxWidth: screenWidth - 40,
  },
  welcomeText: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: isSmallScreen ? 10 : 15,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    paddingHorizontal: isSmallScreen ? 10 : 0,
  },
  subtitleText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: isSmallScreen ? 6 : 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    paddingHorizontal: isSmallScreen ? 10 : 0,
  },
  ttsContainer: {
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  voiceInputButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inputContainer: {
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    minHeight: 100,
  },
  speakButton: {
    width: '100%',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureCard: {
    marginBottom: 15,
  },
  cardContent: {
    alignItems: 'center',
    padding: 20,
  },
  cardTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  cardDescription: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    textAlign: 'center',
  },
  voiceCommandsContainer: {
    padding: 20,
    marginBottom: 20,
  },
  voiceCommandsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  voiceCommandButton: {
    width: '100%',
  },
  quickStatsContainer: {
    padding: 20,
  },
  infoText: {
    color: '#9CA3AF',
    marginTop: 8,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default HomeScreen;