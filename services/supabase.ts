/**
 * Supabase Client Configuration
 * 
 * To get your Supabase credentials:
 * 1. Go to https://supabase.com and create a free account
 * 2. Create a new project
 * 3. Go to Settings > API
 * 4. Copy your Project URL and anon/public key
 * 5. Add them to app.json under extra section or use environment variables
 */

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get Supabase URL and key from app.json or environment
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Store for checking if configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');
};

if (!isSupabaseConfigured()) {
  console.warn('⚠️ Supabase credentials not found. Please add them to app.json or environment variables.');
  console.warn('Add to app.json extra section:');
  console.warn('  "supabaseUrl": "your-project-url",');
  console.warn('  "supabaseAnonKey": "your-anon-key"');
  console.warn('The app will work in offline mode using AsyncStorage only.');
}

// Create Supabase client (use placeholder values if not configured)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Database types (will be generated from Supabase schema)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          profile_photo: string | null;
          accessibility_preferences: {
            voice_speed: number;
            high_contrast: boolean;
            large_text: boolean;
            voice_navigation: boolean;
            reminder_frequency: string;
            preferred_voice: string;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          profile_photo?: string | null;
          accessibility_preferences?: {
            voice_speed: number;
            high_contrast: boolean;
            large_text: boolean;
            voice_navigation: boolean;
            reminder_frequency: string;
            preferred_voice: string;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          profile_photo?: string | null;
          accessibility_preferences?: {
            voice_speed: number;
            high_contrast: boolean;
            large_text: boolean;
            voice_navigation: boolean;
            reminder_frequency: string;
            preferred_voice: string;
          } | null;
          updated_at?: string;
        };
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          reminder_datetime: string;
          frequency: string;
          priority: string;
          category: string | null;
          is_active: boolean;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          reminder_datetime: string;
          frequency: string;
          priority: string;
          category?: string | null;
          is_active?: boolean;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          reminder_datetime?: string;
          frequency?: string;
          priority?: string;
          category?: string | null;
          is_active?: boolean;
          is_completed?: boolean;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          setting_name: string;
          setting_value: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          setting_name: string;
          setting_value: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          setting_name?: string;
          setting_value?: string;
          updated_at?: string;
        };
      };
      tts_history: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          voice_settings: any | null;
          speech_rate: number;
          volume: number;
          context: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          voice_settings?: any | null;
          speech_rate?: number;
          volume?: number;
          context?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          voice_settings?: any | null;
          speech_rate?: number;
          volume?: number;
          context?: string | null;
        };
      };
    };
  };
};

