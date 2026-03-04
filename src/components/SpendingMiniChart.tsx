import { View, Text } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '@/theme';

export interface DailySpending {
  day: string;
  label: string;
  total: number;
}

interface SpendingMiniChartProps {
  data: DailySpending[];
}

export default function SpendingMiniChart({ data }: SpendingMiniChartProps) {
  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <View className="mx-4 mt-4 items-center py-8" style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}>
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 14,
            color: colors.textSecondary.DEFAULT,
          }}
        >
          No spending data for this period
        </Text>
      </View>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  const chartWidth = 320;
  const chartHeight = 120;
  const labelHeight = 20;
  const barPadding = 8;
  const barCount = data.length;
  const barWidth = (chartWidth - barPadding * (barCount + 1)) / barCount;

  return (
    <View
      className="mx-4 mt-4"
      style={{ backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden' }}
    >
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 17,
          color: colors.textPrimary.DEFAULT,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
        }}
      >
        Spending This Week
      </Text>
      <View style={{ height: 160, paddingHorizontal: 8, paddingBottom: 8, alignItems: 'center' }}>
        <Svg width={chartWidth} height={chartHeight + labelHeight} viewBox={`0 0 ${chartWidth} ${chartHeight + labelHeight}`}>
          {data.map((d, i) => {
            const barHeight = maxTotal > 0 ? (d.total / maxTotal) * (chartHeight - 8) : 0;
            const x = barPadding + i * (barWidth + barPadding);
            const y = chartHeight - barHeight;
            const radius = 4;

            return (
              <Rect
                key={d.day}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 0)}
                rx={radius}
                ry={radius}
                fill={colors.teal.DEFAULT}
              />
            );
          })}
          {data.map((d, i) => {
            const x = barPadding + i * (barWidth + barPadding) + barWidth / 2;
            return (
              <SvgText
                key={`label-${d.day}`}
                x={x}
                y={chartHeight + labelHeight - 2}
                textAnchor="middle"
                fontSize={11}
                fill={colors.textSecondary.DEFAULT}
              >
                {d.label}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}
