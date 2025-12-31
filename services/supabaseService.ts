/**
 * Supabase Service Layer
 * Handles all database operations with offline fallback to AsyncStorage
 */

import { supabase, isSupabaseConfigured } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Reminder, AccessibilitySettings } from '../src/types';

// ==================== USER OPERATIONS ====================

export const supabaseService = {
  // Get current authenticated user
  async getCurrentUser() {
    try {
      if (!isSupabaseConfigured()) {
        const localUser = await AsyncStorage.getItem('user');
        return localUser ? JSON.parse(localUser) : null;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) return null;

      // Get user profile from users table
      const { data, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      
      return data ? { ...data, email: user.email } : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      const localUser = await AsyncStorage.getItem('user');
      return localUser ? JSON.parse(localUser) : null;
    }
  },

  // Sign up new user (with PIN)
  async signUp(email: string, pin: string, userData: Partial<User>) {
    try {
      if (!isSupabaseConfigured()) {
        // Fallback to local storage
        const newUser = {
          id: Date.now().toString(),
          email,
          pin,
          ...userData,
          createdAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
        // Also add to users directory
        const usersRaw = await AsyncStorage.getItem('users');
        const users = usersRaw ? JSON.parse(usersRaw) : [];
        users.push(newUser);
        await AsyncStorage.setItem('users', JSON.stringify(users));
        return { user: newUser, error: null };
      }

      // Use PIN as password (Supabase requires password, we'll use PIN)
      // For production, consider hashing the PIN
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: pin, // Using PIN as password
        options: {
          data: {
            pin: pin, // Store PIN in user metadata
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          first_name: userData.name?.split(' ')[0] || null,
          last_name: userData.name?.split(' ').slice(1).join(' ') || null,
          profile_photo: userData.profilePhoto || null,
          accessibility_preferences: null,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      const userWithPin = { ...profileData, email, pin };
      // Also save locally for offline access
      await AsyncStorage.setItem('user', JSON.stringify(userWithPin));
      const usersRaw = await AsyncStorage.getItem('users');
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      users.push(userWithPin);
      await AsyncStorage.setItem('users', JSON.stringify(users));

      return { user: userWithPin, error: null };
    } catch (error: any) {
      console.error('Error signing up:', error);
      return { user: null, error: error.message };
    }
  },

  // Sign in user (with PIN)
  async signIn(email: string, pin: string) {
    try {
      if (!isSupabaseConfigured()) {
        // Fallback: check local storage
        const usersStr = await AsyncStorage.getItem('users');
        const users = usersStr ? JSON.parse(usersStr) : [];
        const user = users.find((u: any) => u.email === email.toLowerCase().trim());
        if (user && user.pin === pin) {
          await AsyncStorage.setItem('user', JSON.stringify(user));
          return { user, error: null };
        }
        return { user: null, error: user ? 'Invalid PIN' : 'User not found' };
      }

      // Use PIN as password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign in failed');

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      // Get PIN from user metadata
      const pinFromMetadata = data.user.user_metadata?.pin || pin;
      const user = { ...profileData, email: data.user.email, pin: pinFromMetadata };
      await AsyncStorage.setItem('user', JSON.stringify(user));

      return { user, error: null };
    } catch (error: any) {
      console.error('Error signing in:', error);
      // Fallback to local storage
      const usersStr = await AsyncStorage.getItem('users');
      const users = usersStr ? JSON.parse(usersStr) : [];
      const user = users.find((u: any) => u.email === email.toLowerCase().trim());
      if (user && user.pin === pin) {
        await AsyncStorage.setItem('user', JSON.stringify(user));
        return { user, error: null };
      }
      return { user: null, error: error.message || 'Invalid credentials' };
    }
  },

  // Sign out
  async signOut() {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
      await AsyncStorage.removeItem('user');
      return { error: null };
    } catch (error: any) {
      console.error('Error signing out:', error);
      return { error: error.message };
    }
  },

  // Update user profile
  async updateUser(userId: string, updates: Partial<User>) {
    try {
      if (!isSupabaseConfigured()) {
        const localUser = await AsyncStorage.getItem('user');
        if (localUser) {
          const user = { ...JSON.parse(localUser), ...updates };
          await AsyncStorage.setItem('user', JSON.stringify(user));
          return { user, error: null };
        }
        return { user: null, error: 'User not found' };
      }

      const updateData: any = {};
      if (updates.name) {
        const nameParts = updates.name.split(' ');
        updateData.first_name = nameParts[0] || null;
        updateData.last_name = nameParts.slice(1).join(' ') || null;
      }
      if (updates.profilePhoto) updateData.profile_photo = updates.profilePhoto;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Update local storage
      const localUser = await AsyncStorage.getItem('user');
      if (localUser) {
        const user = { ...JSON.parse(localUser), ...data, ...updates };
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }

      return { user: data, error: null };
    } catch (error: any) {
      console.error('Error updating user:', error);
      return { user: null, error: error.message };
    }
  },

  // ==================== REMINDER OPERATIONS ====================

  // Get all reminders for a user
  async getReminders(userId: string): Promise<Reminder[]> {
    try {
      if (!isSupabaseConfigured()) {
        const key = `reminders_${userId}`;
        const reminders = await AsyncStorage.getItem(key);
        return reminders ? JSON.parse(reminders) : [];
      }

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .order('reminder_datetime', { ascending: true });

      if (error) throw error;

      // Convert to app format
      const formattedReminders = (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        date: new Date(r.reminder_datetime),
        time: new Date(r.reminder_datetime),
        category: r.category || 'Other',
        priority: r.priority || 'Medium',
        recurrence: r.frequency?.toLowerCase() as any,
        isCompleted: r.is_completed,
        isActive: r.is_active,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      }));

      // Cache locally
      const key = `reminders_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(formattedReminders));

      return formattedReminders;
    } catch (error) {
      console.error('Error getting reminders:', error);
      const key = `reminders_${userId}`;
      const reminders = await AsyncStorage.getItem(key);
      return reminders ? JSON.parse(reminders) : [];
    }
  },

  // Create reminder
  async createReminder(userId: string, reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const reminderData = {
        user_id: userId,
        title: reminder.title,
        description: reminder.description || null,
        reminder_datetime: reminder.date.toISOString(),
        frequency: reminder.recurrence || 'once',
        priority: reminder.priority || 'Medium',
        category: reminder.category || 'Other',
        is_active: reminder.isActive !== false,
        is_completed: reminder.isCompleted || false,
      };

      if (!isSupabaseConfigured()) {
        const newReminder = {
          ...reminder,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const key = `reminders_${userId}`;
        const reminders = await AsyncStorage.getItem(key);
        const remindersList = reminders ? JSON.parse(reminders) : [];
        remindersList.push(newReminder);
        await AsyncStorage.setItem(key, JSON.stringify(remindersList));
        return { reminder: newReminder, error: null };
      }

      const { data, error } = await supabase
        .from('reminders')
        .insert(reminderData)
        .select()
        .single();

      if (error) throw error;

      const formattedReminder = {
        id: data.id,
        ...reminder,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      // Update local cache
      const key = `reminders_${userId}`;
      const reminders = await AsyncStorage.getItem(key);
      const remindersList = reminders ? JSON.parse(reminders) : [];
      remindersList.push(formattedReminder);
      await AsyncStorage.setItem(key, JSON.stringify(remindersList));

      return { reminder: formattedReminder, error: null };
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      return { reminder: null, error: error.message };
    }
  },

  // Update reminder
  async updateReminder(userId: string, reminderId: string, updates: Partial<Reminder>) {
    try {
      if (!isSupabaseConfigured()) {
        const key = `reminders_${userId}`;
        const reminders = await AsyncStorage.getItem(key);
        if (reminders) {
          const remindersList = JSON.parse(reminders);
          const index = remindersList.findIndex((r: Reminder) => r.id === reminderId);
          if (index >= 0) {
            remindersList[index] = { ...remindersList[index], ...updates, updatedAt: new Date() };
            await AsyncStorage.setItem(key, JSON.stringify(remindersList));
            return { reminder: remindersList[index], error: null };
          }
        }
        return { reminder: null, error: 'Reminder not found' };
      }

      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.date) updateData.reminder_datetime = updates.date.toISOString();
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.category) updateData.category = updates.category;
      if (updates.recurrence) updateData.frequency = updates.recurrence;
      if (updates.isCompleted !== undefined) updateData.is_completed = updates.isCompleted;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', reminderId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Update local cache
      const key = `reminders_${userId}`;
      const reminders = await AsyncStorage.getItem(key);
      if (reminders) {
        const remindersList = JSON.parse(reminders);
        const index = remindersList.findIndex((r: Reminder) => r.id === reminderId);
        if (index >= 0) {
          remindersList[index] = {
            ...remindersList[index],
            ...updates,
            updatedAt: new Date(),
          };
          await AsyncStorage.setItem(key, JSON.stringify(remindersList));
        }
      }

      return { reminder: data, error: null };
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      return { reminder: null, error: error.message };
    }
  },

  // Delete reminder
  async deleteReminder(userId: string, reminderId: string) {
    try {
      if (!isSupabaseConfigured()) {
        const key = `reminders_${userId}`;
        const reminders = await AsyncStorage.getItem(key);
        if (reminders) {
          const remindersList = JSON.parse(reminders).filter((r: Reminder) => r.id !== reminderId);
          await AsyncStorage.setItem(key, JSON.stringify(remindersList));
        }
        return { error: null };
      }

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local cache
      const key = `reminders_${userId}`;
      const reminders = await AsyncStorage.getItem(key);
      if (reminders) {
        const remindersList = JSON.parse(reminders).filter((r: Reminder) => r.id !== reminderId);
        await AsyncStorage.setItem(key, JSON.stringify(remindersList));
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error deleting reminder:', error);
      return { error: error.message };
    }
  },

  // ==================== SETTINGS OPERATIONS ====================

  // Get user settings
  async getSettings(userId: string): Promise<AccessibilitySettings> {
    try {
      if (!isSupabaseConfigured()) {
        const settings = await AsyncStorage.getItem('accessibilitySettings');
        return settings ? JSON.parse(settings) : {
          brightness: 50,
          textZoom: 100,
          voiceSpeed: 1.0,
          isDarkMode: false,
        };
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      // Convert settings array to object
      const settingsObj: any = {
        brightness: 50,
        textZoom: 100,
        voiceSpeed: 1.0,
        isDarkMode: false,
      };

      (data || []).forEach((setting: any) => {
        if (setting.setting_name === 'brightness') settingsObj.brightness = parseFloat(setting.setting_value);
        if (setting.setting_name === 'textZoom') settingsObj.textZoom = parseFloat(setting.setting_value);
        if (setting.setting_name === 'voiceSpeed') settingsObj.voiceSpeed = parseFloat(setting.setting_value);
        if (setting.setting_name === 'isDarkMode') settingsObj.isDarkMode = setting.setting_value === 'true';
      });

      await AsyncStorage.setItem('accessibilitySettings', JSON.stringify(settingsObj));
      return settingsObj;
    } catch (error) {
      console.error('Error getting settings:', error);
      const settings = await AsyncStorage.getItem('accessibilitySettings');
      return settings ? JSON.parse(settings) : {
        brightness: 50,
        textZoom: 100,
        voiceSpeed: 1.0,
        isDarkMode: false,
      };
    }
  },

  // Update setting
  async updateSetting(userId: string, settingName: string, settingValue: string | number) {
    try {
      if (!isSupabaseConfigured()) {
        const settings = await AsyncStorage.getItem('accessibilitySettings');
        const settingsObj = settings ? JSON.parse(settings) : {};
        settingsObj[settingName] = settingValue;
        await AsyncStorage.setItem('accessibilitySettings', JSON.stringify(settingsObj));
        return { error: null };
      }

      // Upsert setting
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          setting_name: settingName,
          setting_value: String(settingValue),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,setting_name',
        });

      if (error) throw error;

      // Update local cache
      const settings = await AsyncStorage.getItem('accessibilitySettings');
      const settingsObj = settings ? JSON.parse(settings) : {};
      settingsObj[settingName] = settingValue;
      await AsyncStorage.setItem('accessibilitySettings', JSON.stringify(settingsObj));

      return { error: null };
    } catch (error: any) {
      console.error('Error updating setting:', error);
      return { error: error.message };
    }
  },

  // ==================== TTS HISTORY OPERATIONS ====================

  // Log TTS usage
  async logTTSUsage(userId: string, ttsData: {
    content: string;
    voice_settings?: any;
    speech_rate?: number;
    volume?: number;
    context?: string;
  }) {
    try {
      if (!isSupabaseConfigured()) {
        // Just log locally or skip
        return { error: null };
      }

      const { error } = await supabase
        .from('tts_history')
        .insert({
          user_id: userId,
          content: ttsData.content,
          voice_settings: ttsData.voice_settings || null,
          speech_rate: ttsData.speech_rate || 1.0,
          volume: ttsData.volume || 1.0,
          context: ttsData.context || null,
        });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Error logging TTS usage:', error);
      return { error: error.message };
    }
  },
};

