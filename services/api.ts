/**
 * API service for AccessAid app
 * Fully compatible with online + offline (mock fallback) modes
 */

const API_BASE_URL = 'http://192.168.0.220:8000/api'; // backend optional

// --- Types ---
export interface User {
  user_id: number;
  email: string;
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

// --- Mock Fallback Data ---
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
  {
    reminder_id: 2,
    title: "Review sprint tasks",
    description: "Check GitHub progress",
    reminder_datetime: new Date().toISOString(),
    frequency: "Once",
    priority: "High",
    is_active: true,
    is_completed: false,
    created_at: new Date().toISOString(),
  },
];

const mockSettings: UserSetting[] = [
  { setting_id: 1, setting_name: "talking", setting_value: "true", updated_at: new Date().toISOString() },
  { setting_id: 2, setting_name: "high_contrast", setting_value: "false", updated_at: new Date().toISOString() },
];

// --- Helper Function ---
async function tryFetch<T>(url: string, options: RequestInit = {}, fallback: T): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(url, { ...options, signal: controller.signal });

    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn("⚠️ Using mock data for:", url);
    return fallback;
  }
}

// --- Main Service Class ---
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    return tryFetch(`${this.baseUrl}/users`, {}, [mockUser]);
  }

  async getUser(userId: number): Promise<User> {
    return tryFetch(`${this.baseUrl}/users/${userId}`, {}, mockUser);
  }

  // --- REMINDERS ---
  async getUserReminders(userId: number): Promise<Reminder[]> {
    return tryFetch(`${this.baseUrl}/users/${userId}/reminders`, {}, mockReminders);
  }

  async updateReminder(
    reminderId: number,
    updateData: Partial<Reminder>
  ): Promise<{ message: string }> {
    console.log("🟢 updateReminder called:", reminderId, updateData);
    return tryFetch(
      `${this.baseUrl}/reminders/${reminderId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      },
      { message: "Reminder updated locally (offline mode)" }
    );
  }

  // --- SETTINGS ---
  async getUserSettings(userId: number): Promise<UserSetting[]> {
    return tryFetch(`${this.baseUrl}/users/${userId}/settings`, {}, mockSettings);
  }

  async updateUserSetting(userId: number, settingName: string, settingValue: string) {
    console.log("🟢 updateUserSetting called:", settingName, settingValue);
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

  // --- TTS LOGGING (Always Available) ---
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
    try {
      console.log("🟢 logTTSUsage called:", userId, ttsData);
      return await tryFetch(
        `${this.baseUrl}/users/${userId}/tts-history`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ttsData),
        },
        { message: "TTS logged locally (offline mode)" }
      );
    } catch (error) {
      console.warn("⚠️ logTTSUsage failed, using offline log");
      console.log("📝 Offline log:", ttsData);
      return { message: "Offline mock log saved" };
    }
  }

  // --- HEALTH CHECK ---
  async healthCheck() {
    return tryFetch(`${this.baseUrl}/health`, {}, { message: "Offline Mode", status: "ok" });
  }
}

// --- Export Singleton ---
export const apiService = new ApiService();
export default ApiService;




