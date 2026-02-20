import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { getAccessibilitySetting } from "@/services/ttsService";

/**
 * Reads highContrast and largeText from AsyncStorage every time
 * the screen comes into focus. Returns a scale() helper and a ui
 * color map so every tab renders consistently with the user's
 * visual accessibility preferences.
 */
export function useAccessibilitySettings() {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const hc = await getAccessibilitySetting("highContrast");
        const lt = await getAccessibilitySetting("largeText");
        if (active) {
          setHighContrast(hc);
          setLargeText(lt);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  /** Scale a font/size value by 1.25× when Large Text is on */
  const scale = (n: number) => (largeText ? Math.round(n * 1.25) : n);

  /**
   * Semantic color tokens that flip between normal and high-contrast
   * values. Use these instead of hardcoded hex strings.
   */
  const ui = {
    bg:               highContrast ? "#000000" : "#f5f5f5",
    cardBg:           highContrast ? "#000000" : "#FFFFFF",
    sectionBg:        highContrast ? "#1A1A1A" : "#FFFFFF",
    text:             highContrast ? "#FFFFFF" : "#333333",
    subtext:          highContrast ? "#E6E6E6" : "#666666",
    helperText:       highContrast ? "#CCCCCC" : "#666666",
    divider:          highContrast ? "rgba(255,255,255,0.25)" : "#E0E0E0",
    border:           highContrast ? "#FFFFFF" : "transparent",
    // Accents
    accent:           highContrast ? "#FFD700" : "#4A90E2",   // blue → gold
    success:          highContrast ? "#00FF00" : "#32CD32",   // green stays readable
    warning:          highContrast ? "#FFD700" : "#F39C12",   // orange → gold
    danger:           highContrast ? "#FF4444" : "#FF6B6B",
    // Switches
    switchTrackActive: highContrast ? "#E6C200" : "#81b0ff",
    switchTrackOff:    highContrast ? "#888888" : "#767577",
    switchThumbTrue:   highContrast ? "#000000" : "#f5dd4b",
    switchThumbOff:    highContrast ? "#CCCCCC" : "#f4f3f4",
    // Inputs
    inputBg:          highContrast ? "#111111" : "#FFFFFF",
    inputBorder:      highContrast ? "#FFFFFF" : "#ddd",
    inputText:        highContrast ? "#FFFFFF" : "#333333",
    // Header colours per screen
    headerHome:       highContrast ? "#000000" : "#4A90E2",
    headerReminders:  highContrast ? "#000000" : "#32CD32",
    headerSettings:   highContrast ? "#000000" : "#6C7B7F",
    headerProfile:    highContrast ? "#000000" : "#4A90E2",
  };

  return { highContrast, largeText, scale, ui };
}
