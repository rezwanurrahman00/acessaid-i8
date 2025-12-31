import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { supabaseService } from '../../services/supabaseService';
import { AccessibilitySettings, Reminder, User } from '../types';
import { voiceManager } from '../utils/voiceCommandManager';

interface AppState {
  user: User | null;
  isLoggedIn: boolean;
  hasCompletedSetup: boolean;
  accessibilitySettings: AccessibilitySettings;
  isVoiceEnabled: boolean;
  voiceAnnouncementsEnabled: boolean;
  reminders: Reminder[];
}

type AppAction =
  | { type: 'LOGIN'; payload: User }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'LOGOUT' }
  | { type: 'COMPLETE_SETUP' }
  | { type: 'UPDATE_ACCESSIBILITY_SETTINGS'; payload: Partial<AccessibilitySettings> }
  | { type: 'TOGGLE_VOICE'; payload: boolean }
  | { type: 'TOGGLE_VOICE_ANNOUNCEMENTS'; payload: boolean }
  | { type: 'ADD_REMINDER'; payload: Reminder }
  | { type: 'UPDATE_REMINDER'; payload: Reminder }
  | { type: 'DELETE_REMINDER'; payload: string }
  | { type: 'TOGGLE_REMINDER'; payload: string }
  | { type: 'LOAD_DATA'; payload: Partial<AppState> }
  | { type: 'SET_REMINDERS'; payload: Reminder[] };

