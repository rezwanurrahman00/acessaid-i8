import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Handles text-to-speech functionality
 * Reads the user’s toggle preference from AsyncStorage
 */

export const speakIfEnabled = async (text: string) => {
  try {
    const talkEnabled = await AsyncStorage.getItem("talkEnabled");

    if (talkEnabled === "true") {
      await Speech.speak(text, {
        language: "en",
        rate: 0.9,
      });
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
};

export const setTalkingPreference = async (enabled: boolean) => {
  try {
    await AsyncStorage.setItem("talkEnabled", enabled.toString());
  } catch (error) {
    console.error("Error saving talk preference:", error);
  }
};

export const getTalkingPreference = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem("talkEnabled");
    return value === "true";
  } catch (error) {
    console.error("Error reading talk preference:", error);
    return false;
  }
};
