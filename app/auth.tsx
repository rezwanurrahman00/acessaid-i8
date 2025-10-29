import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  Vibration,
  PermissionsAndroid,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState('');
  const [currentField, setCurrentField] = useState('email');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [speechText, setSpeechText] = useState('');
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const rotateAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const voiceAnim = useState(new Animated.Value(0))[0];

  // Refs for accessibility
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  
  // Debounce timers for speech feedback
  const nameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const passwordTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Watch for user changes and navigate when user is set
  useEffect(() => {
    console.log('AuthScreen - user changed:', user);
    if (user) {
      console.log('User is set, navigating to main app...');
      router.replace('/(tabs)');
    }
  }, [user, router]);

  // Start animations on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation for background elements
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    // Welcome speech
    speakText("Welcome to AccessAid. Use voice commands: say 'email', 'password', or 'submit'. Voice input coming soon.");

    // Request microphone permission
    requestMicrophonePermission();
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clear any intervals when component unmounts
      if ((startVoiceListening as any).repeatInterval) {
        clearInterval((startVoiceListening as any).repeatInterval);
      }
    };
  }, []);

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      console.log('Requesting microphone permission...');
      
      // First check if we already have permission
      const { status: existingStatus } = await Audio.getPermissionsAsync();
      if (existingStatus === 'granted') {
        console.log('Microphone permission already granted');
        return true;
      }

      // Request permission
      const { status } = await Audio.requestPermissionsAsync();
      console.log('Permission status:', status);
      
      if (status !== 'granted') {
        speakText("Microphone permission is required for voice input. Please enable it in settings and try again.");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      speakText("Failed to request microphone permission. Please check your device settings.");
      return false;
    }
  };

  // Voice command functions
  const speakText = (text: string) => {
    Speech.speak(text, {
      rate: 0.8,
      pitch: 1.0,
      volume: 1.0,
      language: 'en-US',
    });
  };

  // Debounced speech feedback - only speaks after user stops typing
  const debouncedSpeak = (text: string, timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>, delay: number = 1000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      speakText(text);
    }, delay);
  };

  const startVoiceListening = () => {
    setIsListening(true);
    Vibration.vibrate(100);
    speakText("Voice commands active. Say 'help' for commands, 'email' for email field, 'password' for password field, or 'submit' to sign in.");

    // Animate voice button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto-repeat voice commands every 10 seconds
    const repeatInterval = setInterval(() => {
      if (isListening) {
        speakText("Voice commands: Say 'email', 'password', or 'submit'.");
      }
    }, 10000);

    // Store interval ID for cleanup
    (startVoiceListening as any).repeatInterval = repeatInterval;
  };

  const stopVoiceListening = () => {
    setIsListening(false);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    
    // Clear the repeat interval
    if ((startVoiceListening as any).repeatInterval) {
      clearInterval((startVoiceListening as any).repeatInterval);
      (startVoiceListening as any).repeatInterval = null;
    }
    
    speakText("Voice listening stopped.");
  };

  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('help')) {
      speakText("Simple commands: Say 'email' for email field, 'password' for password field, 'submit' to sign in, or 'sign up' to create account.");
    } else if (lowerCommand.includes('email')) {
      setCurrentField('email');
      emailInputRef.current?.focus();
      speakText("Email field selected. Type your email address.");
    } else if (lowerCommand.includes('password')) {
      setCurrentField('password');
      passwordInputRef.current?.focus();
      speakText("Password field selected. Type your password.");
    } else if (lowerCommand.includes('name') && isSignUp) {
      setCurrentField('name');
      nameInputRef.current?.focus();
      speakText("Name field selected. Type your name.");
    } else if (lowerCommand.includes('sign up')) {
      setIsSignUp(true);
      speakText("Sign up mode. Enter your name, email, and password.");
    } else if (lowerCommand.includes('sign in')) {
      setIsSignUp(false);
      speakText("Sign in mode. Enter your email and password.");
    } else if (lowerCommand.includes('submit') || lowerCommand.includes('login') || lowerCommand.includes('sign in now')) {
      handleAuth();
    } else {
      speakText("Say 'email', 'password', or 'submit'.");
    }
  };

  // Start microphone recording
  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        console.log('Permission denied');
        return;
      }

      setIsRecording(true);
      setIsProcessingSpeech(false);
      setSpeechText('');
      
      speakText("Listening... Speak your email and password clearly.");
      Vibration.vibrate(100);

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      console.log('Creating recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      console.log('Recording created successfully');
      setRecording(recording);
      
      // Animate microphone button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
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

    } catch (error) {
      console.error('Failed to start recording:', error);
      speakText("Failed to start recording. Using text input instead.");
      setIsRecording(false);
      
      // Fallback to text input
      setTimeout(() => {
        speakText("Please use the text fields below to enter your email and password manually.");
      }, 2000);
    }
  };

  // Stop microphone recording and process speech
  const stopRecording = async () => {
    try {
      if (!recording) {
        console.log('No recording to stop');
        setIsRecording(false);
        return;
      }

      console.log('Stopping recording...');
      setIsRecording(false);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      
      speakText("Processing your speech...");
      setIsProcessingSpeech(true);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording URI:', uri);
      setRecording(null);

      // Process the audio file (in a real app, you'd send this to a speech recognition service)
      // For now, we'll simulate speech recognition
      await processAudioFile(uri);

    } catch (error) {
      console.error('Failed to stop recording:', error);
      speakText("Failed to process recording. Please try again or use text input.");
      setIsProcessingSpeech(false);
      setIsRecording(false);
    }
  };

  // Process audio file and convert to text
  const processAudioFile = async (uri: string | null) => {
    try {
      // In a real app, you would send the audio file to a speech recognition service
      // like Google Speech-to-Text, Azure Speech, or AWS Transcribe
      
      // For demo purposes, we'll simulate speech recognition with common patterns
      const simulatedSpeech = simulateSpeechRecognition();
      setSpeechText(simulatedSpeech);
      
      // Process the recognized text
      await processRecognizedSpeech(simulatedSpeech);
      
    } catch (error) {
      console.error('Speech processing error:', error);
      speakText("Failed to process speech. Please try again.");
      setIsProcessingSpeech(false);
    }
  };

  // Simulate speech recognition (replace with real service)
  const simulateSpeechRecognition = () => {
    const commonPhrases = [
      "my email is alanpandey06@gmail.com and my password is password123",
      "email alanpandey06@gmail.com password password123",
      "alanpandey06@gmail.com password123",
      "my email alanpandey06@gmail.com password password123",
      "email is alanpandey06@gmail.com password is password123"
    ];
    
    return commonPhrases[Math.floor(Math.random() * commonPhrases.length)];
  };


  // Process recognized speech and extract email/password
  const processRecognizedSpeech = async (text: string) => {
    try {
      const lowerText = text.toLowerCase();
      
      // Extract email using regex
      const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const extractedEmail = emailMatch ? emailMatch[1] : null;
      
      // Extract password (look for "password" followed by text)
      const passwordMatch = lowerText.match(/password\s+(?:is\s+)?([a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+)/);
      const extractedPassword = passwordMatch ? passwordMatch[1] : null;
      
      if (extractedEmail) {
        setEmail(extractedEmail);
        speakText(`Email recognized: ${extractedEmail}`);
      }
      
      if (extractedPassword) {
        setPassword(extractedPassword);
        speakText("Password recognized");
      }
      
      if (extractedEmail && extractedPassword) {
        speakText("Email and password recognized. Attempting to sign in...");
        setTimeout(() => {
          handleAuth();
        }, 2000);
      } else if (extractedEmail || extractedPassword) {
        speakText("Please speak both your email and password clearly.");
      } else {
        speakText("Could not recognize email and password. Please try again.");
      }
      
      setIsProcessingSpeech(false);
      
    } catch (error) {
      console.error('Speech processing error:', error);
      speakText("Failed to process speech. Please try again.");
      setIsProcessingSpeech(false);
    }
  };


  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !name)) {
      speakText("Please fill in all fields before submitting.");
      Vibration.vibrate([100, 50, 100]);
      return;
    }

    setIsLoading(true);
    speakText(isSignUp ? "Creating your account, please wait..." : "Signing you in, please wait...");
    
    try {
      console.log('Starting authentication...');
      const result = isSignUp 
        ? await signUp(name, email, password)
        : await signIn(email, password);
      
      console.log('Authentication result:', result);
      
      if (result.success) {
        speakText("Authentication successful! Welcome to AccessAid!");
        Vibration.vibrate([200, 100, 200]);
        console.log('Authentication successful, waiting for navigation...');
        // Small delay to ensure state is updated
        setTimeout(() => {
          console.log('Timeout reached, checking user state...');
        }, 100);
      } else {
        speakText(`Error: ${result.message}`);
        Vibration.vibrate([100, 50, 100, 50, 100]);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      speakText("An unexpected error occurred. Please try again.");
      Vibration.vibrate([100, 50, 100, 50, 100]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Professional Background */}
      <LinearGradient
        colors={['#2c3e50', '#34495e', '#3498db', '#2980b9']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Floating Background Elements */}
        <Animated.View
          style={[
            styles.floatingCircle1,
            {
              transform: [
                { rotate },
                { scale: scaleAnim },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingCircle2,
            {
              transform: [
                { rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['360deg', '0deg'],
                }) },
                { scale: scaleAnim },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingCircle3,
            {
              transform: [
                { rotate },
                { scale: scaleAnim },
              ],
            },
          ]}
        />
        
        {/* Additional floating elements for more graphics */}
        <Animated.View
          style={[
            styles.floatingStar1,
            {
              transform: [
                { rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }) },
                { scale: scaleAnim },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingStar2,
            {
              transform: [
                { rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['180deg', '0deg'],
                }) },
                { scale: scaleAnim },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingDiamond,
            {
              transform: [
                { rotate },
                { scale: scaleAnim },
              ],
            },
          ]}
        />
        
        {/* Additional floating elements for enhanced graphics */}
        <Animated.View
          style={[
            styles.floatingCircle4,
            {
              transform: [
                { rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }) },
                { scale: scaleAnim },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingCircle5,
            {
              transform: [
                { rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['360deg', '0deg'],
                }) },
                { scale: scaleAnim },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingStar3,
            {
              transform: [
                { rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }) },
                { scale: scaleAnim },
              ],
            },
          ]}
        />
        
        {/* Accessibility indicators */}
        <Animated.View
          style={[
            styles.accessibilityIndicator,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <Text style={styles.accessibilityText}>♿ Voice Commands Available</Text>
        </Animated.View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {/* Header Section */}
            <View style={styles.header}>
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    transform: [
                      { scale: scaleAnim },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#3498db', '#2980b9', '#1f4e79']}
                  style={styles.logo}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.logoText}>AccessAid</Text>
                  <View style={styles.logoAccent} />
                </LinearGradient>
              </Animated.View>
              
              <Text style={styles.title}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              
              <Text style={styles.subtitle}>
                {isSignUp ? 'Sign up to get started with AccessAid' : 'Sign in to your AccessAid account'}
              </Text>
            </View>

            {/* Voice Command Display */}
            {voiceCommand && (
              <Animated.View
                style={[
                  styles.voiceCommandContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.voiceCommandText}>
                  🎤 Voice Command: "{voiceCommand}"
                </Text>
              </Animated.View>
            )}

            {/* Speech Recognition Display */}
            {speechText && (
              <Animated.View
                style={[
                  styles.speechRecognitionContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.speechRecognitionText}>
                  🎙️ Recognized: "{speechText}"
                </Text>
              </Animated.View>
            )}

            {/* Enhanced Form Container with Glass Effect */}
            <BlurView intensity={25} style={styles.formContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.formGradient}
              >
              <View style={styles.form}>
                {/* Voice Control Buttons */}
                <Animated.View
                  style={[
                    styles.voiceControlContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  {/* Microphone Button for Speech-to-Text - Coming Soon */}
                  <TouchableOpacity
                    style={[
                      styles.microphoneButton,
                      styles.comingSoonButton,
                    ]}
                    onPress={() => {
                      speakText("Voice input feature is coming soon. Please use the text fields below or voice commands.");
                    }}
                    accessibilityLabel="Microphone button - coming soon"
                    accessibilityHint="Double tap to hear about the coming soon feature"
                  >
                    <Animated.View
                      style={[
                        styles.microphoneButtonInner,
                        {
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    >
                      <Text style={styles.microphoneButtonText}>
                        🎙️ Speak Email & Password (Coming Soon)
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                  
                  {/* Voice Commands Button */}
                  <TouchableOpacity
                    style={[
                      styles.voiceButton,
                      isListening && styles.voiceButtonActive,
                    ]}
                    onPress={isListening ? stopVoiceListening : startVoiceListening}
                    accessibilityLabel="Voice command button"
                    accessibilityHint="Double tap to start or stop voice commands"
                  >
                    <Animated.View
                      style={[
                        styles.voiceButtonInner,
                        {
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    >
                      <Text style={styles.voiceButtonText}>
                        {isListening ? '🎤 Listening...' : '🎤 Voice Commands'}
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                  
                </Animated.View>

                {isSignUp && (
                  <Animated.View
                    style={[
                      styles.inputContainer,
                      {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                      },
                    ]}
                  >
                    <View style={styles.inputWrapper}>
                      <Text style={[
                        styles.inputLabel,
                        currentField === 'name' && styles.inputLabelActive
                      ]}>
                        👤 Name {currentField === 'name' && '●'}
                      </Text>
                      <TextInput
                        ref={nameInputRef}
                        style={[
                          styles.input,
                          currentField === 'name' && styles.inputActive
                        ]}
                        value={name}
                        onChangeText={(text) => {
                          setName(text);
                          if (text.trim()) {
                            debouncedSpeak(`Name: ${text}`, nameTimeoutRef, 1500);
                          }
                        }}
                        onFocus={() => {
                          setCurrentField('name');
                          speakText("Name field focused");
                        }}
                        onBlur={() => {
                          if (nameTimeoutRef.current) {
                            clearTimeout(nameTimeoutRef.current);
                          }
                        }}
                        placeholder="Enter your full name"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        autoCapitalize="words"
                        accessibilityLabel="Name input field"
                        accessibilityHint="Enter your full name"
                      />
                    </View>
                  </Animated.View>
                )}

                <Animated.View
                  style={[
                    styles.inputContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <View style={styles.inputWrapper}>
                    <Text style={[
                      styles.inputLabel,
                      currentField === 'email' && styles.inputLabelActive
                    ]}>
                      📧 Email {currentField === 'email' && '●'}
                    </Text>
                    <TextInput
                      ref={emailInputRef}
                      style={[
                        styles.input,
                        currentField === 'email' && styles.inputActive
                      ]}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (text.trim()) {
                          debouncedSpeak(`Email: ${text}`, emailTimeoutRef, 1500);
                        }
                      }}
                      onFocus={() => {
                        setCurrentField('email');
                        speakText("Email field focused");
                      }}
                      onBlur={() => {
                        if (emailTimeoutRef.current) {
                          clearTimeout(emailTimeoutRef.current);
                        }
                      }}
                      placeholder="Enter your email address"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      accessibilityLabel="Email input field"
                      accessibilityHint="Enter your email address"
                    />
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.inputContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <View style={styles.inputWrapper}>
                    <Text style={[
                      styles.inputLabel,
                      currentField === 'password' && styles.inputLabelActive
                    ]}>
                      🔒 Password {currentField === 'password' && '●'}
                    </Text>
                    <TextInput
                      ref={passwordInputRef}
                      style={[
                        styles.input,
                        currentField === 'password' && styles.inputActive
                      ]}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (text.trim()) {
                          debouncedSpeak(`Password: ${'*'.repeat(text.length)}`, passwordTimeoutRef, 1500);
                        }
                      }}
                      onFocus={() => {
                        setCurrentField('password');
                        speakText("Password field focused");
                      }}
                      onBlur={() => {
                        if (passwordTimeoutRef.current) {
                          clearTimeout(passwordTimeoutRef.current);
                        }
                      }}
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      secureTextEntry
                      accessibilityLabel="Password input field"
                      accessibilityHint="Enter your password"
                    />
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.buttonContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.authButton, isLoading && styles.authButtonDisabled]}
                    onPress={handleAuth}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#999', '#666'] : ['#667eea', '#764ba2']}
                      style={styles.authButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.authButtonText}>
                        {isLoading ? '⏳ Please wait...' : (isSignUp ? '✨ Sign Up' : '🚀 Sign In')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.toggleContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={toggleMode}
                  >
                    <Text style={styles.toggleText}>
                      {isSignUp 
                        ? 'Already have an account? Sign In' 
                        : "Don't have an account? Sign Up"
                      }
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
              </LinearGradient>
            </BlurView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    top: -50,
    right: -50,
  },
  floatingCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    bottom: 100,
    left: -30,
  },
  floatingCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    top: height * 0.3,
    right: 20,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 200,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 2,
    letterSpacing: 1,
  },
  logoAccent: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  formGradient: {
    flex: 1,
  },
  form: {
    padding: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContainer: {
    marginTop: 10,
  },
  authButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  toggleContainer: {
    marginTop: 20,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  voiceCommandContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  voiceCommandText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  speechRecognitionContainer: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
  },
  speechRecognitionText: {
    color: '#00FF00',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  voiceControlContainer: {
    flexDirection: 'column',
    marginBottom: 20,
    gap: 10,
  },
  microphoneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
  },
  microphoneButtonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderColor: '#FF0000',
  },
  microphoneButtonProcessing: {
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderColor: '#FFA500',
  },
  comingSoonButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    borderColor: 'rgba(128, 128, 128, 0.4)',
    opacity: 0.7,
  },
  microphoneButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  microphoneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  voiceButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  voiceButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  inputLabelActive: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  inputActive: {
    borderColor: '#FFD700',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  floatingStar1: {
    position: 'absolute',
    width: 60,
    height: 60,
    top: height * 0.2,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    transform: [{ rotate: '45deg' }],
  },
  floatingStar2: {
    position: 'absolute',
    width: 40,
    height: 40,
    bottom: height * 0.2,
    right: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    transform: [{ rotate: '45deg' }],
  },
  floatingDiamond: {
    position: 'absolute',
    width: 80,
    height: 80,
    top: height * 0.6,
    left: width * 0.1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 40,
    transform: [{ rotate: '45deg' }],
  },
  floatingCircle4: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    top: height * 0.2,
    left: width * 0.7,
  },
  floatingCircle5: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    top: height * 0.8,
    right: width * 0.2,
  },
  floatingStar3: {
    position: 'absolute',
    width: 60,
    height: 60,
    top: height * 0.3,
    right: width * 0.1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 30,
    transform: [{ rotate: '45deg' }],
  },
  accessibilityIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  accessibilityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
