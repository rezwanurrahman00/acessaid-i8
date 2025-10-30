/**
 * API service for AccessAid app
 * Handles communication with the FastAPI backend
 * ✅ Auto-detects best backend URL (local, LAN, or Expo tunnel)
 * ✅ Includes timeout & retry for stability
 */

const getBaseUrl = () => {
  // Try auto-detection based on environment
  if (__DEV__) {
    // Check if running via Expo tunnel (more stable for teams)
    const expoUrl = process.env.EXPO_PUBLIC_API_URL;
    if (expoUrl) return `${expoUrl}/api`;

    // Fallback to LAN or local dev
    const lanIp = "http://192.168.0.220:8000/api"; // your home setup
    const localhost = "http://localhost:8000/api";
    return lanIp || localhost;
  } else {
    // Production fallback (e.g., deployed FastAPI server)
    return "https://accessaid-backend.onrender.com/api";
  }
};

const API_BASE_URL = getBaseUrl();

// Helper function: timeout wrapper for fetch
const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeout)
    ),
  ]);
};

// Helper function: retry wrapper
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await (response as Response).json();
    } catch (err) {
      console.warn(`Fetch attempt ${attempt} failed:`, err);
      if (attempt === retries) throw err;
      await new Promise((res) => setTimeout(res, 500 * attempt)); // exponential backoff
    }
  }
  throw new Error("Max retries reached");
}

// -------------------- Types --------------------
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

// -------------------- API Service --------------------
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log("🔗 API Request:", url);

    try {
      const result = await fetchWithRetry<T>(url, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
      });
      return result;
    } catch (error) {
      console.error("🚨 API Error:", error);
      throw error;
    }
  }

  // ---------- User ----------
  async getUsers(): Promise<User[]> {
    return this.request<User[]>("/users");
  }

  async getUser(userId: number): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  // ---------- Reminders ----------
  async getUserReminders(userId: number): Promise<Reminder[]> {
    return this.request<Reminder[]>(`/users/${userId}/reminders`);
  }

  async createReminder(
    userId: number,
    reminderData: {
      title: string;
      description?: string;
      reminder_datetime?: string;
      frequency?: string;
      priority?: string;
    }
  ): Promise<Reminder> {
    return this.request<Reminder>(`/users/${userId}/reminders`, {
      method: "POST",
      body: JSON.stringify(reminderData),
    });
  }

  async updateReminder(
    reminderId: number,
    updateData: {
      title?: string;
      description?: string;
      is_active?: boolean;
      is_completed?: boolean;
    }
  ): Promise<Reminder> {
    return this.request<Reminder>(`/reminders/${reminderId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  async deleteReminder(reminderId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/reminders/${reminderId}`, {
      method: "DELETE",
    });
  }

  // ---------- TTS ----------
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
    return this.request<{ message: string }>(`/users/${userId}/tts-history`, {
      method: "POST",
      body: JSON.stringify(ttsData),
    });
  }

  async getTTSHistory(userId: number, limit = 10): Promise<TTSHistory[]> {
    return this.request<TTSHistory[]>(`/users/${userId}/tts-history?limit=${limit}`);
  }

  // ---------- Settings ----------
  async getUserSettings(userId: number): Promise<UserSetting[]> {
    return this.request<UserSetting[]>(`/users/${userId}/settings`);
  }

  async updateUserSetting(
    userId: number,
    settingName: string,
    settingValue: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${userId}/settings`, {
      method: "POST",
      body: JSON.stringify({ setting_name: settingName, setting_value: settingValue }),
    });
  }

  // ---------- Utility ----------
  async seedDatabase(): Promise<{ message: string }> {
    return this.request<{ message: string }>("/seed-data", { method: "POST" });
  }

  async healthCheck(): Promise<{ message: string; status: string }> {
    return this.request<{ message: string; status: string }>("/health");
  }
}

export const apiService = new ApiService();
export default ApiService;

