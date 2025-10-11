import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiService, UserSetting } from '@/services/api';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId] = useState(1); // For demo, using user ID 1

  // Default settings
  const [localSettings, setLocalSettings] = useState({
    voice_speed: 1.0,
    high_contrast: false,
    large_text: false,
    voice_navigation: true,
    reminder_frequency: 'normal',
    preferred_voice: 'default',
    push_notifications: true,
    email_notifications: true,
    reminder_sound: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUserSettings(currentUserId);
      setSettings(data);
      
      // Convert settings array to object
      const settingsObj: any = {};
      data.forEach(setting => {
        settingsObj[setting.setting_name] = setting.setting_value;
      });
      
      setLocalSettings(prev => ({
        ...prev,
        ...settingsObj,
        voice_speed: parseFloat(settingsObj.voice_speed) || 1.0,
        high_contrast: settingsObj.high_contrast === 'true',
        large_text: settingsObj.large_text === 'true',
        voice_navigation: settingsObj.voice_navigation === 'true',
        push_notifications: settingsObj.push_notifications === 'true',
        email_notifications: settingsObj.email_notifications === 'true',
        reminder_sound: settingsObj.reminder_sound === 'true',
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings. Using default values.');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingName: string, value: any) => {
    try {
      await apiService.updateUserSetting(currentUserId, settingName, value.toString());
      
      setLocalSettings(prev => ({
        ...prev,
        [settingName]: value,
      }));
      
      // Log TTS usage
      await apiService.logTTSUsage(currentUserId, {
        content: `Setting ${settingName} updated to ${value}`,
        context: 'settings_update',
      });
      
      speakText(`Setting updated: ${settingName} is now ${value}`);
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    }
  };

  const speakText = (text: string) => {
    Speech.speak(text, {
      rate: localSettings.voice_speed,
      pitch: 1.0,
      volume: 1.0,
      language: 'en-US',
    });
  };

  const adjustVoiceSpeed = () => {
    const newSpeed = localSettings.voice_speed >= 2.0 ? 0.5 : localSettings.voice_speed + 0.5;
    updateSetting('voice_speed', newSpeed);
  };

  const toggleSetting = (settingName: string, currentValue: boolean) => {
    updateSetting(settingName, !currentValue);
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaults = {
              voice_speed: 1.0,
              high_contrast: false,
              large_text: false,
              voice_navigation: true,
              reminder_frequency: 'normal',
              preferred_voice: 'default',
              push_notifications: true,
              email_notifications: true,
              reminder_sound: true,
            };
            
            Object.entries(defaults).forEach(([key, value]) => {
              updateSetting(key, value);
            });
            
            speakText('Settings reset to default values');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <ThemedText style={styles.loadingText}>Loading settings...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Settings</ThemedText>
        <ThemedText style={styles.subtitle}>
          Customize your AccessAid experience
        </ThemedText>
      </ThemedView>

      {/* Voice & Speech Settings */}
      <ThemedView style={styles.settingsSection}>
        <ThemedText style={styles.sectionTitle}>Voice & Speech</ThemedText>
        
        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Speech Rate: {localSettings.voice_speed.toFixed(1)}x</ThemedText>
          <TouchableOpacity style={styles.adjustButton} onPress={adjustVoiceSpeed}>
            <Text style={styles.adjustButtonText}>Adjust</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Voice Navigation</ThemedText>
          <Switch
            value={localSettings.voice_navigation}
            onValueChange={() => toggleSetting('voice_navigation', localSettings.voice_navigation)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={localSettings.voice_navigation ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Preferred Voice: {localSettings.preferred_voice}</ThemedText>
          <TouchableOpacity 
            style={styles.adjustButton}
            onPress={() => {
              const voices = ['default', 'enhanced', 'clear', 'simple'];
              const currentIndex = voices.indexOf(localSettings.preferred_voice);
              const nextVoice = voices[(currentIndex + 1) % voices.length];
              updateSetting('preferred_voice', nextVoice);
            }}
          >
            <Text style={styles.adjustButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Visual Settings */}
      <ThemedView style={styles.settingsSection}>
        <ThemedText style={styles.sectionTitle}>Visual Settings</ThemedText>
        
        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>High Contrast Mode</ThemedText>
          <Switch
            value={localSettings.high_contrast}
            onValueChange={() => toggleSetting('high_contrast', localSettings.high_contrast)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={localSettings.high_contrast ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Large Text</ThemedText>
          <Switch
            value={localSettings.large_text}
            onValueChange={() => toggleSetting('large_text', localSettings.large_text)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={localSettings.large_text ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      </ThemedView>

      {/* Notification Settings */}
      <ThemedView style={styles.settingsSection}>
        <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
        
        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Push Notifications</ThemedText>
          <Switch
            value={localSettings.push_notifications}
            onValueChange={() => toggleSetting('push_notifications', localSettings.push_notifications)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={localSettings.push_notifications ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Email Notifications</ThemedText>
          <Switch
            value={localSettings.email_notifications}
            onValueChange={() => toggleSetting('email_notifications', localSettings.email_notifications)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={localSettings.email_notifications ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Reminder Sound</ThemedText>
          <Switch
            value={localSettings.reminder_sound}
            onValueChange={() => toggleSetting('reminder_sound', localSettings.reminder_sound)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={localSettings.reminder_sound ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Reminder Frequency: {localSettings.reminder_frequency}</ThemedText>
          <TouchableOpacity 
            style={styles.adjustButton}
            onPress={() => {
              const frequencies = ['low', 'normal', 'high'];
              const currentIndex = frequencies.indexOf(localSettings.reminder_frequency);
              const nextFreq = frequencies[(currentIndex + 1) % frequencies.length];
              updateSetting('reminder_frequency', nextFreq);
            }}
          >
            <Text style={styles.adjustButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Quick Actions */}
      <ThemedView style={styles.settingsSection}>
        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => speakText('Testing voice settings with current speech rate')}
          accessibilityLabel="Test voice settings"
        >
          <Text style={styles.actionButtonText}>🔊 Test Voice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.resetButton]}
          onPress={resetToDefaults}
          accessibilityLabel="Reset all settings to default"
        >
          <Text style={styles.actionButtonText}>🔄 Reset to Defaults</Text>
        </TouchableOpacity>
      </ThemedView>

      {/* App Info */}
      <ThemedView style={styles.infoSection}>
        <ThemedText style={styles.sectionTitle}>App Information</ThemedText>
        <ThemedText style={styles.infoText}>AccessAid v1.0.0</ThemedText>
        <ThemedText style={styles.infoText}>by Code Innovators</ThemedText>
        <ThemedText style={styles.infoText}>
          Making technology accessible for everyone
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#6C7B7F',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F8E8',
    textAlign: 'center',
  },
  settingsSection: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  adjustButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  adjustButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  resetButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
    textAlign: 'center',
  },
});
