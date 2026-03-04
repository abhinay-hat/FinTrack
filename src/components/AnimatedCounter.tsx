import React, { useEffect, useState, useCallback } from 'react';
import { Text, type TextStyle } from 'react-native';
import {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  style?: TextStyle;
  formatFn?: (n: number) => string;
}

function defaultFormat(n: number): string {
  // Indian number formatting (e.g., 1,23,456.78)
  const [intPart, decPart] = Math.abs(n).toFixed(2).split('.');
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const formatted =
    rest.length > 0
      ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
      : lastThree;
  // Drop trailing .00
  return decPart === '00' ? formatted : `${formatted}.${decPart}`;
}

export default function AnimatedCounter({
  value,
  duration = 1200,
  prefix = '\u20B9',
  style,
  formatFn,
}: AnimatedCounterProps) {
  const animatedValue = useSharedValue(0);
  const formatter = formatFn ?? defaultFormat;
  const [displayText, setDisplayText] = useState(`${prefix}${formatter(0)}`);

  const updateText = useCallback(
    (v: number) => {
      setDisplayText(`${prefix}${formatter(v)}`);
    },
    [prefix, formatter],
  );

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  useAnimatedReaction(
    () => animatedValue.value,
    (current) => {
      runOnJS(updateText)(current);
    },
  );

  return (
    <Text style={[{ fontFamily: 'DMMono_500Medium' }, style]}>
      {displayText}
    </Text>
  );
}
