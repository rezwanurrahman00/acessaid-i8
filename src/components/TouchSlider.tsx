import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface TouchSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  levelLabels?: string[];
  unit?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 400;
const isPhone = screenHeight < 700;

// iOS-style proportions
const SLIDER_WIDTH_RATIO = 0.8; // 80% of container width
const THUMB_SIZE = isSmallScreen ? 20 : 22;
const TRACK_HEIGHT = 4;
const THUMB_SHADOW_RADIUS = 3;

export const TouchSlider: React.FC<TouchSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  levelLabels = [],
  unit = '%',
  accessibilityLabel,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const pan = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const thumbOpacity = useRef(new Animated.Value(1)).current;

  const sliderWidth = containerWidth * SLIDER_WIDTH_RATIO;
  const trackStartX = (containerWidth - sliderWidth) / 2;

  // Update position when value changes externally
  useEffect(() => {
    if (!isDragging && sliderWidth > 0) {
      const position = getPositionFromValue(value);
      pan.setValue(position);
    }
  }, [value, sliderWidth, isDragging]);

  const getValueFromPosition = (position: number) => {
    if (sliderWidth === 0) return min;
    const percentage = Math.max(0, Math.min(1, position / sliderWidth));
    const rawValue = min + percentage * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(min, Math.min(max, steppedValue));
  };

  const getPositionFromValue = (val: number) => {
    if (sliderWidth === 0) return 0;
    const percentage = (val - min) / (max - min);
    return percentage * sliderWidth;
  };

  const updateValue = (newValue: number) => {
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onValueChange(clampedValue);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (evt) => {
      if (disabled) return;
      
      setIsDragging(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Animate thumb scale and opacity
      Animated.parallel([
        Animated.spring(thumbScale, {
          toValue: 1.2,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
        Animated.timing(thumbOpacity, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const touchX = evt.nativeEvent.locationX;
      const newPosition = Math.max(0, Math.min(sliderWidth, touchX - trackStartX));
      const newValue = getValueFromPosition(newPosition);
      
      pan.setValue(newPosition);
      updateValue(newValue);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (disabled) return;
      
      const currentPosition = pan._value;
      const newPosition = Math.max(0, Math.min(sliderWidth, currentPosition + gestureState.dx));
      const newValue = getValueFromPosition(newPosition);
      
      pan.setValue(newPosition);
      updateValue(newValue);
    },
    onPanResponderRelease: () => {
      if (disabled) return;
      
      setIsDragging(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Animate thumb back to normal
      Animated.parallel([
        Animated.spring(thumbScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
        Animated.timing(thumbOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    },
  });

  const handleTrackPress = (evt: any) => {
    if (disabled) return;
    
    const touchX = evt.nativeEvent.locationX;
    const newPosition = Math.max(0, Math.min(sliderWidth, touchX - trackStartX));
    const newValue = getValueFromPosition(newPosition);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.spring(pan, {
      toValue: newPosition,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
    
    updateValue(newValue);
  };

  const progress = ((value - min) / (max - min)) * 100;

  return (
    <View 
      style={styles.container}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Slider Track Container */}
      <View style={styles.sliderContainer}>
        <TouchableOpacity
          style={[
            styles.track,
            { 
              width: sliderWidth,
              height: TRACK_HEIGHT,
              marginLeft: trackStartX,
            }
          ]}
          onPress={handleTrackPress}
          activeOpacity={1}
          disabled={disabled}
        >
          {/* Active Track - Using scaleX instead of width */}
          <Animated.View
            style={[
              styles.activeTrack,
              {
                transform: [
                  {
                    scaleX: pan.interpolate({
                      inputRange: [0, sliderWidth],
                      outputRange: [0, 1],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
          
          {/* Thumb - Using translateX instead of left */}
          <Animated.View
            style={[
              styles.thumb,
              {
                transform: [
                  {
                    translateX: pan.interpolate({
                      inputRange: [0, sliderWidth],
                      outputRange: [0, sliderWidth - THUMB_SIZE],
                      extrapolate: 'clamp',
                    }),
                  },
                  { scale: thumbScale },
                ],
                opacity: thumbOpacity,
              },
            ]}
            {...panResponder.panHandlers}
          />
        </TouchableOpacity>
      </View>

      {/* Level Labels */}
      {levelLabels.length > 0 && (
        <View style={[styles.labelsContainer, { marginLeft: trackStartX, marginRight: trackStartX }]}>
          {levelLabels.map((label, index) => (
            <Text key={index} style={styles.label}>
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  sliderContainer: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    marginBottom: 8,
  },
  track: {
    backgroundColor: '#E5E5EA',
    borderRadius: TRACK_HEIGHT / 2,
    position: 'relative',
    justifyContent: 'center',
  },
  activeTrack: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: TRACK_HEIGHT / 2,
    position: 'absolute',
    left: 0,
    // Set a fixed width that will be scaled
    width: '100%',
    transformOrigin: 'left',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: THUMB_SHADOW_RADIUS,
    elevation: 4,
    top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
    left: 0, // Fixed position, moved with translateX
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#8E8E93',
    fontWeight: '400',
    textAlign: 'center',
  },
});

export default TouchSlider;