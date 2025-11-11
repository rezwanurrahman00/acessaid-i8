import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Animated,
  Switch,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import * as Brightness from 'expo-brightness';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { AccessAidLogo } from '../components/AccessAidLogo';
import { TouchSlider } from '../components/TouchSlider';
import { ModernButton } from '../components/ModernButton';
import { ModernCard } from '../components/ModernCard';
import { voiceManager } from '../utils/voiceCommandManager';
import { BackgroundLogo } from '../components/BackgroundLogo';
import { AppTheme, getThemeConfig } from '../../constants/theme';
let ImagePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ImagePicker = require('expo-image-picker');
} catch {}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isPhone = screenWidth < 768;

const ProfileScreen = () => {
  const { state, dispatch } = useApp();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(state.accessibilitySettings.isDarkMode);
  const [profileData, setProfileData] = useState({
    name: state.user?.name || '',
    email: state.user?.email || '',
    bio: state.user?.bio || '',
    weight: state.user?.weight || '',
    height: state.user?.height || '',
    bloodGroup: state.user?.bloodGroup || '',
    allergies: state.user?.allergies || '',
    interests: state.user?.interests || '',
    profilePhoto: state.user?.profilePhoto || '',
  });
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Set up voice commands for profile screen
    voiceManager.addCommand({
      keywords: ['edit profile', 'edit information', 'update profile'],
      action: () => {
        setIsEditingProfile(!isEditingProfile);
        speakText(isEditingProfile ? 'Profile editing disabled' : 'Profile editing enabled');
      },
      description: 'Toggle profile editing mode',
      category: 'general'
    });

    voiceManager.addCommand({
      keywords: ['save profile', 'save changes', 'update information'],
      action: () => handleSaveProfile(),
      description: 'Save profile changes',
      category: 'general'
    });

    voiceManager.addCommand({
      keywords: ['logout', 'sign out', 'log out'],
      action: () => handleLogout(),
      description: 'Log out of your account',
      category: 'general'
    });

    voiceManager.addCommand({
      keywords: ['go to home', 'home', 'main screen'],
      action: () => {
        speakText('Navigating to home screen');
      },
      description: 'Go to home screen',
      category: 'navigation'
    });


    voiceManager.addCommand({
      keywords: ['help', 'commands', 'what can I say'],
      action: () => {
        speakText('You can say: Edit profile, Save profile, Logout, Go to home, or Help');
      },
      description: 'Show available voice commands',
      category: 'general'
    });

    // Announce screen change
    voiceManager.announceScreenChange('profile');
    speakText(`Profile screen. You can edit your information or adjust accessibility settings.`);

    return () => {
      // Clean up voice commands when component unmounts
      voiceManager.removeCommand(['edit profile', 'edit information', 'update profile']);
      voiceManager.removeCommand(['save profile', 'save changes', 'update information']);
      voiceManager.removeCommand(['logout', 'sign out', 'log out']);
      voiceManager.removeCommand(['go to home', 'home', 'main screen']);
      voiceManager.removeCommand(['help', 'commands', 'what can I say']);
    };
  }, [isEditingProfile]);

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

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'LOGOUT' });
            speakText('You have been logged out successfully');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleProfilePicture = async () => {
    if (!ImagePicker) {
      Alert.alert('Unavailable', 'Image picking is unavailable in this environment.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to set a profile picture.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled) return;
    const uri = res.assets?.[0]?.uri;
    if (uri) {
      setProfileData({ ...profileData, profilePhoto: uri });
      // Immediately persist to user profile
      dispatch({ type: 'UPDATE_USER', payload: { profilePhoto: uri } });
      speakText('Profile picture updated');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleSaveProfile = () => {
    if (!profileData.name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      speakText('Please enter your name');
      return;
    }

    const updatedUser = {
      ...state.user!,
      ...profileData,
    };

    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    setIsEditingProfile(false);
    speakText('Profile updated successfully');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAccessibilityChange = (setting: string, value: number | boolean) => {
    dispatch({
      type: 'UPDATE_ACCESSIBILITY_SETTINGS',
      payload: { [setting]: value },
    });

    if (setting === 'brightness') {
      Brightness.setBrightnessAsync((value as number) / 100);
    }

    speakText(`${setting} updated to ${value}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleDarkModeToggle = (value: boolean) => {
    setIsDarkMode(value);
    handleAccessibilityChange('isDarkMode', value);
  };

  const theme = useMemo(() => getThemeConfig(isDarkMode), [isDarkMode]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const gradientColors = theme.gradient;
  const placeholderColor = theme.placeholder;

  const ProfileSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <ModernCard variant="elevated" style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </ModernCard>
  );

  const ProfileField = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    multiline = false,
    keyboardType = 'default',
    accessibilityLabel 
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    multiline?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric';
    accessibilityLabel: string;
  }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.textInput, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={accessibilityLabel}
        editable={isEditingProfile}
      />
    </View>
  );

  return (
    <LinearGradient
      colors={gradientColors}
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
              {state.user?.name || 'User'}
            </Text>
            <Text style={styles.subtitleText}>
              Manage your profile and preferences
            </Text>
          </Animated.View>

          <ProfileSection title="Profile Information">
            <View style={styles.profileActions}>
              <ModernButton
                title={isEditingProfile ? 'Cancel' : 'Edit Profile'}
                onPress={() => {
                  setIsEditingProfile(!isEditingProfile);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                variant={isEditingProfile ? 'danger' : 'outline'}
                size="small"
                icon={<Ionicons name={isEditingProfile ? "close" : "create-outline"} size={16} color={isEditingProfile ? "#FF6B6B" : "#4A90E2"} />}
                style={styles.editButton}
              />

              {isEditingProfile && (
                <ModernButton
                  title="Save Changes"
                  onPress={handleSaveProfile}
                  variant="primary"
                  size="small"
                  icon={<Ionicons name="checkmark" size={16} color="white" />}
                  style={styles.saveButton}
                />
              )}
            </View>

            {/* Profile Picture Section */}
            <View style={styles.profilePictureContainer}>
              <Text style={styles.fieldLabel}>Profile Picture</Text>
              <TouchableOpacity
                style={styles.profilePictureWrapper}
                onPress={handleProfilePicture}
                accessibilityLabel="Profile picture"
                accessibilityHint="Tap to change your profile picture"
              >
                {profileData.profilePhoto ? (
                  <Image
                    source={{ uri: profileData.profilePhoto }}
                    style={styles.profilePicture}
                    accessibilityLabel="Current profile picture"
                  />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <Ionicons name="person" size={40} color="#4A90E2" />
                    <Text style={styles.profilePictureText}>Add Photo</Text>
                  </View>
                )}
                <View style={styles.profilePictureOverlay}>
                  <Ionicons name="camera" size={20} color="white" />
                </View>
              </TouchableOpacity>
            </View>

            <ProfileField
              label="Full Name"
              value={profileData.name}
              onChangeText={(text) => setProfileData({ ...profileData, name: text })}
              placeholder="Enter your full name"
              accessibilityLabel="Full name input"
            />

            <ProfileField
              label="Email"
              value={profileData.email}
              onChangeText={(text) => setProfileData({ ...profileData, email: text })}
              placeholder="Enter your email"
              keyboardType="email-address"
              accessibilityLabel="Email input"
            />

            <ProfileField
              label="Bio"
              value={profileData.bio}
              onChangeText={(text) => setProfileData({ ...profileData, bio: text })}
              placeholder="Tell us about yourself"
              multiline
              accessibilityLabel="Bio input"
            />

            <View style={styles.rowContainer}>
              <View style={styles.halfField}>
                <ProfileField
                  label="Weight"
                  value={profileData.weight}
                  onChangeText={(text) => setProfileData({ ...profileData, weight: text })}
                  placeholder="e.g., 70 kg"
                  accessibilityLabel="Weight input"
                />
              </View>
              <View style={styles.halfField}>
                <ProfileField
                  label="Height"
                  value={profileData.height}
                  onChangeText={(text) => setProfileData({ ...profileData, height: text })}
                  placeholder="e.g., 170 cm"
                  accessibilityLabel="Height input"
                />
              </View>
            </View>

            <ProfileField
              label="Blood Group"
              value={profileData.bloodGroup}
              onChangeText={(text) => setProfileData({ ...profileData, bloodGroup: text })}
              placeholder="e.g., O+"
              accessibilityLabel="Blood group input"
            />

            <ProfileField
              label="Allergies"
              value={profileData.allergies}
              onChangeText={(text) => setProfileData({ ...profileData, allergies: text })}
              placeholder="List any allergies"
              multiline
              accessibilityLabel="Allergies input"
            />

            <ProfileField
              label="Interests"
              value={profileData.interests}
              onChangeText={(text) => setProfileData({ ...profileData, interests: text })}
              placeholder="Your interests and hobbies"
              multiline
              accessibilityLabel="Interests input"
            />
          </ProfileSection>

          <ProfileSection title="Accessibility Settings">
            {/* Brightness Setting */}
            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <Ionicons name="sunny" size={24} color="#FFA726" />
                <Text style={styles.settingTitle}>Display Brightness</Text>
                <Text style={styles.settingValue}>
                  {state.accessibilitySettings.brightness}% • {getBrightnessLabel(state.accessibilitySettings.brightness)}
                </Text>
              </View>
              
              <TouchSlider
                value={state.accessibilitySettings.brightness}
                min={0}
                max={100}
                onValueChange={(value) => handleAccessibilityChange('brightness', value)}
                levelLabels={['Low', 'Medium', 'High', 'Max']}
                unit="%"
                accessibilityLabel="Brightness slider"
              />
              
              <Text style={styles.settingDescription}>
                Adjust screen brightness for comfortable viewing
              </Text>
            </View>

            {/* Text Size Setting */}
            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <Ionicons name="text" size={24} color="#42A5F5" />
                <Text style={styles.settingTitle}>Text Size</Text>
                <Text style={styles.settingValue}>
                  {state.accessibilitySettings.textZoom}% • {getTextZoomLabel(state.accessibilitySettings.textZoom)}
                </Text>
              </View>
              
              <TouchSlider
                value={state.accessibilitySettings.textZoom}
                min={80}
                max={180}
                onValueChange={(value) => handleAccessibilityChange('textZoom', value)}
                levelLabels={['Small', 'Normal', 'Large', 'XL']}
                unit="%"
                accessibilityLabel="Text size slider"
              />
              
              <Text style={styles.settingDescription}>
                Make text larger or smaller for better readability
              </Text>
            </View>

            {/* Voice Speed Setting */}
            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <Ionicons name="volume-high" size={24} color="#66BB6A" />
                <Text style={styles.settingTitle}>Voice Speed</Text>
                <Text style={styles.settingValue}>
                  {state.accessibilitySettings.voiceSpeed.toFixed(1)}x • {getVoiceSpeedLabel(state.accessibilitySettings.voiceSpeed)}
                </Text>
              </View>
              
              <TouchSlider
                value={state.accessibilitySettings.voiceSpeed}
                min={0.5}
                max={2.0}
                step={0.1}
                onValueChange={(value) => handleAccessibilityChange('voiceSpeed', value)}
                levelLabels={['Slow', 'Normal', 'Fast']}
                unit="x"
                accessibilityLabel="Voice speed slider"
              />
              
              <Text style={styles.settingDescription}>
                Control how fast text is spoken aloud
              </Text>
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Dark Mode</Text>
              <Switch
                value={isDarkMode}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={isDarkMode ? theme.accent : '#FFFFFF'}
                ios_backgroundColor={theme.border}
                accessibilityLabel="Dark mode toggle"
              />
            </View>
          </ProfileSection>

          <ProfileSection title="App Information">
            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Account Created</Text>
                <Text style={styles.infoValue}>
                  {new Date().toLocaleDateString()}
                </Text>
              </View>
            </View>
          </ProfileSection>

          <ModernButton
            title="Logout"
            onPress={handleLogout}
            variant="danger"
            size="large"
            icon={<Ionicons name="log-out-outline" size={20} color="white" />}
            style={styles.logoutButton}
          />
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
};

export default ProfileScreen;

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
      color: theme.textPrimary,
      marginTop: isSmallScreen ? 10 : 15,
      textAlign: 'center',
      textShadowColor: theme.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      paddingHorizontal: isSmallScreen ? 10 : 0,
    },
    subtitleText: {
      fontSize: isSmallScreen ? 14 : 16,
      color: theme.textSecondary,
      marginTop: isSmallScreen ? 6 : 8,
      textAlign: 'center',
    },
    section: {
      padding: 20,
      marginBottom: 20,
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.border,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: theme.isDark ? 6 : 3 },
      shadowOpacity: theme.isDark ? 0.35 : 0.1,
      shadowRadius: theme.isDark ? 16 : 8,
      elevation: theme.isDark ? 8 : 4,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.textPrimary,
      marginBottom: 20,
    },
    profileActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      gap: 12,
    },
    editButton: {
      flex: 1,
    },
    saveButton: {
      flex: 1,
    },
    fieldContainer: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 2,
      borderColor: theme.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      backgroundColor: theme.inputBackground,
      color: theme.textPrimary,
    },
    multilineInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    profilePictureContainer: {
      marginBottom: 20,
      alignItems: 'center',
    },
    profilePictureWrapper: {
      position: 'relative',
      width: 120,
      height: 120,
      borderRadius: 60,
      overflow: 'hidden',
      backgroundColor: theme.inputBackground,
      borderWidth: 3,
      borderColor: theme.accent,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.isDark ? 0.45 : 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    profilePicture: {
      width: '100%',
      height: '100%',
    },
    profilePicturePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.inputBackground,
    },
    profilePictureText: {
      fontSize: 12,
      color: theme.accent,
      fontWeight: '600',
      marginTop: 4,
    },
    profilePictureOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.45 : 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    rowContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    halfField: {
      flex: 1,
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      paddingVertical: 8,
    },
    switchLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    infoContainer: {
      gap: 12,
    },
    infoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    infoLabel: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    logoutButton: {
      marginTop: 20,
    },
    settingCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: theme.isDark ? 4 : 1 },
      shadowOpacity: theme.isDark ? 0.4 : 0.08,
      shadowRadius: theme.isDark ? 12 : 4,
      elevation: theme.isDark ? 6 : 2,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.border,
    },
    settingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    settingTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.textPrimary,
      marginLeft: 12,
      flex: 1,
    },
    settingValue: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.accent,
      backgroundColor: theme.tagBackground,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    settingDescription: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 16,
      lineHeight: 18,
      textAlign: 'center',
    },
    voiceCommandsContainer: {
      padding: 20,
      marginBottom: 20,
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.border,
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
    featuresContainer: {
      marginBottom: 20,
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
    quickStatsContainer: {
      padding: 20,
      marginBottom: 20,
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      borderWidth: theme.isDark ? 1 : 0.5,
      borderColor: theme.border,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: theme.isDark ? 4 : 2 },
      shadowOpacity: theme.isDark ? 0.35 : 0.08,
      shadowRadius: theme.isDark ? 12 : 6,
      elevation: theme.isDark ? 6 : 2,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
    },
    settingCardsContainer: {
      gap: 12,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#4A90E2',
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    infoLabelSmall: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    sectionDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
  });