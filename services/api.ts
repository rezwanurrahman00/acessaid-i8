/**
 * API service for AccessAid app
 * Handles communication with the FastAPI backend
 */

const API_BASE_URL = 'http://192.168.0.220:8000/api';

// Types
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

// API Service Class
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Generic fetch method with error handling
  private async fetchWithErrorHandling<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // User endpoints
  async getUsers(): Promise<User[]> {
    return this.fetchWithErrorHandling<User[]>('/users');
  }

  async getUser(userId: number): Promise<User> {
    return this.fetchWithErrorHandling<User>(`/users/${userId}`);
  }

  // Reminder endpoints
  async getUserReminders(userId: number): Promise<Reminder[]> {
    return this.fetchWithErrorHandling<Reminder[]>(`/users/${userId}/reminders`);
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
    return this.fetchWithErrorHandling<Reminder>(`/users/${userId}/reminders`, {
      method: 'POST',
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
    return this.fetchWithErrorHandling<Reminder>(`/reminders/${reminderId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteReminder(reminderId: number): Promise<{ message: string }> {
    return this.fetchWithErrorHandling<{ message: string }>(`/reminders/${reminderId}`, {
      method: 'DELETE',
    });
  }

  // TTS History endpoints
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
    return this.fetchWithErrorHandling<{ message: string }>(`/users/${userId}/tts-history`, {
      method: 'POST',
      body: JSON.stringify(ttsData),
    });
  }

  async getTTSHistory(userId: number, limit: number = 10): Promise<TTSHistory[]> {
    return this.fetchWithErrorHandling<TTSHistory[]>(`/users/${userId}/tts-history?limit=${limit}`);
  }

  // User Settings endpoints
  async getUserSettings(userId: number): Promise<UserSetting[]> {
    return this.fetchWithErrorHandling<UserSetting[]>(`/users/${userId}/settings`);
  }

  async updateUserSetting(
    userId: number,
    settingName: string,
    settingValue: string
  ): Promise<{ message: string }> {
    return this.fetchWithErrorHandling<{ message: string }>(`/users/${userId}/settings`, {
      method: 'POST',
      body: JSON.stringify({
        setting_name: settingName,
        setting_value: settingValue,
      }),
    });
  }

  // Development endpoints
  async seedDatabase(): Promise<{ message: string }> {
    return this.fetchWithErrorHandling<{ message: string }>('/seed-data', {
      method: 'POST',
    });
  }

  // Health check
  async healthCheck(): Promise<{ message: string; status: string }> {
    return this.fetchWithErrorHandling<{ message: string; status: string }>('/health');
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export the class for testing
export default ApiService;
