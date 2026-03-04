import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/theme';
import { formatCurrency } from '@/utils/currency';

interface BudgetProgressRingProps {
  spent: number;
  limit: number;
  size?: number;
  strokeWidth?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return colors.danger.DEFAULT;
  if (percentage >= 60) return colors.amber;
  return colors.teal.DEFAULT;
}

export default function BudgetProgressRing({
  spent,
  limit,
  size = 120,
  strokeWidth = 10,
}: BudgetProgressRingProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const progressColor = getProgressColor(percentage);

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: percentage / 100,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [percentage, animatedValue]);

  // For the static fallback (Animated SVG props have limited native driver support)
  const strokeDashoffset = circumference * (1 - percentage / 100);

  return (
    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        {/* Center text */}
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 16,
              color: progressColor,
            }}
          >
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontFamily: 'DMMono_500Medium',
          fontSize: 14,
          color: colors.textPrimary.DEFAULT,
          marginTop: 8,
        }}
      >
        {formatCurrency(spent, true)} of {formatCurrency(limit, true)}
      </Text>
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 12,
          color: colors.textSecondary.DEFAULT,
          marginTop: 2,
        }}
      >
        spent this month
      </Text>
    </View>
  );
}
