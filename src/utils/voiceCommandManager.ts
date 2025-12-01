import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

// Conditional import for expo-speech-recognition (not available in Expo Go)
let ExpoSpeechRecognitionModule: any = null;
try {
  ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch (e) {
  console.log('⚠️ Voice recognition not available (Expo Go). Use development build for voice features.');
}

export interface VoiceCommand {
  keywords: string[];
  action: () => void;
  description: string;
  category: 'navigation' | 'accessibility' | 'reminder' | 'general';
}

export class VoiceCommandManager {
  private commands: VoiceCommand[] = [];
  private isListening = false;
  private currentScreen = 'login';
  private cooldownUntil = 0; // epoch ms to ignore triggers
  private cooldownMs = 1200; // default cooldown after screen change or speak
  private recognition: any = null;
  private recognizing = false;
  private listenersInitialized = false;

  setCurrentScreen(screen: string) {
    this.currentScreen = screen;
    this.cooldownUntil = Date.now() + this.cooldownMs;
  }

  addCommand(command: VoiceCommand) {
    this.commands.push(command);
  }

  removeCommand(keywords: string[]) {
    this.commands = this.commands.filter(cmd => 
      !cmd.keywords.some(keyword => keywords.includes(keyword))
    );
  }

  processVoiceInput(input: string): boolean {
    const now = Date.now();
    if (now < this.cooldownUntil) {
      return false; // ignore triggers during cooldown to prevent instant jumps
    }
    const normalizedInput = input.toLowerCase().trim();
    
    for (const cmd of this.commands) {
      const hasKeyword = cmd.keywords.some(keyword => 
        normalizedInput.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        cmd.action();
        this.cooldownUntil = Date.now() + this.cooldownMs;
        // Don't announce the command execution - let the action handle any speech
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return true;
      }
    }
  
    this.speak('Command not recognized. Try saying "help" for available commands.');
    return false;
  }

  speak(text: string, rate: number = 1.0) {
    try {
      Speech.stop();
    } catch {}
    try {
      const safeRate = Math.max(0.5, Math.min(rate, 2.0));
      Speech.speak(text, {
        rate: safeRate,
        pitch: 1.0,
        language: undefined,
      });
    } catch {}
    this.cooldownUntil = Date.now() + this.cooldownMs;
  }

  async startListening() {
    if (this.recognizing) {
      return;
    }
    
    // Check if voice recognition is available
    if (!ExpoSpeechRecognitionModule) {
      this.speak('Voice recognition is not available. Please use a development build to enable this feature.');
      return;
    }
    
    this.isListening = true;
    this.cooldownUntil = Date.now() + 500;

    if (Platform.OS === 'web') {
      this.startWebSpeechRecognition();
      return;
    }

    try {
      // Request permissions using the module's method
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!result.granted) {
        this.speak('Microphone permission is required for voice commands');
        return;
      }

      // Set up listeners only once
      if (!this.listenersInitialized) {

        ExpoSpeechRecognitionModule.addListener('start', () => {
          this.recognizing = true;
          this.speak('Listening');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        });

        ExpoSpeechRecognitionModule.addListener('end', () => {
          this.recognizing = false;
        });

        ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
          
          const transcript = event.results?.[0]?.transcript;
          const isFinal = event.isFinal;
          
          
          if (transcript && isFinal && this.isListening) {
            this.processVoiceInput(transcript);
          }
        });

        ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
          this.speak('Voice recognition error occurred');
          this.recognizing = false;
        });

        this.listenersInitialized = true;
      }

      // Start recognition
      const options = {
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        contextualStrings: [],
      };
      
      try {
        ExpoSpeechRecognitionModule.start(options);
      } catch (startError) {
        throw startError;
      }
      
    } catch (error) {
      this.speak('Unable to start voice recognition');
      this.recognizing = false;
      this.isListening = false;
    }
  }

  private startWebSpeechRecognition() {
    try {
      const SRWeb: any = 
        (global as any).webkitSpeechRecognition || 
        (global as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition || 
        (window as any).SpeechRecognition;
        
      if (SRWeb) {
        const rec = new SRWeb();
        rec.lang = 'en-US';
        rec.continuous = true;
        rec.interimResults = false;
        
        rec.onresult = (event: any) => {
          const last = event.results?.[event.results.length - 1];
          const text = last?.[0]?.transcript;
          if (text && this.isListening) {
            this.processVoiceInput(String(text));
          }
        };
        
        rec.onerror = (err: any) => {
        };
        
        rec.onend = () => { 
          this.recognizing = false; 
        };
        
        rec.start();
        this.recognition = rec;
        this.recognizing = true;
        this.speak('Listening');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        this.speak('Microphone not available on this device');
      }
    } catch (error) {
      this.speak('Unable to start listening');
    }
  }

  stopListening() {
    this.isListening = false;
    
    try {
      if (this.recognizing) {
        
        if (Platform.OS !== 'web') {
          ExpoSpeechRecognitionModule.stop();
        } else if (this.recognition) {
          this.recognition.stop();
        }
      }
    } catch (error) {
      console.log('VoiceCommandManager: Error stopping recognition:', error);
    }
    
    this.recognizing = false;
    this.recognition = null;
    this.speak('Stopped listening');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  isActive(): boolean {
    return this.isListening;
  }

  getAvailableCommands(): VoiceCommand[] {
    return this.commands;
  }

  getCommandsForScreen(screen: string): VoiceCommand[] {
    return this.commands.filter(cmd => 
      cmd.category === 'general' || 
      (screen === 'login' && cmd.category === 'navigation') ||
      (screen === 'setup' && cmd.category === 'accessibility') ||
      (screen === 'home' && ['navigation', 'accessibility', 'reminder'].includes(cmd.category)) ||
      (screen === 'reminders' && ['navigation', 'reminder'].includes(cmd.category)) ||
      (screen === 'profile' && ['navigation', 'accessibility'].includes(cmd.category))
    );
  }

  announceScreenChange(screen: string) {
    const screenNames: { [key: string]: string } = {
      'login': 'Login screen',
      'setup': 'Accessibility setup',
      'home': 'Home screen',
      'reminders': 'Reminders screen',
      'profile': 'Profile screen'
    };
    
    this.speak(`Now on ${screenNames[screen] || screen}`);
    this.setCurrentScreen(screen);
  }
}

// Global voice command manager
export const voiceManager = new VoiceCommandManager();
