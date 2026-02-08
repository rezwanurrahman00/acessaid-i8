import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppTheme, getThemeConfig } from '../../constants/theme';
import { AccessAidLogo } from '../components/AccessAidLogo';
import { BackgroundLogo } from '../components/BackgroundLogo';
import { ModernButton } from '../components/ModernButton';
import { ModernCard } from '../components/ModernCard';
import { useApp } from '../contexts/AppContext';
import type { MainTabParamList } from '../types';
import { voiceManager } from '../utils/voiceCommandManager';

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
    voiceManager.removeCommand(['help', 'commands', 'what can I say']);
    voiceManager.removeCommand(['enable voice', 'voice on', 'start voice']);
    voiceManager.removeCommand(['disable voice', 'voice off', 'stop voice']);

    // Set up voice commands for home screen
    voiceManager.addCommand({
      keywords: ['read text', 'speak text', 'read aloud'],
      action: () => {
        speakText("Executing text-to-speech command." + ttsText);
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
      keywords: ['help', 'commands', 'what can I say'],
      action: () => {
        setIsListening(false);
        speakText('You can say: Read text, Go to reminders, Go to profile, or Help');
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
      voiceManager.removeCommand(['help', 'commands', 'what can I say']);
      voiceManager.removeCommand(['enable voice', 'voice on', 'start voice']);
      voiceManager.removeCommand(['disable voice', 'voice off', 'stop voice']);
    };
  }, []);

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
   * Get OCR API key from various possible locations
   */
  const getOCRAPIKey = (): string => {
    // Try multiple ways to access the API key (for different Expo versions)
    const manifestExtra = (Constants.manifest as { extra?: { OCR_SPACE_API_KEY?: string } } | null)?.extra;
    const manifest2Extra = (Constants.manifest2 as { extra?: { OCR_SPACE_API_KEY?: string } } | undefined)?.extra;

    const key =
      Constants.expoConfig?.extra?.OCR_SPACE_API_KEY ||
       manifestExtra?.OCR_SPACE_API_KEY ||
       manifest2Extra?.OCR_SPACE_API_KEY ||
      (process.env as any)?.EXPO_PUBLIC_OCR_SPACE_API_KEY ||
      '';

    // Debug logging (remove in production if needed)
    if (__DEV__) {
      console.log('🔑 OCR API Key check:', {
        hasExpoConfig: !!Constants.expoConfig,
        hasManifest: !!Constants.manifest,
        hasManifest2: !!(Constants as any).manifest2,
        keyFound: !!key,
        keyLength: key?.length || 0,
        keyPreview: key ? `${key.substring(0, 3)}...${key.substring(key.length - 3)}` : 'N/A'
      });
    }

    return key;
  };

  /**
   * Extract text from image or file using OCR.Space API
   */
  const extractTextWithOCRSpace = async (base64: string, mimeType: string = 'image/jpeg'): Promise<string> => {
    const ocrSpaceKey = getOCRAPIKey();

    if (!ocrSpaceKey || !ocrSpaceKey.trim()) {
      console.error('❌ OCR API Key is missing!');
      console.error('Available Constants:', {
        expoConfig: Constants.expoConfig ? 'exists' : 'missing',
        manifest: Constants.manifest ? 'exists' : 'missing',
        manifest2: (Constants as any).manifest2 ? 'exists' : 'missing'
      });
      Alert.alert(
        'API Key Missing',
        'OCR.Space API key is not configured. Please:\n\n1. Check app.json has OCR_SPACE_API_KEY in extra section\n2. Restart the Expo development server\n3. Reload the app'
      );
      return '';
    }

    try {
      const formData = new FormData();
      const normalizedMime = mimeType.toLowerCase();
      const isPDF = normalizedMime.includes('pdf');

      if (isPDF) {
        formData.append('base64Image', `data:application/pdf;base64,${base64}`);
        formData.append('filetype', 'PDF');
      } else {
        formData.append('base64Image', `data:${mimeType};base64,${base64}`);
        formData.append('filetype', 'IMAGE');
      }

      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('OCREngine', '2');

      console.log('📤 Sending OCR request to OCR.Space API...');
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          apikey: ocrSpaceKey,
        },
        body: formData,
      });

      console.log('📥 OCR API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ OCR API HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📄 OCR API Response data:', {
        hasData: !!data,
        isErrored: data?.IsErroredOnProcessing,
        hasResults: !!data?.ParsedResults,
        resultsCount: data?.ParsedResults?.length || 0
      });

      if (data?.IsErroredOnProcessing) {
        const message =
          data?.ErrorMessage?.[0] ||
          data?.ErrorDetails ||
          data?.ErrorMessage ||
          'Failed to process the document.';
        console.error('❌ OCR Processing Error:', message);
        throw new Error(message);
      }

      const text = data?.ParsedResults?.[0]?.ParsedText || '';
      const trimmedText = text.trim();
      
      if (!trimmedText) {
        console.warn('⚠️ OCR returned empty text');
        throw new Error('No text was extracted from the image. Please try with a clearer image or document.');
      }

      console.log('✅ OCR Success! Extracted text length:', trimmedText.length);
      return trimmedText;
    } catch (error: any) {
      console.error('❌ OCR.Space API Error:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      Alert.alert('Error', `Failed to extract text: ${errorMessage}`);
      return '';
    }
  };

  /**
   * Convert file to base64
   */
  const fileToBase64 = async (uri: string): Promise<string> => {
    try {
      const info = await FileSystemLegacy.getInfoAsync(uri);

      if (!info.exists || info.isDirectory) {
        throw new Error('File not found or is a directory.');
      }

      const { size } = info as FileSystemLegacy.FileInfo & { size?: number };

      if (size && size > 1024 * 1024) {
        throw new Error('File size exceeds 1 MB limit. Please choose a smaller file.');
      }

      return await FileSystemLegacy.readAsStringAsync(uri, { encoding: 'base64' });
    } catch (error) {
      console.error('Error converting file to base64:', error);
      throw error;
    }
  };

  /**
   * Resize/compress an image asset to stay within OCR.Space limits and return base64
   */
  const prepareImageForOCR = async (
    asset: ImagePicker.ImagePickerAsset
  ): Promise<{ base64: string; mimeType: string }> => {
    try {
      const targetWidth = Math.min(asset.width ?? 1600, 1600);
      const manipResult = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: targetWidth } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!manipResult.base64) {
        throw new Error('Unable to process image. Please try again with a different photo.');
      }

      const estimatedSizeBytes = (manipResult.base64.length * 3) / 4;
      if (estimatedSizeBytes > 1024 * 1024) {
        throw new Error('Image is still larger than 1 MB. Please choose a smaller image.');
      }

      return { base64: manipResult.base64, mimeType: 'image/jpeg' };
    } catch (error) {
      console.error('Error preparing image for OCR:', error);
      throw error;
    }
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
      speakDirect('Processing image...');

      // Prepare and extract text using OCR.Space
      let processedImage;
      try {
        processedImage = await prepareImageForOCR(asset);
      } catch (prepError: any) {
        const message = prepError?.message || 'Unable to process the captured image. Please try again with better lighting.';
        Alert.alert('Image Too Large', message);
        if (state.voiceAnnouncementsEnabled) {
          speakDirect(message);
        }
        return;
      }

      // Extract text using OCR.Space
      const extractedText = await extractTextWithOCRSpace(processedImage.base64, processedImage.mimeType);

      if (extractedText) {
        setAiReaderText(extractedText);
        if (state.voiceAnnouncementsEnabled) {
          const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
          speakDirect(extractedText, {
            language: 'en-US',
            rate: safeRate,
            pitch: 1.0,
          });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('No Text Found', 'No readable text was detected in the image. Please try again with a clearer image.');
        if (state.voiceAnnouncementsEnabled) {
          speakDirect('No text detected. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', `Failed to process image: ${error.message || 'Unknown error'}`);
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
      speakDirect('Processing image...');

      // Prepare and extract text using OCR.Space
      let processedImage;
      try {
        processedImage = await prepareImageForOCR(asset);
      } catch (prepError: any) {
        const message = prepError?.message || 'Unable to process the selected image. Please choose a smaller image.';
        Alert.alert('Image Too Large', message);
        speakDirect(message);
        return;
      }

      // Extract text using OCR.Space
      const extractedText = await extractTextWithOCRSpace(processedImage.base64, processedImage.mimeType);

      if (extractedText) {
        setAiReaderText(extractedText);
        if (state.voiceAnnouncementsEnabled) {
          const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
          speakDirect(extractedText, {
            language: 'en-US',
            rate: safeRate,
            pitch: 1.0,
          });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('No Text Found', 'No readable text was detected in the image. Please try again with a different image.');
        speakDirect('No text detected. Please try again.');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', `Failed to process image: ${error.message || 'Unknown error'}`);
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

      // Convert other files (e.g., PDF) to base64 and ensure size <= 1 MB
      let base64: string;
      try {
        base64 = await fileToBase64(file.uri);
      } catch (conversionError: any) {
        const message = conversionError?.message || 'Unable to process this file. Please choose a smaller document (under 1 MB).';
        Alert.alert('File Too Large', message);
        speakDirect('The selected file is too large. Please pick a smaller document.');
        setIsProcessing(false);
        return;
      }

      // Extract text using OCR.Space
      const extractedText = await extractTextWithOCRSpace(base64, mimeType);

      if (extractedText) {
        setAiReaderText(extractedText);
        if (state.voiceAnnouncementsEnabled) {
          const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
          speakDirect(extractedText, {
            language: 'en-US',
            rate: safeRate,
            pitch: 1.0,
          });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('No Text Found', 'No readable text was detected in the file. Please try again with a different file.');
        speakDirect('No text detected. Please try again.');
      }
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
          <ModernCard variant="elevated" style={styles.aiReaderContainer}>
            <View style={styles.aiReaderHeaderRow}>
              <View style={styles.aiReaderBadge}>
                <Ionicons name="scan" size={18} color={theme.accent} />
              </View>
              <View style={styles.aiReaderHeaderText}>
                <Text style={styles.sectionTitle}>Camera Reader</Text>
                <Text style={styles.sectionDescription}>
                  Capture, upload, or drop a file to extract text with better spacing and contrast.
                </Text>
              </View>
            </View>

            <View style={styles.aiReaderButtonsRow}>
              <View style={[styles.aiReaderButtonWrap, styles.aiReaderButtonWrapTight]}>
                <ModernButton
                  title=" Take Picture"
                  onPress={handleTakePicture}
                  variant="primary"
                  size="medium"
                  disabled={isProcessing}
                  icon={<Ionicons name="camera" size={20} color="white" />}
                  style={styles.aiReaderButton}
                  accessibilityLabel="Take a picture to extract text"
                />
              </View>

              <View style={[styles.aiReaderButtonWrap, styles.aiReaderButtonWrapTight]}>
                <ModernButton
                  title=" Upload Image"
                  onPress={handleUploadImage}
                  variant="primary"
                  size="medium"
                  disabled={isProcessing}
                  icon={<Ionicons name="image" size={20} color="white" />}
                  style={styles.aiReaderButton}
                  accessibilityLabel="Upload an image to extract text"
                />
              </View>

              <View style={[styles.aiReaderButtonWrap, styles.aiReaderButtonWrapLast]}>
                <ModernButton
                  title=" Upload File"
                  onPress={handleUploadFile}
                  variant="primary"
                  size="medium"
                  disabled={isProcessing}
                  icon={<Ionicons name="document-text" size={20} color="white" />}
                  style={styles.aiReaderButton}
                  accessibilityLabel="Upload a file to extract text"
                />
              </View>
            </View>

            {isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={styles.processingText}>Processing... Please wait</Text>
              </View>
            )}

            {aiReaderText ? (
              <View style={styles.extractedTextContainer}>
                <View style={styles.extractedTextHeader}>
                  <Text style={styles.extractedTextTitle}>Extracted Text</Text>
                  <View style={styles.extractedTextActions}>
                    <ModernButton
                      title=""
                      onPress={handleReadAgain}
                      variant="outline"
                      size="small"
                      icon={<Ionicons name="volume-high" size={16} color={theme.accent} />}
                      style={[styles.actionButton, { marginRight: 8 }]}
                      accessibilityLabel="Read text again"
                    />
                    <ModernButton
                      title=""
                      onPress={handleStopReading}
                      variant="outline"
                      size="small"
                      icon={<Ionicons name="stop" size={16} color={theme.danger} />}
                      style={styles.actionButton}
                      accessibilityLabel="Stop reading"
                    />
                  </View>
                </View>
                <ScrollView
                  style={styles.extractedTextScrollView}
                  contentContainerStyle={styles.extractedTextScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  <Text
                    style={[
                      styles.extractedText,
                      { fontSize: 16 * (state.accessibilitySettings.textZoom / 100) },
                    ]}
                    accessibilityLabel="Extracted text from document or image"
                    accessibilityRole="text"
                  >
                    {aiReaderText}
                  </Text>
                </ScrollView>
              </View>
            ) : null}
          </ModernCard>

          <View style={styles.featuresContainer}>
            <Text style={styles.sectionTitle}>Quick Access</Text>

            <FeatureCard
              title={isListening ? "Voice Commands (Active)" : "Voice Commands"}
              description={isListening ? "Listening for commands..." : "Control the app with your voice"}
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
              gradientColors={isListening ? ['#4CAF50', '#45a049'] : ['#FF6B6B', '#E53E3E']}
              accessibilityLabel="Voice Commands feature"
            />
          </View>

          <ModernCard variant="outlined" style={styles.voiceCommandsContainer}>
            <Text style={styles.sectionTitle}>Voice Commands</Text>
            <Text style={styles.voiceCommandsText}>
              Try saying: "Read text" or "Go to profile"
            </Text>
            
            <ModernButton
              title="Voice Help"
              onPress={() => {
                speakText('Available commands: Read text, Go to profile, Help');
              }}
              variant="outline"
              icon={<Ionicons name="help-circle" size={16} color={theme.accent} />}
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
      padding: 20,
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
    quickStatsContainer: {
      padding: 20,
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.cardBorder,
      shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: theme.isDark ? 6 : 2 },
      shadowOpacity: theme.isDark ? 0.3 : 0.08,
      shadowRadius: theme.isDark ? 14 : 6,
      elevation: theme.isDark ? 7 : 2,
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
      color: theme.accent,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    aiReaderContainer: {
      padding: isSmallScreen ? 18 : 22,
      marginBottom: 20,
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.cardBorder,
      shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: theme.isDark ? 6 : 3 },
      shadowOpacity: theme.isDark ? 0.3 : 0.1,
      shadowRadius: theme.isDark ? 14 : 8,
      elevation: theme.isDark ? 8 : 3,
    },
    aiReaderHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      padding: 12,
      backgroundColor: theme.accentSoft,
      borderRadius: 16,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.cardBorder,
    },
    aiReaderBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    aiReaderHeaderText: {
      flex: 1,
    },
    sectionDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
      marginBottom: 0,
      lineHeight: 20,
    },
    aiReaderButtonsRow: {
      flexDirection: isSmallScreen ? 'column' : 'row',
      alignItems: 'stretch',
      marginBottom: 16,
    },
    aiReaderButtonWrap: {
      flex: 1,
      marginBottom: isSmallScreen ? 12 : 0,
    },
    aiReaderButtonWrapTight: {
      marginRight: isSmallScreen ? 0 : 12,
    },
    aiReaderButtonWrapLast: {
      marginRight: 0,
      marginBottom: 0,
    },
    aiReaderButton: {
      width: '100%',
    },
    processingContainer: {
      alignItems: 'center',
      padding: 18,
      backgroundColor: theme.accentSoft,
      borderRadius: 14,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.cardBorder,
    },
    processingText: {
       marginTop: 10,
       fontSize: 15,
       color: theme.textPrimary,
       fontWeight: '700',
    },
    extractedTextContainer: {
      marginTop: 8,
      padding: 14,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.cardBorder,
      borderRadius: 16,
      backgroundColor: theme.inputBackground,
    },
    extractedTextHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      paddingBottom: 8,
      borderBottomWidth: theme.isDark ? 1 : 0.5,
      borderBottomColor: theme.cardBorder,
    },
    extractedTextTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.textPrimary,
    },
    extractedTextActions: {
      flexDirection: 'row',
    },
    actionButton: {
      minWidth: 40,
      minHeight: 40,
      backgroundColor: theme.accentSoft,
      borderRadius: 12,
    },
    extractedTextScrollView: {
      maxHeight: 320,
      marginTop: 10,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.accentSoft,
      borderRadius: 12,
      backgroundColor: theme.inputBackground,
    },
    extractedTextScrollContent: {
      padding: 16,
    },
    extractedText: {
      color: theme.textPrimary,
      lineHeight: 24,
      fontSize: 16,
    },
  });

export default HomeScreen;

