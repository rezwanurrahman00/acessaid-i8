import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface ModernCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'gradient' | 'elevated' | 'outlined';
  style?: ViewStyle;
  hapticFeedback?: boolean;
  accessibilityLabel?: string;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  onPress,
  variant = 'default',
  style,
  hapticFeedback = true,
  accessibilityLabel,
}) => {
  const handlePress = () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const getCardStyle = () => {
    const baseStyle = [styles.card];
    
    switch (variant) {
      case 'gradient':
        return [...baseStyle, styles.gradientCard];
      case 'elevated':
        return [...baseStyle, styles.elevatedCard];
      case 'outlined':
        return [...baseStyle, styles.outlinedCard];
      default:
        return [...baseStyle, styles.defaultCard];
    }
  };

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        style={[getCardStyle(), style]}
        onPress={onPress ? handlePress : undefined}
        disabled={!onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={onPress ? 'button' : 'none'}
      >
        <LinearGradient
          colors={['#4A90E2', '#357ABD']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {children}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        style={[getCardStyle(), style]}
        onPress={handlePress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  defaultCard: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientCard: {
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  elevatedCard: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  outlinedCard: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  gradient: {
    padding: 20,
  },
});
