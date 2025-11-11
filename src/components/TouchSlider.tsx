import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
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
  const [localValue, setLocalValue] = useState(value);
  const startPositionRef = useRef(0);

  const sliderWidth = containerWidth * SLIDER_WIDTH_RATIO;
  const trackStartX = (containerWidth - sliderWidth) / 2;

  // Update position when value changes externally
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  useEffect(() => {
    if (sliderWidth > 0) {
      startPositionRef.current = getPositionFromValue(localValue);
    }
  }, [sliderWidth, localValue]);

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
    setLocalValue(clampedValue);
    onValueChange(clampedValue);
  };

  const updateValueFromPosition = (position: number) => {
    const newValue = getValueFromPosition(position);
    updateValue(newValue);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onStartShouldSetPanResponderCapture: () => !disabled,
    onMoveShouldSetPanResponderCapture: () => !disabled,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      if (disabled) return;
      
      setIsDragging(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      startPositionRef.current = getPositionFromValue(localValue);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (disabled) return;

      const newPosition = Math.max(
        0,
        Math.min(sliderWidth, startPositionRef.current + gestureState.dx)
      );
      updateValueFromPosition(newPosition);
    },
    onPanResponderRelease: () => {
      if (disabled) return;
      
      setIsDragging(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      startPositionRef.current = getPositionFromValue(localValue);
    },
  });

  const handleTrackPress = (evt: any) => {
    if (disabled) return;
    if (sliderWidth <= 0) return;
    
    const touchX = evt.nativeEvent.locationX;
    const newPosition = Math.max(0, Math.min(sliderWidth, touchX));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    startPositionRef.current = newPosition;
    updateValueFromPosition(newPosition);
  };

  const progress = sliderWidth > 0 ? ((localValue - min) / (max - min)) * 100 : 0;
  const filledTrackWidth = (sliderWidth * progress) / 100;
  const thumbOffset = Math.max(0, Math.min(sliderWidth - THUMB_SIZE, filledTrackWidth - THUMB_SIZE / 2));

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
          <View
            style={[
              styles.activeTrack,
              {
                width: filledTrackWidth,
              },
            ]}
          />
          
          {/* Thumb - Using translateX instead of left */}
          <View
            style={[
              styles.thumb,
              {
                left: thumbOffset,
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