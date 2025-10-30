import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AccessAid Text-to-Speech (TTS) Service
 * --------------------------------------
 * Unified control for all voice feedback in the app.
 * Works offline, remembers user preference,
 * and safely handles rapid speech calls.
 */

// Local cache to avoid repeated AsyncStorage reads
let cachedTalkEnabled: boolean | null = null;

/**
 * Safely speaks text if the Talking toggle is enabled.
 * Automatically cancels any ongoing speech before speaking again.
 */
export const speakIfEnabled = async (text: string) => {
  try {
    const talkEnabled =
      cachedTalkEnabled ?? (await AsyncStorage.getItem("talkEnabled")) === "true";

    if (!talkEnabled) return;

    // Stop any overlapping speech before starting new one
    if (Speech.isSpeakingAsync) {
      const currentlySpeaking = await Speech.isSpeakingAsync();
      if (currentlySpeaking) await Speech.stop();
    }

    await Speech.speak(text, {
      language: "en-US",
      rate: 0.95,
      pitch: 1.0,
      volume: 1.0,
    });
  } catch (error) {
    console.error("🔇 TTS Error:", error);
  }
};

/**
 * Stores the user’s text-to-speech preference in AsyncStorage.
 */

