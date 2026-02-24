import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useApp } from '../contexts/AppContext';
import { getThemeConfig } from '../../constants/theme';
import { RootStackParamList, MainTabParamList } from '../types';
import SOSButton from '../components/SOSButton';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Screen imports
import LoginScreen from '../screens/LoginScreen';
import AccessibilitySetupScreen from '../screens/AccessibilitySetupScreen';
import HomeScreen from '../screens/HomeScreen';
import ReminderScreen from '../screens/ReminderScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const { state } = useApp();
  const theme = useMemo(() => getThemeConfig(state.accessibilitySettings.isDarkMode), [state.accessibilitySettings.isDarkMode]);

  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Reminders') {
            iconName = focused ? 'alarm' : 'alarm-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.cardBackground,
          borderTopWidth: 1,
          borderTopColor: theme.cardBorder,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
      screenListeners={({ route, navigation }) => ({
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Announce tab name when switching TO this tab (not when re-pressing the active tab)
          if (state.voiceAnnouncementsEnabled && !navigation.isFocused()) {
            try { Speech.stop(); } catch {}
            try { Speech.speak(route.name); } catch {}
          }
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home screen',
        }}
      />
      <Tab.Screen 
        name="Reminders" 
        component={ReminderScreen}
        options={{
          title: 'Reminders',
          tabBarAccessibilityLabel: 'Reminders screen',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile screen',
        }}
      />
    </Tab.Navigator>
    <SOSButton />
    </View>
  );
};

const AppNavigator = () => {
  const { state } = useApp();

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
        }}
      >
        {!state.isLoggedIn ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              title: 'AccessAid Login',
            }}
          />
        ) : !state.hasCompletedSetup ? (
          <Stack.Screen 
            name="AccessibilitySetup" 
            component={AccessibilitySetupScreen}
            options={{
              title: 'Accessibility Setup',
              gestureEnabled: false,
            }}
          />
        ) : (
          <Stack.Screen 
            name="Main" 
            component={MainTabNavigator}
            options={{
              title: 'AccessAid',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
