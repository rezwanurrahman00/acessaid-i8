import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AccessAid Text-to-Speech (TTS) Service
 * --------------------------------------
 * Unified control for all voice feedback in the app.
 * Works offline, remembers user preference,
 * and safely handles rapid speech calls.
 */

// Local cache to reduce AsyncStorage reads
let cachedTalkEnabled: boolean | null = null;

/**
 * Safely speaks text if the Talking toggle is enabled.
 * Automatically cancels any ongoing speech before speaking again.
 */
export const speakIfEnabled = async (text: string) => {
  try {
    const talkEnabled =
      cachedTalkEnabled ??
      ((await AsyncStorage.getItem("talkEnabled")) === "true");

    if (!talkEnabled) return;

    // Stop any overlapping speech
    const currentlySpeaking = await Speech.isSpeakingAsync();
    if (currentlySpeaking) await Speech.stop();

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
export const setTalkingPreference = async (enabled: boolean) => {
  try {
    cachedTalkEnabled = enabled;
    await AsyncStorage.setItem("talkEnabled", enabled ? "true" : "false");
    console.log("🟢 Talking preference saved:", enabled);
  } catch (error) {
    console.error("Error saving talking preference:", error);
  }
};

/**
 * Retrieves the stored TTS preference.
 */
export const getTalkingPreference = async (): Promise<boolean> => {
  try {
    if (cachedTalkEnabled !== null) return cachedTalkEnabled;
    const value = await AsyncStorage.getItem("talkEnabled");
    cachedTalkEnabled = value === "true";
    return cachedTalkEnabled;
  } catch (error) {
    console.error("Error reading talking preference:", error);
    return false;
  }
};

/**
 * Immediately stops any ongoing speech.
 */
export const stopSpeech = async () => {
  try {
    const currentlySpeaking = await Speech.isSpeakingAsync();
    if (currentlySpeaking) await Speech.stop();
  } catch (error) {
    console.error("Error stopping speech:", error);
  }
};


