import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface AccessAidLogoProps {
  size?: number;
  showText?: boolean;
  style?: any;
  animated?: boolean;
}

export const AccessAidLogo: React.FC<AccessAidLogoProps> = ({ 
  size = 60, 
  showText = true, 
  style,
  animated = false
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (animated) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [animated, pulseAnim]);

  const SoundWaves = () => (
    <View style={styles.soundWaves}>
      <View style={[styles.wave, styles.wave1]} />
      <View style={[styles.wave, styles.wave2]} />
      <View style={[styles.wave, styles.wave3]} />
    </View>
  );

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.logoContainer,
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#00D4AA', '#00BFA5', '#00ACC1']}
          style={[styles.gradient, { width: size, height: size, borderRadius: size / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.innerCircle}>
            <Text style={[styles.logoText, { fontSize: size * 0.35 }]}>A</Text>
            <SoundWaves />
          </View>
        </LinearGradient>
        
        {/* Glow effect */}
        <View style={[styles.glow, { width: size, height: size, borderRadius: size / 2 }]} />
      </Animated.View>
      
      {showText && (
        <Text 
          style={[styles.brandText, { fontSize: size * 0.22 }]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
        >
          ACCESSAID
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D4AA',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: '75%',
    height: '75%',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoText: {
    color: 'white',
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  soundWaves: {
    position: 'absolute',
    right: -8,
    top: '50%',
    transform: [{ translateY: -10 }],
    flexDirection: 'row',
    alignItems: 'center',
  },
  wave: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 2,
    borderRadius: 1,
  },
  wave1: {
    width: 2,
    height: 8,
  },
  wave2: {
    width: 2,
    height: 12,
  },
  wave3: {
    width: 2,
    height: 6,
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 212, 170, 0.3)',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 0,
  },
  brandText: {
    color: '#00D4AA',
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 212, 170, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flexShrink: 0,
  },
});