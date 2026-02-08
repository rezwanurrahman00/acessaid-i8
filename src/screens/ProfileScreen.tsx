import { Ionicons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppTheme, getThemeConfig } from '../../constants/theme';
import { BackgroundLogo } from '../components/BackgroundLogo';
import { ModernButton } from '../components/ModernButton';
import { ModernCard } from '../components/ModernCard';
import { TouchSlider } from '../components/TouchSlider';
import { useApp } from '../contexts/AppContext';
import { voiceManager } from '../utils/voiceCommandManager';

// Constants
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {}

const { width: screenWidth } = Dimensions.get('window');
const ANIMATION_DURATION = 600;

// Utility Functions
const getBrightnessLabel = (value: number): string => {
  if (value <= 25) return 'Low';
  if (value <= 50) return 'Medium';
  if (value <= 75) return 'High';
  return 'Maximum';
};

const getTextZoomLabel = (value: number): string => {
  if (value <= 90) return 'Small';
  if (value <= 110) return 'Normal';
  if (value <= 140) return 'Large';
  return 'Extra Large';
};

const getVoiceSpeedLabel = (value: number): string => {
  if (value <= 0.7) return 'Slow';
  if (value <= 1.3) return 'Normal';
  return 'Fast';
};

// Components
interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
  icon?: string;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ title, children, icon }) => {
  const { state } = useApp();
  const isDarkMode = state.accessibilitySettings.isDarkMode;
  const theme = getThemeConfig(isDarkMode);
  
  return (
    <ModernCard variant="elevated" style={createSectionStyle(theme)}>
      <View style={styles.sectionHeaderContainer}>
        {icon && (
          <View style={styles.sectionIconContainer}>
            <Ionicons name={icon as any} size={22} color={theme.accent} />
          </View>
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </ModernCard>
  );
};

interface ProfileFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  accessibilityLabel: string;
  editable?: boolean;
}

const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  accessibilityLabel,
  editable = false,
}) => {
  const { state } = useApp();
  const isDarkMode = state.accessibilitySettings.isDarkMode;
  const theme = getThemeConfig(isDarkMode);
  
  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.multilineInput,
          {
            borderColor: theme.inputBorder,
            backgroundColor: theme.inputBackground,
            color: theme.textPrimary,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholder}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={accessibilityLabel}
        editable={editable}
      />
    </View>
  );
};

interface JoinDateModalProps {
  visible: boolean;
  onClose: () => void;
  theme: AppTheme;
  joinDate: Date | null;
  formattedJoinDate: string;
}

const JoinDateModal: React.FC<JoinDateModalProps> = ({ visible, onClose, theme, joinDate, formattedJoinDate }) => (
  <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <TouchableOpacity style={styles.modalBackdropTouchable} onPress={onClose} accessible={false}>
        <View />
      </TouchableOpacity>
      <View style={[styles.joinDateModal, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
        <View style={styles.modalHeaderRow}>
          <View style={[styles.calendarBadge, { backgroundColor: theme.accent }]}>
            <Ionicons name="calendar" size={20} color="white" />
          </View>
          <View style={styles.modalHeaderTextWrapper}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Membership details</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Tap anywhere outside to close</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel="Close membership details"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.calendarCard, { backgroundColor: theme.inputBackground, borderColor: theme.cardBorder }]}>
          <Text style={[styles.calendarMonth, { color: theme.accent }]}>
            {joinDate ? joinDate.toLocaleString(undefined, { month: 'short' }) : '--'}
          </Text>
          <Text style={[styles.calendarDay, { color: theme.textPrimary }]}>
            {joinDate ? joinDate.getDate() : '--'}
          </Text>
          <Text style={[styles.calendarYear, { color: theme.textSecondary }]}>
            {joinDate ? joinDate.getFullYear() : 'N/A'}
          </Text>
        </View>

        <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
          {joinDate ? `You joined AccessAid on ${formattedJoinDate}.` : 'We could not find your join date yet.'}
        </Text>
      </View>
    </View>
  </Modal>
);