const initialState: AppState = {
  user: null,
  isLoggedIn: false,
  hasCompletedSetup: false,
  accessibilitySettings: {
    brightness: 50,
    textZoom: 100,
    voiceSpeed: 1.0,
    isDarkMode: false,
  },
  isVoiceEnabled: false,
  voiceAnnouncementsEnabled: true,
  reminders: [],
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload,
        isLoggedIn: true,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : state.user,
      };
    case 'LOGOUT':
      return {
        ...initialState,
      };
    case 'COMPLETE_SETUP':
      return {
        ...state,
        hasCompletedSetup: true,
      };
    case 'UPDATE_ACCESSIBILITY_SETTINGS':
      return {
        ...state,
        accessibilitySettings: {
          ...state.accessibilitySettings,
          ...action.payload,
        },
      };
    case 'TOGGLE_VOICE':
      return {
        ...state,
        isVoiceEnabled: action.payload,
      };
    case 'TOGGLE_VOICE_ANNOUNCEMENTS':
      return {
        ...state,
        voiceAnnouncementsEnabled: action.payload,
      };
    case 'ADD_REMINDER':
      console.log('=== APP CONTEXT ADD_REMINDER ===');
      console.log('Current reminders before:', state.reminders.length);
      console.log('New reminder:', action.payload);
      const newState = {
        ...state,
        reminders: [...state.reminders, action.payload],
      };
      console.log('New reminders array length:', newState.reminders.length);
      
      // Sync to Supabase in background
      if (state.user?.id) {
        supabaseService.createReminder(state.user.id, action.payload).catch(err => {
          console.log('Background sync: Reminder creation failed (offline mode)', err);
        });
      }
      
      return newState;
    case 'UPDATE_REMINDER':
      // Sync to Supabase in background
      if (state.user?.id) {
        supabaseService.updateReminder(state.user.id, action.payload.id, action.payload).catch(err => {
          console.log('Background sync: Reminder update failed (offline mode)', err);
        });
      }
      
      return {
        ...state,
        reminders: state.reminders.map(reminder =>
          reminder.id === action.payload.id ? action.payload : reminder
        ),
      };
    case 'DELETE_REMINDER':
      // Sync to Supabase in background
      if (state.user?.id) {
        supabaseService.deleteReminder(state.user.id, action.payload).catch(err => {
          console.log('Background sync: Reminder deletion failed (offline mode)', err);
        });
      }
      
      return {
        ...state,
        reminders: state.reminders.filter(reminder => reminder.id !== action.payload),
      };
    case 'TOGGLE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map(reminder =>
          reminder.id === action.payload
            ? { ...reminder, isCompleted: !reminder.isCompleted }
            : reminder
        ),
      };
    case 'LOAD_DATA':
      return {
        ...state,
        ...action.payload,
      };
    case 'SET_REMINDERS':
      return {
        ...state,
        reminders: action.payload,
      };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from AsyncStorage on app start (user, settings, setup flag)
  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const settingsData = await AsyncStorage.getItem('accessibilitySettings');
        const setupData = await AsyncStorage.getItem('hasCompletedSetup');

        if (userData) {
          dispatch({ type: 'LOGIN', payload: JSON.parse(userData) });
        }
        if (settingsData) {
          dispatch({ type: 'UPDATE_ACCESSIBILITY_SETTINGS', payload: JSON.parse(settingsData) });
        }
        if (setupData) {
          dispatch({ type: 'LOAD_DATA', payload: { hasCompletedSetup: JSON.parse(setupData) } });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Load reminders for the current user when user changes (with Supabase sync)
  useEffect(() => {
    const loadUserReminders = async () => {
      try {
        if (!state.user) {
          dispatch({ type: 'SET_REMINDERS', payload: [] });
          return;
        }

        // Try to load from Supabase first, fallback to AsyncStorage
        const reminders = await supabaseService.getReminders(state.user.id);
        
        // Convert date strings to Date objects
        const parsedReminders = reminders.map((reminder: any) => ({
          ...reminder,
          date: reminder.date instanceof Date ? reminder.date : new Date(reminder.date),
          time: reminder.time instanceof Date ? reminder.time : new Date(reminder.time),
          createdAt: reminder.createdAt instanceof Date ? reminder.createdAt : new Date(reminder.createdAt),
          updatedAt: reminder.updatedAt instanceof Date ? reminder.updatedAt : new Date(reminder.updatedAt),
        }));

        dispatch({ type: 'SET_REMINDERS', payload: parsedReminders });
      } catch (error) {
        console.error('Error loading user reminders:', error);
        // Fallback to local storage
        try {
          const key = `reminders_${state.user?.id}`;
          const remindersData = await AsyncStorage.getItem(key);
          if (remindersData) {
            const parsedReminders = JSON.parse(remindersData).map((reminder: any) => ({
              ...reminder,
              date: new Date(reminder.date),
              time: new Date(reminder.time),
              createdAt: new Date(reminder.createdAt),
              updatedAt: new Date(reminder.updatedAt),
            }));
            dispatch({ type: 'SET_REMINDERS', payload: parsedReminders });
          }
        } catch (localError) {
          console.error('Error loading from local storage:', localError);
        }
      }
    };

    loadUserReminders();
  }, [state.user]);

  // Save data to AsyncStorage and sync with Supabase when state changes
  useEffect(() => {
    const saveData = async () => {
      try {
        // Always save to AsyncStorage first (offline cache)
        if (state.user) {
          await AsyncStorage.setItem('user', JSON.stringify(state.user));
          // Also keep a directory of users up to date (by id)
          try {
            const usersRaw = await AsyncStorage.getItem('users');
            const users: any[] = usersRaw ? JSON.parse(usersRaw) : [];
            const idx = users.findIndex(u => u.id === state.user!.id);
            if (idx >= 0) {
              users[idx] = { ...users[idx], ...state.user };
            } else {
              users.unshift(state.user);
            }
            await AsyncStorage.setItem('users', JSON.stringify(users));
          } catch {}
        }
        await AsyncStorage.setItem('accessibilitySettings', JSON.stringify(state.accessibilitySettings));
        await AsyncStorage.setItem('hasCompletedSetup', JSON.stringify(state.hasCompletedSetup));
        if (state.user) {
          const key = `reminders_${state.user.id}`;
          await AsyncStorage.setItem(key, JSON.stringify(state.reminders));
        }

        // Sync with Supabase (non-blocking, runs in background)
        if (state.user) {
          // Sync user profile
          if (state.user.id) {
            supabaseService.updateUser(state.user.id, state.user).catch(err => {
              console.log('Background sync: User update failed (offline mode)', err);
            });
          }

          // Sync settings
          Object.entries(state.accessibilitySettings).forEach(([key, value]) => {
            supabaseService.updateSetting(state.user!.id, key, value).catch(err => {
              console.log(`Background sync: Setting ${key} update failed (offline mode)`, err);
            });
          });
        }
      } catch (error) {
        console.error('Error saving data:', error);
      }
    };

    saveData();
  }, [state.user, state.accessibilitySettings, state.hasCompletedSetup, state.reminders]);

  // Sync voice announcements setting with voiceManager
  useEffect(() => {
    voiceManager.setVoiceAnnouncementsEnabled(state.voiceAnnouncementsEnabled);
  }, [state.voiceAnnouncementsEnabled]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
