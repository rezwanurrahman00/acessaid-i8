import React, { useState, useEffect } from 'react';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LoginScreen = () => {
  const { dispatch, state } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

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
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
    >
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
            <Text style={styles.welcomeText}>
              Welcome to AccessAid
            </Text>
            <Text style={styles.subtitleText}>
              Your intelligent accessibility companion
            </Text>
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
                  name={isVoiceEnabled ? "mic" : "mic-off"} 
                  size={20} 
                  color={isVoiceEnabled ? "#FF6B6B" : "#4A90E2"} 
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
                  placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
              icon={<Ionicons name={isLogin ? "log-in" : "person-add"} size={20} color="white" />}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  formContainer: {
    padding: 30,
    marginBottom: 20,
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
    color: '#333',
    flex: 1,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  voiceButtonActive: {
    backgroundColor: '#FFE0E0',
    borderColor: '#FF6B6B',
  },
  voiceButtonText: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  voiceButtonTextActive: {
    color: '#FF6B6B',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    minHeight: 56,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  voiceHelpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  voiceHelpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LoginScreen;