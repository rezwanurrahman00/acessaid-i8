/**
 * API Service for AccessAid
 * Handles all backend communication with offline fallback support
 */

// Set EXPO_PUBLIC_API_BASE_URL in your .env file (copy from .env.example)
// For Android device: http://<your-machine-ip>:8000/api
// For Android emulator: http://10.0.2.2:8000/api
// For iOS simulator: http://localhost:8000/api
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Types
export interface User {
  user_id: number;
  email: string;
  name?: string;
  first_name: string;
  last_name: string;
  accessibility_preferences: {
    voice_speed: number;
    high_contrast: boolean;
    large_text: boolean;
    voice_navigation: boolean;
    reminder_frequency: string;
    preferred_voice: string;
  };
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface UserRegistration {
  email: string;
  pin: string;
  name: string;
}

export interface UserLogin {
  email: string;
  pin: string;
}

export interface Reminder {
  reminder_id: number;
  title: string;
  description?: string;
  reminder_datetime: string;
  frequency: string;
  priority: string;
  is_active: boolean;
  is_completed: boolean;
  created_at: string;
}

export interface TTSHistory {
  tts_id: number;
  content: string;
  voice_settings: any;
  speech_rate: number;
  volume: number;
  timestamp: string;
  context: string;
}

export interface UserSetting {
  setting_id: number;
  setting_name: string;
  setting_value: string;
  updated_at: string;
}

// Mock fallback data
const mockUser: User = {
  user_id: 1,
  email: "rezwanu.rahman@my.unt.edu",
  first_name: "Rezwanur",
  last_name: "Rahman",
  accessibility_preferences: {
    voice_speed: 1.0,
    high_contrast: false,
    large_text: false,
    voice_navigation: true,
    reminder_frequency: "daily",
    preferred_voice: "default",
  },
  timezone: "CST",
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockReminders: Reminder[] = [
  {
    reminder_id: 1,
    title: "Take a short break",
    description: "Stretch and drink water",
    reminder_datetime: new Date().toISOString(),
    frequency: "Daily",
    priority: "Medium",
    is_active: true,
    is_completed: false,
    created_at: new Date().toISOString(),
  },
];

const mockSettings: UserSetting[] = [
  { setting_id: 1, setting_name: "talking", setting_value: "true", updated_at: new Date().toISOString() },
  { setting_id: 2, setting_name: "high_contrast", setting_value: "false", updated_at: new Date().toISOString() },
];

// Helper: Try fetch with timeout and fallback
async function tryFetch<T>(url: string, options: RequestInit = {}, fallback: T): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    console.log(`Fetching: ${url} with options:`, options);
    const response = await fetch(url, { ...options, signal: controller.signal });
    console.log(`Response from ${url}:`, response);
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn("⚠️ Using mock data for:", url);
    return fallback;
  }
}

// API Service Class
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Authentication methods
  async register(userData: UserRegistration): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(error.detail || 'Registration failed');
    }

    return await response.json();
  }

  async login(loginData: UserLogin): Promise<User> {
    console.log('Attempting login with data:', loginData);
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData),
    });

    console.log('Login response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Invalid email or PIN');
    }

    return await response.json();
  }

  async getUsers(): Promise<User[]> {
    return tryFetch(`${this.baseUrl}/users`, {}, [mockUser]);
  }

  async getUser(userId: number): Promise<User> {
    return tryFetch(`${this.baseUrl}/users/${userId}`, {}, mockUser);
  }

  async getUserReminders(userId: number): Promise<Reminder[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/reminders`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async createReminder(userId: number, reminderData: {
    title: string;
    description?: string;
    reminder_datetime: string;
    frequency?: string;
    priority?: string;
  }): Promise<Reminder> {
    console.log('Creating reminder with data:', reminderData);
    const response = await fetch(`${this.baseUrl}/users/${userId}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reminderData),
    });

    if (!response.ok) {
      throw new Error('Failed to create reminder');
    }

    return await response.json();
  }

  async updateReminder(userId: number, reminderId: number, updateData: Partial<Reminder>): Promise<Reminder> {
    console.log(`✏️ Updating reminder ${reminderId}:`, updateData);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${this.baseUrl}/reminders/${reminderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async deleteReminder(reminderId: number): Promise<{ message: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${this.baseUrl}/reminders/${reminderId}`, {
        method: 'DELETE',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async getUserSettings(userId: number): Promise<UserSetting[]> {
    return tryFetch(`${this.baseUrl}/users/${userId}/settings`, {}, mockSettings);
  }

  async updateUserSetting(userId: number, settingName: string, settingValue: string) {
    return tryFetch(
      `${this.baseUrl}/users/${userId}/settings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setting_name: settingName, setting_value: settingValue }),
      },
      { message: "Saved locally (offline mode)" }
    );
  }

  async logTTSUsage(
    userId: number,
    ttsData: {
      content: string;
      voice_settings?: any;
      speech_rate?: number;
      volume?: number;
      context?: string;
    }
  ): Promise<{ message: string }> {
    return tryFetch(
      `${this.baseUrl}/users/${userId}/tts-history`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ttsData),
      },
      { message: "TTS logged locally (offline mode)" }
    );
  }

  async healthCheck() {
    return tryFetch(`${this.baseUrl}/health`, {}, { message: "Offline Mode", status: "ok" });
  }
}

export const apiService = new ApiService();
export default ApiService;

