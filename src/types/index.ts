export interface User {
  id: string;
  email: string;
  pin: string;
  name: string;
  joinDate?: string;
  bio?: string;
  weight?: string;
  height?: string;
  bloodGroup?: string;
  allergies?: string;
  interests?: string;
  profilePhoto?: string;
}

export interface AccessibilitySettings {
  brightness: number; // 0-100
  textZoom: number; // 100-200
  voiceSpeed: number; // 0.5-2.0
  isDarkMode: boolean;
}
export type ReminderCategory = 'medication' | 'doctor' | 'therapy' | 'exercise' | 'personal' | 'emergency';
export type ReminderPriority = 'low' | 'medium' | 'high' | 'emergency';
export type ReminderRecurrence = 'once' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: Date;
  time: Date;
  isCompleted: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: ReminderCategory;
  priority?: ReminderPriority;
  recurrence?: ReminderRecurrence;
}



export interface VoiceCommand {
  command: string;
  action: () => void;
}

export type RootStackParamList = {
  Login: undefined;
  AccessibilitySetup: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Reminders: undefined;
  Profile: undefined;
};
