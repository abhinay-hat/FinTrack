import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Trash } from 'phosphor-react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
  threshold?: number;
}

const SPRING_CONFIG = { damping: 20, stiffness: 200 };

export default function SwipeToDelete({
  onDelete,
  children,
  threshold = 80,
}: SwipeToDeleteProps) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow swipe left (negative values)
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > threshold) {
        // Auto-complete: slide fully off screen then call delete
        translateX.value = withTiming(-400, { duration: 200 }, () => {
          runOnJS(onDelete)();
        });
      } else {
        // Spring back
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.abs(translateX.value) / threshold, 1),
  }));

  return (
    <View style={styles.container}>
      {/* Red background panel */}
      <Animated.View style={[styles.deletePanel, deleteStyle]}>
        <Trash size={24} color="#FFFFFF" weight="bold" />
      </Animated.View>

      {/* Swipeable content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={contentStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  deletePanel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 24,
  },
});
