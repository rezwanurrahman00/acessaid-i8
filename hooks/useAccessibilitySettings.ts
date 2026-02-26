import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { getAccessibilitySetting } from "@/services/ttsService";
import { useAppTheme } from "@/contexts/ThemeContext";

/**
 * Returns accessibility settings (highContrast, largeText, isDark) and a
 * fully-resolved `ui` color map.  Priority:  highContrast > dark > light.
 */
export function useAccessibilitySettings() {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText]       = useState(false);
  const { isDark } = useAppTheme();

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
      return () => { active = false; };
    }, [])
  );

  /** Scale a font/size value by 1.25× when Large Text is on */
  const scale = (n: number) => (largeText ? Math.round(n * 1.25) : n);

  // ── Light theme ────────────────────────────────────────────────────────────
  const light = {
    bg:                "#F5F5F5",
    cardBg:            "#FFFFFF",
    sectionBg:         "#FFFFFF",
    text:              "#333333",
    subtext:           "#666666",
    helperText:        "#666666",
    divider:           "#E0E0E0",
    border:            "transparent",
    accent:            "#4A90E2",
    success:           "#32CD32",
    warning:           "#F39C12",
    danger:            "#FF6B6B",
    switchTrackActive: "#81b0ff",
    switchTrackOff:    "#767577",
    switchThumbTrue:   "#f5dd4b",
    switchThumbOff:    "#f4f3f4",
    inputBg:           "#FFFFFF",
    inputBorder:       "#DDDDDD",
    inputText:         "#333333",
    headerHome:        "#4A90E2",
    headerReminders:   "#32CD32",
    headerSettings:    "#6C7B7F",
    headerProfile:     "#4A90E2",
  };

  // ── Dark theme ─────────────────────────────────────────────────────────────
  const dark = {
    bg:                "#0F172A",
    cardBg:            "#1E293B",
    sectionBg:         "#1E293B",
    text:              "#F1F5F9",
    subtext:           "#94A3B8",
    helperText:        "#94A3B8",
    divider:           "rgba(255,255,255,0.1)",
    border:            "rgba(255,255,255,0.15)",
    accent:            "#60A5FA",
    success:           "#34D399",
    warning:           "#FBBF24",
    danger:            "#F87171",
    switchTrackActive: "#3B82F6",
    switchTrackOff:    "#475569",
    switchThumbTrue:   "#DBEAFE",
    switchThumbOff:    "#64748B",
    inputBg:           "#111827",
    inputBorder:       "#334155",
    inputText:         "#F1F5F9",
    headerHome:        "#1E3A5F",
    headerReminders:   "#14532D",
    headerSettings:    "#1F2937",
    headerProfile:     "#1E3A5F",
  };

  // ── High contrast (pure black/white, overrides everything) ────────────────
  const hc = {
    bg:                "#000000",
    cardBg:            "#000000",
    sectionBg:         "#1A1A1A",
    text:              "#FFFFFF",
    subtext:           "#E6E6E6",
    helperText:        "#CCCCCC",
    divider:           "rgba(255,255,255,0.25)",
    border:            "#FFFFFF",
    accent:            "#FFD700",
    success:           "#00FF00",
    warning:           "#FFD700",
    danger:            "#FF4444",
    switchTrackActive: "#E6C200",
    switchTrackOff:    "#888888",
    switchThumbTrue:   "#000000",
    switchThumbOff:    "#CCCCCC",
    inputBg:           "#111111",
    inputBorder:       "#FFFFFF",
    inputText:         "#FFFFFF",
    headerHome:        "#000000",
    headerReminders:   "#000000",
    headerSettings:    "#000000",
    headerProfile:     "#000000",
  };

  const ui = highContrast ? hc : isDark ? dark : light;

  return { highContrast, largeText, isDark, scale, ui };
}
