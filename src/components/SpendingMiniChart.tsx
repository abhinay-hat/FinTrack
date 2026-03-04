import { View, Text } from 'react-native';
import { CartesianChart, Bar } from 'victory-native';
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

  // Transform data for CartesianChart: xKey needs to be numeric
  const chartData = data.map((d, i) => ({
    x: i,
    total: d.total,
    label: d.label,
  }));

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
      <View style={{ height: 160, paddingHorizontal: 8, paddingBottom: 8 }}>
        <CartesianChart
          data={chartData}
          xKey="x"
          yKeys={['total']}
          domainPadding={{ left: 20, right: 20, top: 10 }}
          axisOptions={{
            formatXLabel: (val) => {
              const idx = Math.round(val as number);
              return data[idx]?.label ?? '';
            },
            font: null,
            tickCount: { x: data.length, y: 0 },
            labelColor: colors.textSecondary.DEFAULT,
          }}
        >
          {({ points, chartBounds }) => (
            <Bar
              points={points.total}
              chartBounds={chartBounds}
              color={colors.teal.DEFAULT}
              roundedCorners={{ topLeft: 4, topRight: 4 }}
              innerPadding={0.3}
            />
          )}
        </CartesianChart>
      </View>
    </View>
  );
}
