import React, { useState, useEffect, useMemo } from 'react';
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { AccessAidLogo } from '../components/AccessAidLogo';
import { ModernButton } from '../components/ModernButton';
import { ModernCard } from '../components/ModernCard';
import { voiceManager } from '../utils/voiceCommandManager';
import { BackgroundLogo } from '../components/BackgroundLogo';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme, getThemeConfig } from '../../constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LoginScreen = () => {
  const { dispatch, state } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  const theme = useMemo(() => getThemeConfig(state.accessibilitySettings.isDarkMode), [state.accessibilitySettings.isDarkMode]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const gradientColors = theme.gradient;
  const placeholderColor = theme.placeholder;

  useEffect(() => {
    // Simple voice announcement without complex command setup
    speakText('Welcome to AccessAid. You can sign in or create a new account.');
  }, []);

  const speakText = (text: string) => {
    try { Speech.stop(); } catch {}
    try {
      const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
      Speech.speak(text, {
        rate: safeRate,
        pitch: 1.0,
      });
    } catch {}
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePin = (pin: string) => {
    return /^\d{4}$/.test(pin);
  };

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      speakText('Please enter a valid email address');
      return;
    }

    if (!validatePin(pin)) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN.');
      speakText('Please enter a 4-digit PIN');
      return;
    }

    setIsLoading(true);
    
    try {
      const usersRaw = await AsyncStorage.getItem('users');
      const users: Array<User & { pin: string }> = usersRaw ? JSON.parse(usersRaw) : [];
      const found = users.find(u => u.email === email.toLowerCase().trim());
      if (!found) {
        Alert.alert('No account', 'This email is not registered. Please sign up.');
        speakText('This email is not registered. Please sign up.');
        setIsLoading(false);
        return;
      }
      if (found.pin !== pin) {
        Alert.alert('Invalid PIN', 'The PIN you entered is incorrect.');
        speakText('The PIN you entered is incorrect');
        setIsLoading(false);
        return;
      }
      dispatch({ type: 'LOGIN', payload: found as User });
      speakText('Login successful! Welcome to AccessAid.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Login Failed', 'Please check your credentials and try again.');
      speakText('Login failed. Please check your credentials and try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      speakText('Please enter a valid email address');
      return;
    }

    if (!validatePin(pin)) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN.');
      speakText('Please enter a 4-digit PIN');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      speakText('Please enter your name');
      return;
    }

    setIsLoading(true);
    
    try {
      const usersRaw = await AsyncStorage.getItem('users');
      const users: Array<User & { pin: string }> = usersRaw ? JSON.parse(usersRaw) : [];
      const exists = users.some(u => u.email === email.toLowerCase().trim());
      if (exists) {
        Alert.alert('Email In Use', 'This email is already registered. Please sign in.');
        speakText('This email is already registered. Please sign in.');
        setIsLoading(false);
        return;
      }
      const newUser: User = {
        id: Date.now().toString(),
        email: email.toLowerCase().trim(),
        pin,
        name: name.trim(),
      };
      const nextUsers = [newUser, ...users];
      await AsyncStorage.setItem('users', JSON.stringify(nextUsers));
      dispatch({ type: 'LOGIN', payload: newUser });
      speakText('Account created successfully! Welcome to AccessAid.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Sign Up Failed', 'Could not create account. Please try again.');
      speakText('Could not create account. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPin('');
    setName('');
    speakText(isLogin ? 'Switched to create account mode' : 'Switched to sign in mode');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleVoice = () => {
    if (isVoiceEnabled) {
      setIsVoiceEnabled(false);
      voiceManager.stopListening();
      speakText('Voice commands disabled');
    } else {
      setIsVoiceEnabled(true);
      voiceManager.startListening();
      speakText('Voice commands enabled. You can now speak your commands.');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <BackgroundLogo />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <AccessAidLogo size={100} showText={true} />
            <Text style={styles.welcomeText}>Welcome to AccessAid</Text>
            <Text style={styles.subtitleText}>Your intelligent accessibility companion</Text>
          </View>

          <ModernCard variant="elevated" style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
              <TouchableOpacity
                style={[styles.voiceButton, isVoiceEnabled && styles.voiceButtonActive]}
                onPress={toggleVoice}
                accessibilityLabel={isVoiceEnabled ? 'Disable voice commands' : 'Enable voice commands'}
              >
                <Ionicons 
                  name={isVoiceEnabled ? 'mic' : 'mic-off'}
                  size={20}
                  color={isVoiceEnabled ? theme.danger : theme.accent}
                />
                <Text style={[styles.voiceButtonText, isVoiceEnabled && styles.voiceButtonTextActive]}>
                  {isVoiceEnabled ? 'Voice ON' : 'Voice OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="words"
                  accessibilityLabel="Full name input"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={placeholderColor}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Email address input"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>4-Digit PIN</Text>
              <TextInput
                style={styles.textInput}
                value={pin}
                onChangeText={setPin}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor={placeholderColor}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                accessibilityLabel="PIN input"
              />
            </View>

            <ModernButton
              title={isLogin ? 'Sign In' : 'Create Account'}
              onPress={isLogin ? handleLogin : handleSignUp}
              variant="primary"
              size="large"
              disabled={isLoading}
              loading={isLoading}
              icon={<Ionicons name={isLogin ? 'log-in' : 'person-add'} size={20} color="white" />}
              style={styles.primaryButton}
            />

            <ModernButton
              title={isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              onPress={toggleMode}
              variant="outline"
              style={styles.secondaryButton}
            />
          </ModernCard>

          <View style={styles.voiceHelpContainer}>
            <Text style={styles.voiceHelpTitle}>Voice Commands</Text>
            <Text style={styles.voiceHelpText}>
              Try saying: "Sign in", "Sign up", "Help", or "Enable voice commands"
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 40,
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
    },
    welcomeText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.textInverted,
      marginTop: 20,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.35)',
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 6,
    },
    subtitleText: {
      fontSize: 18,
      color: theme.textInverted,
      opacity: 0.9,
      marginTop: 8,
      textAlign: 'center',
    },
    formContainer: {
      padding: 30,
      marginBottom: 20,
      backgroundColor: theme.cardBackground,
      borderRadius: 24,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.cardBorder,
      shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: theme.isDark ? 8 : 4 },
      shadowOpacity: theme.isDark ? 0.35 : 0.12,
      shadowRadius: theme.isDark ? 20 : 12,
      elevation: theme.isDark ? 10 : 4,
    },
    formHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
    },
    formTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.textPrimary,
      flex: 1,
    },
    voiceButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.accentSoft,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.accent,
    },
    voiceButtonActive: {
      backgroundColor: theme.danger,
      borderColor: theme.danger,
    },
    voiceButtonText: {
      color: theme.accent,
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 6,
    },
    voiceButtonTextActive: {
      color: theme.textInverted,
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 2,
      borderColor: theme.inputBorder,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 16,
      fontSize: 16,
      backgroundColor: theme.inputBackground,
      minHeight: 56,
      color: theme.textPrimary,
    },
    primaryButton: {
      marginTop: 10,
      marginBottom: 20,
    },
    secondaryButton: {
      marginTop: 0,
    },
    voiceHelpContainer: {
      alignItems: 'center',
      backgroundColor: theme.isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.2)',
      borderRadius: 16,
      padding: 20,
      marginTop: 20,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.cardBorder,
    },
    voiceHelpTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.textInverted,
      marginBottom: 8,
    },
    voiceHelpText: {
      fontSize: 14,
      color: theme.textInverted,
      opacity: 0.85,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

export default LoginScreen;