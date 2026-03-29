import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { MainTabParamList } from '../types';
import { navigationRef } from '../navigation/AppNavigator';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppTheme, getThemeConfig } from '../../constants/theme';
import { AccessAidLogo } from '../components/AccessAidLogo';
import { BackgroundLogo } from '../components/BackgroundLogo';
import { ModernButton } from '../components/ModernButton';
import { ModernCard } from '../components/ModernCard';
import { useApp } from '../contexts/AppContext';
import { voiceManager } from '../utils/voiceCommandManager';
import { sendImageMessage } from '../services/geminiService';


// Conditional import for clipboard (same pattern as ReminderScreen)
let Clipboard: any = null;
try {
  Clipboard = require('expo-clipboard');
} catch {
  Clipboard = { setStringAsync: async (_: string) => {} };
}

// Conditional import for expo-speech-recognition (not available in Expo Go)
let ExpoSpeechRecognitionModule: any = null;
try {
  ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch (e) {
  console.log('⚠️ Voice input not available (Expo Go). Use development build for voice features.');
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isPhone = screenWidth < 768;

const HomeScreen = () => {
  const { state } = useApp();
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const [ttsText, setTtsText] = useState('');
  const ttsTextRef = useRef(''); // mirrors ttsText; read by stale-closure voice commands
  const [isListening, setIsListening] = useState(false);
  const [isVoiceInputMode, setIsVoiceInputMode] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // AI Reader state
  const [aiReaderText, setAiReaderText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const theme = useMemo(() => getThemeConfig(state.accessibilitySettings.isDarkMode), [state.accessibilitySettings.isDarkMode]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const gradientColors = theme.gradient as [string, string, ...string[]];
  const placeholderColor = theme.placeholder;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Clear previous commands
    voiceManager.removeCommand(['read text', 'speak text', 'read aloud']);
    voiceManager.removeCommand(['go to profile', 'profile', 'settings']);
    voiceManager.removeCommand(['go to reminders', 'reminders', 'show reminders']);
    voiceManager.removeCommand(['add reminder', 'create reminder', 'set reminder', 'remind me to', 'new reminder']);
    voiceManager.removeCommand(['help', 'commands', 'what can I say']);
    voiceManager.removeCommand(['enable voice', 'voice on', 'start voice']);
    voiceManager.removeCommand(['disable voice', 'voice off', 'stop voice']);

    // Set up voice commands for home screen
    voiceManager.addCommand({
      keywords: ['read text', 'speak text', 'read aloud'],
      action: () => {
        speakText('Executing text-to-speech command. ' + ttsTextRef.current);
      },
      description: 'Read the text in the input field',
      category: 'general'
    });

    // Camera commands removed


    voiceManager.addCommand({
      keywords: ['go to profile', 'profile', 'settings'],
      action: () => {
        setIsListening(false);
        navigation.navigate('Profile');
        speakText('Navigating to profile');
      },
      description: 'Go to profile screen',
      category: 'navigation'
    });

    voiceManager.addCommand({
      keywords: ['go to reminders', 'reminders', 'show reminders'],
      action: () => {
        setIsListening(false);
        navigation.navigate('Reminders');
        speakText('Navigating to reminders');
      },
      description: 'Go to reminders screen',
      category: 'navigation'
    });

    voiceManager.addCommand({
      keywords: ['add reminder', 'create reminder', 'set reminder', 'remind me to', 'new reminder'],
      action: () => {
        setIsListening(false);
        navigation.navigate('Reminders');
        speakText('Opening reminders to add a new one. You can say the reminder details naturally.');
      },
      description: 'Create a new reminder',
      category: 'reminder'
    });

    voiceManager.addCommand({
      keywords: ['help', 'commands', 'what can I say'],
      action: () => {
        setIsListening(false);
        speakText('You can say: Read text, Add reminder, Go to reminders, Go to profile, or Help');
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

    return () => {
      // Clean up voice commands when component unmounts
      voiceManager.removeCommand(['read text', 'speak text', 'read aloud']);
      voiceManager.removeCommand(['go to profile', 'profile', 'settings']);
      voiceManager.removeCommand(['go to reminders', 'reminders', 'show reminders']);
      voiceManager.removeCommand(['add reminder', 'create reminder', 'set reminder', 'remind me to', 'new reminder']);
      voiceManager.removeCommand(['help', 'commands', 'what can I say']);
      voiceManager.removeCommand(['enable voice', 'voice on', 'start voice']);
      voiceManager.removeCommand(['disable voice', 'voice off', 'stop voice']);
    };
  }, []);

  // Keep ref in sync so voice commands registered once can read the current value
  useEffect(() => {
    ttsTextRef.current = ttsText;
  }, [ttsText]);

  // Announce screen on mount only
  useEffect(() => {
    voiceManager.announceScreenChange('home');
    speakText(`Welcome back, ${state.user?.name || 'User'}! You can use text-to-speech. Say "help" for voice commands.`);
  }, []);

  const speakText = (text: string) => {
    console.log('speakText called with text:', text);
    if (!text.trim()) {
      console.log('speakText: No text to read');
      Alert.alert('No Text', 'Please enter some text to read aloud.');
      return;
    }
    if (!state.voiceAnnouncementsEnabled) {
      console.log('speakText: Voice announcements disabled');
      return;
    }
    console.log('speakText: Speaking text');
    try { Speech.stop(); } catch {}
    try {
      const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
      Speech.speak(text, {
        rate: safeRate,
        pitch: 1.0,
      });
    } catch {}
  };

  // Helper for direct Speech.speak calls (respects voice announcements setting)
  const speakDirect = (text: string, options?: any) => {
    if (!state.voiceAnnouncementsEnabled) return;
    try { Speech.stop(); } catch {}
    Speech.speak(text, options || { language: 'en-US', rate: 1.0 });
  };

  const handleVoiceInput = async () => {
    if (isVoiceInputMode) {
      setIsVoiceInputMode(false);
      return;
    }

    // Check if voice recognition is available
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        'Feature Not Available',
        'Voice input requires a development build. Please run:\n\nnpx expo run:android --device\n\nVoice input is not available in Expo Go.'
      );
      return;
    }

    setIsVoiceInputMode(true);

    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Microphone permission is needed for voice input.');
        setIsVoiceInputMode(false);
        return;
      }

      // Set up one-time listener for voice-to-text
      const subscription = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
        const transcript = event.results?.[0]?.transcript;
        const isFinal = event.isFinal;
        
        if (transcript && !isFinal) {
          console.log('🎤 Voice input recording...', transcript);
        }
        
        if (transcript && isFinal) {
          console.log('✅ Voice input complete:', transcript);
          setTtsText(prev => prev ? `${prev} ${transcript}` : transcript);
          setIsVoiceInputMode(false);
          subscription.remove();
        }
      });

      const errorSubscription = ExpoSpeechRecognitionModule.addListener('error', () => {
        setIsVoiceInputMode(false);
        subscription.remove();
        errorSubscription.remove();
      });

      await ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        contextualStrings: [],
      });
    } catch (error) {
      console.error('Voice input error:', error);
      setIsVoiceInputMode(false);
    }
  };

  /**
   * Resize/compress an image asset and return base64 for AI extraction
   */
  const prepareImageForAI = async (
    asset: ImagePicker.ImagePickerAsset
  ): Promise<string> => {
    const targetWidth = Math.min(asset.width ?? 1600, 1600);
    const manipResult = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: targetWidth } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!manipResult.base64) {
      throw new Error('Unable to process image. Please try again.');
    }
    return manipResult.base64;
  };

  /**
   * Extract text from an image using the Groq vision AI model
   */
  const extractTextWithAI = async (base64: string): Promise<string> => {
    const text = await sendImageMessage(
      base64,
      'image/jpeg',
      'Extract all text from this image exactly as it appears. Return only the raw text content, preserving line breaks. Do not add descriptions or commentary.'
    );
    if (!text.trim()) {
      throw new Error('No text found in the image. Please try again with better lighting and make sure the text is in focus.');
    }
    return text.trim();
  };

  /**
   * Handle taking a picture with camera
   */
  const handleTakePicture = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (state.voiceAnnouncementsEnabled) {
        speakDirect('Opening camera...');
      }

      // Request camera permission
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take pictures.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];

      setIsProcessing(true);
      setAiReaderText('');
      speakDirect('Analyzing image with AI...');

      const base64 = await prepareImageForAI(asset);
      const extractedText = await extractTextWithAI(base64);

      setAiReaderText(extractedText);
      if (state.voiceAnnouncementsEnabled) {
        const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
        speakDirect(extractedText, { language: 'en-US', rate: safeRate, pitch: 1.0 });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', error.message || 'Failed to extract text. Please try again.');
      if (state.voiceAnnouncementsEnabled) speakDirect('Could not read text. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle uploading an image from gallery
   */
  const handleUploadImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      speakDirect('Opening image gallery...');

      // Request media library permission
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaPermission.status !== 'granted') {
        Alert.alert('Permission Required', 'Media library permission is needed to select images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];

      setIsProcessing(true);
      setAiReaderText('');
      speakDirect('Analyzing image with AI...');

      const base64 = await prepareImageForAI(asset);
      const extractedText = await extractTextWithAI(base64);

      setAiReaderText(extractedText);
      if (state.voiceAnnouncementsEnabled) {
        const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
        speakDirect(extractedText, { language: 'en-US', rate: safeRate, pitch: 1.0 });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', error.message || 'Failed to extract text. Please try again.');
      if (state.voiceAnnouncementsEnabled) speakDirect('Could not read text. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle uploading a file (PDF or text)
   */
  const handleUploadFile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      speakDirect('Opening file picker...');

      // Launch document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      const mimeType = (file.mimeType || 'application/pdf').toLowerCase();

      setIsProcessing(true);
      setAiReaderText('');
      speakDirect('Processing file...');

      // If it's a plain text file, read directly without OCR
      if (mimeType.includes('text')) {
        try {
          const content = await FileSystemLegacy.readAsStringAsync(file.uri, {
            encoding: 'utf8',
          });
          const trimmed = content.trim();
          if (trimmed) {
            setAiReaderText(trimmed);
            if (state.voiceAnnouncementsEnabled) {
              const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
              speakDirect(trimmed, {
                language: 'en-US',
                rate: safeRate,
                pitch: 1.0,
              });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Alert.alert('No Text Found', 'The selected file appears to be empty.');
          }
        } catch (readError: any) {
          Alert.alert('Error', `Failed to read the text file: ${readError.message || 'Unknown error'}`);
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      // PDFs and other non-image files are not supported by AI vision
      Alert.alert(
        'Unsupported File Type',
        'PDF text extraction is not supported. Please take a photo of the document or upload an image file instead.'
      );
      speakDirect('PDF files are not supported. Please take a photo of the document instead.');
      setIsProcessing(false);
      return;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', `Failed to process file: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Read the extracted text again
   */
  const handleReadAgain = () => {
    if (aiReaderText.trim()) {
      if (state.voiceAnnouncementsEnabled) {
        const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
        speakDirect(aiReaderText, {
          language: 'en-US',
          rate: safeRate,
          pitch: 1.0,
        });
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Alert.alert('No Text', 'No text to read. Please upload or capture a document first.');
    }
  };

  /**
   * Stop reading
   */
  const handleStopReading = () => {
    Speech.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /**
   * Copy extracted OCR text to clipboard
   */
  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(aiReaderText);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Text copied to clipboard.');
      if (state.voiceAnnouncementsEnabled) {
        speakDirect('Text copied to clipboard.');
      }
    } catch (error) {
      console.error('Failed to copy text:', error);
      Alert.alert('Error', 'Failed to copy text. Please try again.');
    }
  };

  /**
   * Save extracted OCR text as a reminder (tries API, falls back to local state)
   */
  const handleSaveAsReminder = () => {
    // Navigate to Reminders tab with the scanned text pre-filled in the Create Reminder form
    navigation.navigate('Reminders', { prefillDescription: aiReaderText });
    if (state.voiceAnnouncementsEnabled) {
      speakDirect('Opening create reminder with scanned text.');
    }
  };

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
        <Ionicons name={icon as any} size={52} color="white" />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </ModernCard>
  );

  const QuickStatsCard = ({
    title,
    stats
  }: {
    title: string;
    stats: { value: string; label: string }[]
  }) => (
    <LinearGradient
      colors={['#4A90E2', '#357ABD']}
      style={styles.quickStatsGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.quickStatsTitle}>{title}</Text>
      <View style={styles.statsRow}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <Text style={styles.statNumber}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
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
                title={isVoiceInputMode ? 'Stop Input' : 'Voice Input'}
                onPress={handleVoiceInput}
                variant={isVoiceInputMode ? 'danger' : 'outline'}
                size="small"
                icon={<Ionicons name={isVoiceInputMode ? "mic" : "mic-outline"} size={16} color={isVoiceInputMode ? theme.danger : theme.accent} />}
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
                placeholderTextColor={placeholderColor}
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

          {/* AI Reader Section */}
          <View style={styles.aiReaderContainer}>
            {/* Header */}
            <LinearGradient
              colors={['#4F46E5', '#818CF8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.aiReaderHeader}
            >
              <View style={styles.aiReaderHeaderIcon}>
                <Ionicons name="scan" size={22} color="#fff" />
              </View>
              <View style={styles.aiReaderHeaderText}>
                <Text style={styles.aiReaderTitle}>AI Camera Reader</Text>
                <Text style={styles.aiReaderSubtitle}>AccessAid</Text>
              </View>
              <View style={styles.aiReaderBadgePill}>
                <Text style={styles.aiReaderBadgeText}>AI</Text>
              </View>
            </LinearGradient>

            {/* Action Buttons */}
            <View style={styles.aiReaderBody}>
              {/* Camera button — full width */}
              <TouchableOpacity
                style={[styles.cameraPrimaryBtn, isProcessing && styles.btnDisabled]}
                onPress={handleTakePicture}
                disabled={isProcessing}
                accessibilityLabel="Take a picture to extract text"
              >
                <LinearGradient
                  colors={isProcessing ? ['#9CA3AF', '#9CA3AF'] : ['#4F46E5', '#818CF8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cameraPrimaryBtnInner}
                >
                  <Ionicons name="camera" size={22} color="#fff" />
                  <Text style={styles.cameraPrimaryBtnText}>Take a Picture</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Secondary row */}
              <View style={styles.aiReaderSecondRow}>
                <TouchableOpacity
                  style={[styles.cameraSecondaryBtn, { borderColor: '#4F46E5' }, isProcessing && styles.btnDisabled]}
                  onPress={handleUploadImage}
                  disabled={isProcessing}
                  accessibilityLabel="Upload an image to extract text"
                >
                  <Ionicons name="image-outline" size={20} color="#4F46E5" />
                  <Text style={[styles.cameraSecondaryBtnText, { color: '#4F46E5' }]}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cameraSecondaryBtn, { borderColor: '#7C3AED' }, isProcessing && styles.btnDisabled]}
                  onPress={handleUploadFile}
                  disabled={isProcessing}
                  accessibilityLabel="Upload a file to extract text"
                >
                  <Ionicons name="document-text-outline" size={20} color="#7C3AED" />
                  <Text style={[styles.cameraSecondaryBtnText, { color: '#7C3AED' }]}>File</Text>
                </TouchableOpacity>
              </View>

              {/* Processing state */}
              {isProcessing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                  <Text style={styles.processingTitle}>Analyzing with AI...</Text>
                  <Text style={styles.processingSubText}>Groq Vision is reading your image</Text>
                </View>
              )}

              {/* Result area */}
              {aiReaderText ? (
                <View style={styles.resultContainer}>
                  {/* Result header */}
                  <View style={styles.resultHeader}>
                    <View style={styles.resultHeaderLeft}>
                      <View style={styles.resultDot} />
                      <Text style={styles.resultTitle}>Extracted Text</Text>
                    </View>
                    <View style={styles.resultHeaderActions}>
                      <TouchableOpacity
                        style={styles.resultIconBtn}
                        onPress={handleReadAgain}
                        accessibilityLabel="Read text again"
                      >
                        <Ionicons name="volume-high-outline" size={18} color="#4F46E5" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.resultIconBtn, { marginLeft: 8 }]}
                        onPress={handleStopReading}
                        accessibilityLabel="Stop reading"
                      >
                        <Ionicons name="stop-circle-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Text content */}
                  <ScrollView
                    style={styles.resultScroll}
                    contentContainerStyle={styles.resultScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text
                      style={[styles.resultText, { fontSize: 15 * (state.accessibilitySettings.textZoom / 100) }]}
                      accessibilityLabel="Extracted text"
                      accessibilityRole="text"
                    >
                      {aiReaderText}
                    </Text>
                  </ScrollView>

                  {/* Footer actions */}
                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={styles.resultActionOutline}
                      onPress={handleCopyText}
                      accessibilityLabel="Copy text"
                    >
                      <Ionicons name="copy-outline" size={16} color="#4F46E5" />
                      <Text style={[styles.resultActionText, { color: '#4F46E5' }]}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resultActionFilled}
                      onPress={handleSaveAsReminder}
                      accessibilityLabel="Save as reminder"
                    >
                      <Ionicons name="bookmark-outline" size={16} color="#fff" />
                      <Text style={[styles.resultActionText, { color: '#fff' }]}>Save as Reminder</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.featuresContainer}>
            <FeatureCard
              title={isListening ? "Voice Commands (Active)" : "Voice Commands"}
              description={isListening ? "Listening for commands..." : "Control the app with your voice"}
              icon="mic"
              onPress={() => {
                if (isListening) {
                  setIsListening(false);
                  voiceManager.stopListening();
                } else {
                  if (!ExpoSpeechRecognitionModule && Platform.OS !== 'web') {
                    Alert.alert(
                      'Feature Not Available',
                      'Voice commands require a development build.\n\nnpx expo run:android\n\nNot available in Expo Go.'
                    );
                    return;
                  }
                  setIsListening(true);
                  voiceManager.startListening(() => setIsListening(false));
                }
              }}
              gradientColors={isListening ? ['#4CAF50', '#45a049'] : ['#FF6B6B', '#E53E3E']}
              accessibilityLabel="Voice Commands feature"
            />
            <FeatureCard
              title="Accessible Places"
              description="Find wheelchair-friendly spots near you"
              icon="location"
              onPress={() => navigationRef.current?.navigate('AccessiblePlaces')}
              gradientColors={['#7C3AED', '#A855F7']}
              accessibilityLabel="Find accessible places near you"
            />
            <FeatureCard
              title="Camera Guide"
              description="Point camera to describe obstacles & safe paths"
              icon="scan"
              onPress={() => navigationRef.current?.navigate('CameraGuide')}
              gradientColors={['#0ea5e9', '#6366f1']}
              accessibilityLabel="AI camera guide for accessibility"
            />
          </View>

          <QuickStatsCard
            title="Quick Stats"
            stats={[
              { value: `${Math.round(state.accessibilitySettings.brightness)}%`, label: 'Brightness' },
              { value: `${Math.round(state.accessibilitySettings.textZoom)}%`, label: 'Text Size' },
              { value: `${state.accessibilitySettings.voiceSpeed.toFixed(1)}x`, label: 'Voice Speed' },
              { value: `${state.reminders.filter(r => !r.isCompleted).length}`, label: 'Reminders' },
            ]}
          />


        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
      color: theme.textInverted,
      marginTop: isSmallScreen ? 10 : 15,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.35)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 5,
      paddingHorizontal: isSmallScreen ? 10 : 0,
    },
    subtitleText: {
      fontSize: isSmallScreen ? 14 : 16,
      color: theme.textInverted,
      opacity: 0.85,
      marginTop: isSmallScreen ? 6 : 8,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
      paddingHorizontal: isSmallScreen ? 10 : 0,
    },
    ttsContainer: {
      padding: 20,
      marginBottom: 20,
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.cardBorder,
      shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: theme.isDark ? 6 : 3 },
      shadowOpacity: theme.isDark ? 0.35 : 0.08,
      shadowRadius: theme.isDark ? 16 : 8,
      elevation: theme.isDark ? 8 : 3,
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
      color: theme.textPrimary,
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
      borderColor: theme.inputBorder,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.inputBackground,
      minHeight: 100,
      color: theme.textPrimary,
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
      padding: 30,
    },
    cardTitle: {
      color: theme.textInverted,
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 8,
    },
    cardDescription: {
      color: theme.textInverted,
      fontSize: 14,
      opacity: 0.9,
      textAlign: 'center',
    },
    voiceCommandsContainer: {
      padding: 20,
      marginBottom: 20,
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.cardBorder,
      shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: theme.isDark ? 5 : 2 },
      shadowOpacity: theme.isDark ? 0.25 : 0.08,
      shadowRadius: theme.isDark ? 12 : 6,
      elevation: theme.isDark ? 6 : 2,
    },
    voiceCommandsText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 15,
      lineHeight: 20,
    },
    voiceCommandButton: {
      width: '100%',
    },
    quickStatsGradient: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 15,
      shadowColor: '#4A90E2',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
    quickStatsTitle: {
      color: 'white',
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 16,
    },
    infoText: {
      color: theme.textMuted,
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
      color: 'white',
    },
    statLabel: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.85)',
      marginTop: 4,
    },
    aiReaderContainer: {
      marginBottom: 20,
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: theme.cardBackground,
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 6,
    },
    aiReaderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 18,
    },
    aiReaderHeaderIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    aiReaderHeaderText: {
      flex: 1,
    },
    aiReaderTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#fff',
    },
    aiReaderSubtitle: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 1,
    },
    aiReaderBadgePill: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    aiReaderBadgeText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 12,
      letterSpacing: 1,
    },
    aiReaderBody: {
      padding: 16,
    },
    cameraPrimaryBtn: {
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 12,
    },
    cameraPrimaryBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 10,
    },
    cameraPrimaryBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    aiReaderSecondRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 4,
    },
    cameraSecondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 13,
      borderWidth: 1.5,
      backgroundColor: theme.cardBackground,
      gap: 6,
    },
    cameraSecondaryBtnText: {
      fontWeight: '700',
      fontSize: 14,
    },
    btnDisabled: {
      opacity: 0.5,
    },
    processingContainer: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
      marginTop: 12,
      backgroundColor: theme.isDark ? '#1E1B4B' : '#EEF2FF',
      borderRadius: 16,
    },
    processingTitle: {
      marginTop: 12,
      fontSize: 15,
      fontWeight: '700',
      color: '#4F46E5',
    },
    processingSubText: {
      marginTop: 4,
      fontSize: 12,
      color: theme.textSecondary,
    },
    resultContainer: {
      marginTop: 14,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.isDark ? '#312E81' : '#E0E7FF',
      backgroundColor: theme.isDark ? '#1E1B4B' : '#F5F3FF',
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? '#312E81' : '#E0E7FF',
    },
    resultHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    resultDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#4F46E5',
    },
    resultTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    resultHeaderActions: {
      flexDirection: 'row',
    },
    resultIconBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme.isDark ? '#312E81' : '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultScroll: {
      maxHeight: 260,
    },
    resultScrollContent: {
      padding: 14,
    },
    resultText: {
      color: theme.textPrimary,
      lineHeight: 24,
      fontSize: 15,
    },
    resultActions: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? '#312E81' : '#E0E7FF',
    },
    resultActionOutline: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: '#4F46E5',
      backgroundColor: 'transparent',
    },
    resultActionFilled: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 11,
      backgroundColor: '#4F46E5',
    },
    resultActionText: {
      fontWeight: '700',
      fontSize: 13,
    },
    sectionDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
      lineHeight: 20,
    },
  });

export default HomeScreen;

