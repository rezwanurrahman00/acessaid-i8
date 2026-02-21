import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

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
  onSlidingStart?: () => void;
  onSlidingComplete?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 400;

const SLIDER_WIDTH_RATIO = 0.8;
const THUMB_SIZE = isSmallScreen ? 20 : 22;
const TRACK_HEIGHT = 4;

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
  onSlidingStart,
  onSlidingComplete,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [localValue, setLocalValue] = useState(value);

  // Refs so responder callbacks never use stale closures
  const localValueRef = useRef(value);
  const containerWidthRef = useRef(0);
  const disabledRef = useRef(disabled);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const stepRef = useRef(step);
  const onValueChangeRef = useRef(onValueChange);
  const onSlidingStartRef = useRef(onSlidingStart);
  const onSlidingCompleteRef = useRef(onSlidingComplete);
  const isDraggingRef = useRef(false);

  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { minRef.current = min; }, [min]);
  useEffect(() => { maxRef.current = max; }, [max]);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { onValueChangeRef.current = onValueChange; }, [onValueChange]);
  useEffect(() => { onSlidingStartRef.current = onSlidingStart; }, [onSlidingStart]);
  useEffect(() => { onSlidingCompleteRef.current = onSlidingComplete; }, [onSlidingComplete]);

  // Only sync from prop when not dragging (avoids feedback loop during drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
      localValueRef.current = value;
    }
  }, [value]);

  const getSliderWidth = () => containerWidthRef.current * SLIDER_WIDTH_RATIO;
  const getTrackStartX = () => (containerWidthRef.current - getSliderWidth()) / 2;

  // Convert a raw locationX (relative to this container) into a stepped value
  const valueFromLocationX = (locationX: number): number => {
    const sw = getSliderWidth();
    if (sw === 0) return minRef.current;
    const posOnTrack = Math.max(0, Math.min(sw, locationX - getTrackStartX()));
    const raw = minRef.current + (posOnTrack / sw) * (maxRef.current - minRef.current);
    const stepped = Math.round(raw / stepRef.current) * stepRef.current;
    return Math.max(minRef.current, Math.min(maxRef.current, stepped));
  };

  const applyFromLocationX = (locationX: number) => {
    const newValue = valueFromLocationX(locationX);
    localValueRef.current = newValue;
    setLocalValue(newValue);
    onValueChangeRef.current(newValue);
  };

  // Render values
  const sliderWidth = containerWidth > 0 ? containerWidth * SLIDER_WIDTH_RATIO : 0;
  const trackStartX = containerWidth > 0 ? (containerWidth - sliderWidth) / 2 : 0;
  const filledWidth = sliderWidth > 0 ? ((localValue - min) / (max - min)) * sliderWidth : 0;
  const thumbLeft = trackStartX + Math.max(0, Math.min(sliderWidth - THUMB_SIZE, filledWidth - THUMB_SIZE / 2));

  return (
    <View
      style={styles.container}
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        containerWidthRef.current = w;
        setContainerWidth(w);
      }}
      // --- Responder setup ---
      // Capture on start so the parent ScrollView never gets a chance to claim the gesture
      onStartShouldSetResponder={() => !disabledRef.current}
      onStartShouldSetResponderCapture={() => !disabledRef.current}
      onMoveShouldSetResponder={() => !disabledRef.current}
      onMoveShouldSetResponderCapture={() => !disabledRef.current}
      onResponderTerminationRequest={() => false} // never give up the gesture mid-drag
      // --- Responder handlers ---
      onResponderGrant={(evt) => {
        if (disabledRef.current) return;
        isDraggingRef.current = true;
        onSlidingStartRef.current?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        applyFromLocationX(evt.nativeEvent.locationX);
      }}
      onResponderMove={(evt) => {
        if (disabledRef.current) return;
        // locationX is always relative to this container view — no delta tracking needed
        applyFromLocationX(evt.nativeEvent.locationX);
      }}
      onResponderRelease={() => {
        isDraggingRef.current = false;
        onSlidingCompleteRef.current?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      onResponderTerminate={() => {
        isDraggingRef.current = false;
        onSlidingCompleteRef.current?.();
      }}
    >
      <View style={styles.sliderContainer}>
        {/* Track */}
        <View
          style={[
            styles.track,
            { width: sliderWidth, height: TRACK_HEIGHT, marginLeft: trackStartX },
          ]}
        >
          <View style={[styles.activeTrack, { width: filledWidth }]} />
        </View>

        {/* Thumb — sibling of track so it isn't clipped by the track's bounds */}
        <View style={[styles.thumb, { left: thumbLeft }]} />
      </View>

      {levelLabels.length > 0 && (
        <View style={[styles.labelsContainer, { marginLeft: trackStartX, marginRight: trackStartX }]}>
          {levelLabels.map((label, index) => (
            <Text key={index} style={styles.label}>{label}</Text>
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
    justifyContent: 'center',
  },
  activeTrack: {
    position: 'absolute',
    left: 0,
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    top: 0,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
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
