import { View, Text } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { formatCurrency } from '@/utils';
import { colors } from '@/theme';

export interface CategorySlice {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

interface CategoryDonutChartProps {
  data: CategorySlice[];
  totalAmount: number;
  size?: number;
  strokeWidth?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function CategoryDonutChart({
  data,
  totalAmount,
  size = 200,
  strokeWidth = 28,
}: CategoryDonutChartProps) {
  const animProgress = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    animProgress.setValue(0);
    const listener = animProgress.addListener(({ value }) => setProgress(value));
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animProgress.removeListener(listener);
  }, [data, animProgress]);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;

  let currentAngle = 0;
  const arcs = data.map((slice) => {
    const sweepAngle = (slice.percentage / 100) * 360 * progress;
    const startAngle = currentAngle;
    currentAngle += sweepAngle;
    return {
      ...slice,
      startAngle,
      endAngle: startAngle + sweepAngle,
    };
  });

  return (
    <View>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#F0F4F8"
              strokeWidth={strokeWidth}
            />
            <G>
              {arcs.map((arc, i) => {
                if (arc.endAngle - arc.startAngle < 0.5) return null;
                const sweep = arc.endAngle - arc.startAngle;
                // For near-full circle, clamp to avoid rendering artifact
                const clampedSweep = Math.min(sweep, 359.99);
                const path = describeArc(cx, cy, radius, arc.startAngle, arc.startAngle + clampedSweep);
                return (
                  <Path
                    key={i}
                    d={path}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                );
              })}
            </G>
          </Svg>
          {/* Center label */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 11,
                color: colors.textSecondary.DEFAULT,
              }}
            >
              Total
            </Text>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 18,
                color: colors.textPrimary.DEFAULT,
                marginTop: 2,
              }}
            >
              {formatCurrency(totalAmount, true)}
            </Text>
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={{ marginTop: 16, gap: 8 }}>
        {data.map((slice, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: slice.color,
                marginRight: 8,
              }}
            />
            <Text
              style={{
                flex: 1,
                fontFamily: 'Inter_400Regular',
                fontSize: 13,
                color: colors.textPrimary.DEFAULT,
              }}
              numberOfLines={1}
            >
              {slice.name}
            </Text>
            <Text
              style={{
                fontFamily: 'DMMono_500Medium',
                fontSize: 13,
                color: colors.textPrimary.DEFAULT,
                marginRight: 8,
              }}
            >
              {formatCurrency(slice.amount, true)}
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                color: colors.textSecondary.DEFAULT,
                width: 40,
                textAlign: 'right',
              }}
            >
              {slice.percentage.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