// Main Component
const ProfileScreen = () => {
  const { state, dispatch } = useApp();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(state.accessibilitySettings.isDarkMode);
  const [isJoinDateModalVisible, setIsJoinDateModalVisible] = useState(false);
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

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const profileScaleAnim = useRef(new Animated.Value(0)).current;

  const theme = useMemo(() => getThemeConfig(isDarkMode), [isDarkMode]);
  const joinDate = useMemo(() => (state.user?.joinDate ? new Date(state.user.joinDate) : null), [state.user?.joinDate]);
  const formattedJoinDate = useMemo(
    () => joinDate?.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) || 'Join date not available',
    [joinDate]
  );

  // Initialize animations and voice commands
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(profileScaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 6,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setupVoiceCommands();
    voiceManager.announceScreenChange('profile');
    speakText('Profile screen. You can edit your information or adjust accessibility settings.');

    return cleanupVoiceCommands;
  }, [isEditingProfile]);

  const setupVoiceCommands = () => {
    voiceManager.addCommand({
      keywords: ['edit profile', 'edit information', 'update profile'],
      action: () => {
        setIsEditingProfile(!isEditingProfile);
        speakText(isEditingProfile ? 'Profile editing disabled' : 'Profile editing enabled');
      },
      description: 'Toggle profile editing mode',
      category: 'general',
    });

    voiceManager.addCommand({
      keywords: ['save profile', 'save changes', 'update information'],
      action: handleSaveProfile,
      description: 'Save profile changes',
      category: 'general',
    });

    voiceManager.addCommand({
      keywords: ['logout', 'sign out', 'log out'],
      action: handleLogout,
      description: 'Log out of your account',
      category: 'general',
    });
  };

  const cleanupVoiceCommands = () => {
    voiceManager.removeCommand(['edit profile', 'edit information', 'update profile']);
    voiceManager.removeCommand(['save profile', 'save changes', 'update information']);
    voiceManager.removeCommand(['logout', 'sign out', 'log out']);
  };

  const speakText = (text: string) => {
    if (!state.voiceAnnouncementsEnabled) return;
    try {
      Speech.stop();
    } catch {}
    try {
      const safeRate = Math.max(0.5, Math.min(state.accessibilitySettings.voiceSpeed, 2.0));
      Speech.speak(text, { rate: safeRate, pitch: 1.0 });
    } catch {}
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
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
    ]);
  };

  const handleProfilePicture = async () => {
    if (!ImagePicker) {
      Alert.alert('Unavailable', 'Image picking is unavailable in this environment.');
      return;
    }
    
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to set a profile picture.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setProfileData({ ...profileData, profilePhoto: uri });
        dispatch({ type: 'UPDATE_USER', payload: { profilePhoto: uri } });
        speakText('Profile picture updated');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture');
    }
  };

  const handleSaveProfile = () => {
    if (!profileData.name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      speakText('Please enter your name');
      return;
    }

    dispatch({
      type: 'UPDATE_USER',
      payload: { ...state.user!, ...profileData },
    });
    
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

  const handleDarkModeToggle = (value: boolean) => {
    setIsDarkMode(value);
    handleAccessibilityChange('isDarkMode', value);
  };

  const updateProfileField = (field: keyof typeof profileData, value: string) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const renderHeroHeader = () => (
    <Animated.View
      style={[
        styles.heroHeader,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={
          (isDarkMode
            ? ['rgba(74, 144, 226, 0.3)', 'rgba(106, 90, 205, 0.3)', 'rgba(74, 144, 226, 0.2)']
            : ['rgba(74, 144, 226, 0.15)', 'rgba(106, 90, 205, 0.15)', 'rgba(74, 144, 226, 0.1)']) as any
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <Animated.View
          style={[styles.profileHeaderContent, { transform: [{ scale: profileScaleAnim }] }]}
        >
          <View style={styles.profilePictureHeroContainer}>
            <View style={styles.profileRing}>
              <View style={[styles.profileRingInner, { borderColor: theme.accent }]} />
            </View>
            <TouchableOpacity
              style={styles.profilePictureHeroWrapper}
              onPress={handleProfilePicture}
              accessibilityLabel="Profile picture"
            >
              {profileData.profilePhoto ? (
                <Image source={{ uri: profileData.profilePhoto }} style={styles.profilePictureHero} />
              ) : (
                <LinearGradient colors={[theme.accent, '#357ABD']} style={styles.profilePictureHeroPlaceholder}>
                  <Ionicons name="person" size={50} color="white" />
                </LinearGradient>
              )}
              <View style={[styles.profileEditBadge, { backgroundColor: theme.accent }]}>
                <Ionicons name="camera" size={16} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.userInfoHero}>
            <Text style={[styles.userNameHero, { color: theme.textPrimary }]}>{state.user?.name || 'User'}</Text>
            <View style={styles.userMetaRow}>
              <Ionicons name="mail-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.userEmailHero, { color: theme.textSecondary }]}>
                {state.user?.email || 'user@example.com'}
              </Text>
            </View>
            <View style={styles.userStatsRow}>
              <View style={[styles.statBadge, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
                <Ionicons name="shield-checkmark" size={14} color={theme.accent} />
                <Text style={[styles.statText, { color: theme.textPrimary }]}>Verified</Text>
              </View>
              <TouchableOpacity
                style={[styles.statBadge, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}
                onPress={() => setIsJoinDateModalVisible(true)}
                accessibilityLabel="Membership status"
                accessibilityHint="Shows the date you joined"
              >
                <Ionicons name="calendar-outline" size={14} color={theme.accent} />
                <Text style={[styles.statText, { color: theme.textPrimary }]}>Member</Text>
            </TouchableOpacity>

          </View>
         </View>

    
        </Animated.View>

        <View style={styles.heroActions}>
          <TouchableOpacity
            style={[styles.heroActionButton, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}
            onPress={() => setIsEditingProfile(!isEditingProfile)}
          >
            <Ionicons name={isEditingProfile ? 'close-circle' : 'create-outline'} size={20} color={theme.accent} />
            <Text style={[styles.heroActionText, { color: theme.textPrimary }]}>
              {isEditingProfile ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
          {isEditingProfile && (
            <TouchableOpacity style={[styles.heroActionButton, styles.heroActionButtonPrimary]} onPress={handleSaveProfile}>
              <LinearGradient colors={[theme.accent, '#357ABD']} style={styles.heroActionButtonGradient}>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.heroActionTextPrimary}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderStatsCards = () => {
    const stats = [
      { icon: 'settings-outline', value: `${state.accessibilitySettings.brightness}%`, label: 'Brightness', color: theme.accent },
      { icon: 'text-outline', value: `${state.accessibilitySettings.textZoom}%`, label: 'Text Size', color: '#6A5ACD' },
      { icon: 'volume-high-outline', value: `${state.accessibilitySettings.voiceSpeed.toFixed(1)}x`, label: 'Voice Speed', color: '#42BB66' },
    ];

    const getGradientColors = (isDark: boolean) => {
      return [
        [isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(74, 144, 226, 0.1)', isDark ? 'rgba(74, 144, 226, 0.1)' : 'rgba(74, 144, 226, 0.05)'],
        [isDark ? 'rgba(106, 90, 205, 0.2)' : 'rgba(106, 90, 205, 0.1)', isDark ? 'rgba(106, 90, 205, 0.1)' : 'rgba(106, 90, 205, 0.05)'],
        [isDark ? 'rgba(66, 187, 102, 0.2)' : 'rgba(66, 187, 102, 0.1)', isDark ? 'rgba(66, 187, 102, 0.1)' : 'rgba(66, 187, 102, 0.05)'],
      ];
    };

    const gradientColors = getGradientColors(isDarkMode);

    return (
      <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {stats.map((stat, index) => (
          <ModernCard key={stat.label} variant="elevated" style={styles.statCard}>
            <LinearGradient colors={gradientColors[index] as any} style={styles.statCardGradient}>
              <Ionicons name={stat.icon as any} size={28} color={stat.color} />
              <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
            </LinearGradient>
          </ModernCard>
        ))}
      </Animated.View>
    );
  };

  const renderSettingCard = (
    icon: string,
    iconColor: string,
    title: string,
    value: string,
    children: React.ReactNode,
    gradientColors: string[]
  ) => (
    <ModernCard 
      variant="elevated" 
      style={{
        ...styles.settingCardEnhanced,
        borderColor: theme.cardBorder,
      } as any}
    >
      <LinearGradient colors={gradientColors as any} style={styles.settingCardGradient}>
        <View style={styles.settingHeader}>
          <View style={[styles.settingIconWrapper, { backgroundColor: `${iconColor}33` }]}>
            <Ionicons name={icon as any} size={26} color={iconColor} />
          </View>
          <View style={styles.settingHeaderText}>
            <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>{title}</Text>
            <Text style={[styles.settingValue, { color: theme.accent, backgroundColor: theme.tagBackground }]}>
              {value}
            </Text>
          </View>
        </View>
        {children}
      </LinearGradient>
    </ModernCard>
  );

  return (
    <>
      <JoinDateModal
        visible={isJoinDateModalVisible}
        onClose={() => setIsJoinDateModalVisible(false)}
        theme={theme}
        joinDate={joinDate}
        formattedJoinDate={formattedJoinDate}
      />

      <LinearGradient colors={theme.gradient as any} style={styles.container}>
        <BackgroundLogo />
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {renderHeroHeader()}
            {renderStatsCards()}

            <ProfileSection title="Profile Information" icon="person-outline">
            <ProfileField
              label="Full Name"
              value={profileData.name}
              onChangeText={(text) => updateProfileField('name', text)}
              placeholder="Enter your full name"
              accessibilityLabel="Full name input"
              editable={isEditingProfile}
            />
            <ProfileField
              label="Email"
              value={profileData.email}
              onChangeText={(text) => updateProfileField('email', text)}
              placeholder="Enter your email"
              keyboardType="email-address"
              accessibilityLabel="Email input"
              editable={isEditingProfile}
            />
            <ProfileField
              label="Bio"
              value={profileData.bio}
              onChangeText={(text) => updateProfileField('bio', text)}
              placeholder="Tell us about yourself"
              multiline
              accessibilityLabel="Bio input"
              editable={isEditingProfile}
            />
            <View style={styles.rowContainer}>
              <View style={styles.halfField}>
                <ProfileField
                  label="Weight"
                  value={profileData.weight}
                  onChangeText={(text) => updateProfileField('weight', text)}
                  placeholder="e.g., 70 kg"
                  accessibilityLabel="Weight input"
                  editable={isEditingProfile}
                />
              </View>
              <View style={styles.halfField}>
                <ProfileField
                  label="Height"
                  value={profileData.height}
                  onChangeText={(text) => updateProfileField('height', text)}
                  placeholder="e.g., 170 cm"
                  accessibilityLabel="Height input"
                  editable={isEditingProfile}
                />
              </View>
            </View>
            <ProfileField
              label="Blood Group"
              value={profileData.bloodGroup}
              onChangeText={(text) => updateProfileField('bloodGroup', text)}
              placeholder="e.g., O+"
              accessibilityLabel="Blood group input"
              editable={isEditingProfile}
            />
            <ProfileField
              label="Allergies"
              value={profileData.allergies}
              onChangeText={(text) => updateProfileField('allergies', text)}
              placeholder="List any allergies"
              multiline
              accessibilityLabel="Allergies input"
              editable={isEditingProfile}
            />
            <ProfileField
              label="Interests"
              value={profileData.interests}
              onChangeText={(text) => updateProfileField('interests', text)}
              placeholder="Your interests and hobbies"
              multiline
              accessibilityLabel="Interests input"
              editable={isEditingProfile}
            />
          </ProfileSection>

          <ProfileSection title="Accessibility Settings" icon="accessibility-outline">
            {renderSettingCard(
              'sunny',
              '#FFA726',
              'Display Brightness',
              `${state.accessibilitySettings.brightness}% • ${getBrightnessLabel(state.accessibilitySettings.brightness)}`,
              (
                <>
                  <TouchSlider
                    value={state.accessibilitySettings.brightness}
                    min={0}
                    max={100}
                    onValueChange={(value) => handleAccessibilityChange('brightness', value)}
                    levelLabels={['Low', 'Medium', 'High', 'Max']}
                    unit="%"
                    accessibilityLabel="Brightness slider"
                  />
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Adjust screen brightness for comfortable viewing
                  </Text>
                </>
              ),
              isDarkMode
                ? ['rgba(255, 167, 38, 0.15)', 'rgba(255, 167, 38, 0.05)']
                : ['rgba(255, 167, 38, 0.1)', 'rgba(255, 167, 38, 0.03)']
            )}

            {renderSettingCard(
              'text',
              '#42A5F5',
              'Text Size',
              `${state.accessibilitySettings.textZoom}% • ${getTextZoomLabel(state.accessibilitySettings.textZoom)}`,
              (
                <>
                  <TouchSlider
                    value={state.accessibilitySettings.textZoom}
                    min={80}
                    max={180}
                    onValueChange={(value) => handleAccessibilityChange('textZoom', value)}
                    levelLabels={['Small', 'Normal', 'Large', 'XL']}
                    unit="%"
                    accessibilityLabel="Text size slider"
                  />
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Make text larger or smaller for better readability
                  </Text>
                </>
              ),
              isDarkMode
                ? ['rgba(66, 165, 245, 0.15)', 'rgba(66, 165, 245, 0.05)']
                : ['rgba(66, 165, 245, 0.1)', 'rgba(66, 165, 245, 0.03)']
            )}

            {renderSettingCard(
              'volume-high',
              '#66BB6A',
              'Voice Speed',
              `${state.accessibilitySettings.voiceSpeed.toFixed(1)}x • ${getVoiceSpeedLabel(state.accessibilitySettings.voiceSpeed)}`,
              (
                <>
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
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Control how fast text is spoken aloud
                  </Text>
                </>
              ),
              isDarkMode
                ? ['rgba(102, 187, 106, 0.15)', 'rgba(102, 187, 106, 0.05)']
                : ['rgba(102, 187, 106, 0.1)', 'rgba(102, 187, 106, 0.03)']
            )}

            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>Dark Mode</Text>
              <Switch
                value={isDarkMode}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: theme.inputBorder, true: theme.accent }}
                thumbColor={isDarkMode ? theme.accent : '#FFFFFF'}
                ios_backgroundColor={theme.inputBorder}
                accessibilityLabel="Dark mode toggle"
              />
            </View>
          </ProfileSection>

          <ProfileSection title="App Information" icon="information-circle-outline">
            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Version</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>1.0.0</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Account Created</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                  {formattedJoinDate}
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
    </>
  );
  
};

export default ProfileScreen;

// Styles
const createSectionStyle = (theme: AppTheme) => ({
  padding: 20,
  marginBottom: 20,
  backgroundColor: theme.cardBackground,
  borderRadius: 20,
  borderWidth: theme.isDark ? 1 : 0.5,
  borderColor: theme.cardBorder,
  shadowColor: theme.cardShadow,
  shadowOffset: { width: 0, height: theme.isDark ? 6 : 3 },
  shadowOpacity: theme.isDark ? 0.35 : 0.1,
  shadowRadius: theme.isDark ? 16 : 8,
  elevation: theme.isDark ? 8 : 4,
});

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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  joinDateModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalHeaderTextWrapper: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  calendarCard: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    width: 200,
    marginBottom: 14,
  },
  calendarMonth: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  calendarDay: {
    fontSize: 44,
    fontWeight: '800',
    marginVertical: 6,
  },
  calendarYear: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  heroHeader: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginTop: 20,
  },
  heroGradient: {
    padding: 24,
  },
  profileHeaderContent: {
    alignItems: 'center',
  },
  profilePictureHeroContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -5,
    left: -5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRingInner: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    borderWidth: 3,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  profilePictureHeroWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  profilePictureHero: {
    width: '100%',
    height: '100%',
  },
  profilePictureHeroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userInfoHero: {
    alignItems: 'center',
    width: '100%',
  },
  userNameHero: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  userEmailHero: {
    fontSize: 15,
    textAlign: 'center',
  },
  userStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    justifyContent: 'center',
  },
  heroActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroActionButtonPrimary: {
    borderWidth: 0,
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOpacity: 0.3,
  },
  heroActionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  heroActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  heroActionTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 0,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 20,
  },
  settingCardEnhanced: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  settingCardGradient: {
    padding: 20,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingHeaderText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
});
