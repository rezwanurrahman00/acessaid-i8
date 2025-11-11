import React from "react";
import { Tabs } from "expo-router";
import { TouchableOpacity } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { speakIfEnabled } from "@/services/ttsService"; // 🗣 import our talk feature

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // helper: each tab speaks its title when tapped
  const handleTabPress = (label: string) => {
    speakIfEnabled(`${label} tab`);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
          borderTopColor: "#ddd",
          height: 60,
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600",
          marginBottom: 3,
        },
      }}
    >
      {/* 🏠 HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <TouchableOpacity
              onPress={() => handleTabPress("Home")}
              activeOpacity={0.7}
            >
              <IconSymbol size={28} name="house.fill" color={color} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* 🔔 REMINDERS */}
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarIcon: ({ color }) => (
            <TouchableOpacity
              onPress={() => handleTabPress("Reminders")}
              activeOpacity={0.7}
            >
              <IconSymbol size={28} name="bell.fill" color={color} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* ⚙️ SETTINGS */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <TouchableOpacity
              onPress={() => handleTabPress("Settings")}
              activeOpacity={0.7}
            >
              <IconSymbol size={28} name="gear" color={color} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* 👤 PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <TouchableOpacity
              onPress={() => handleTabPress("Profile")}
              activeOpacity={0.7}
            >
              <IconSymbol size={28} name="person.circle" color={color} />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}

