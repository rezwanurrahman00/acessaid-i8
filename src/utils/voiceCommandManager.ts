import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

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
        this.speak(`Executing: ${cmd.description}`);
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

  startListening() {
    if (this.recognizing) return;
    this.isListening = true;
    this.cooldownUntil = Date.now() + 500; // brief guard
    try {
      // Try native (expo-speech-recognition) if available
      if (Platform.OS !== 'web') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const SR = require('expo-speech-recognition');
          const { start, stop, addListener, removeAllListeners, getPermissionsAsync, requestPermissionsAsync } = SR;
          (async () => {
            const perm = await getPermissionsAsync?.();
            if (!perm?.granted) {
              await requestPermissionsAsync?.();
            }
            removeAllListeners?.();
            addListener?.('onResult', (e: any) => {
              const text: string | undefined = e?.value?.[0];
              if (text && this.isListening) {
                this.processVoiceInput(text);
              }
            });
            addListener?.('onError', (_: any) => {});
            await start?.({ language: 'en-US', continuous: true, interimResults: false });
            this.recognition = { stop };
            this.recognizing = true;
            this.speak('Listening');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          })();
          return;
        } catch {}
      }
      // Web SpeechRecognition fallback
      const SRWeb: any = (global as any).webkitSpeechRecognition || (global as any).SpeechRecognition || (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
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
        rec.onerror = () => {};
        rec.onend = () => { this.recognizing = false; };
        rec.start();
        this.recognition = rec;
        this.recognizing = true;
        this.speak('Listening');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        this.speak('Microphone not available on this device');
      }
    } catch {
      this.speak('Unable to start listening');
    }
  }

  stopListening() {
    this.isListening = false;
    try {
      if (this.recognizing && this.recognition) {
        if (Platform.OS !== 'web') {
          this.recognition.stop?.();
        } else {
          this.recognition.stop?.();
        }
      }
    } catch {}
    this.recognizing = false;
    this.recognition = null;
    this.speak('Stopped listening');
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
