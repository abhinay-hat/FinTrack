import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme';

interface AnimatedProgressBarProps {
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  height?: number;
  animated?: boolean;
}

const SPRING_CONFIG = { damping: 18, stiffness: 120 };

export default function AnimatedProgressBar({
  progress,
  color = colors.blueAccent.DEFAULT,
  backgroundColor = colors.divider,
  height = 8,
  animated = true,
}: AnimatedProgressBarProps) {
  const widthPercent = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(progress, 1));
    if (animated) {
      widthPercent.value = withSpring(clamped, SPRING_CONFIG);
    } else {
      widthPercent.value = withTiming(clamped, { duration: 0 });
    }
  }, [progress, animated]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthPercent.value * 100}%`,
  }));

  const borderRadius = height / 2;

  return (
    <View
      style={[
        styles.track,
        { backgroundColor, height, borderRadius },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, borderRadius },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
