import { View, Text } from 'react-native';
import Svg, { Rect, Text as SvgText, Line as SvgLine } from 'react-native-svg';
import { colors } from '@/theme';
import { formatCurrency } from '@/utils';

export interface MonthlyComparison {
  label: string;
  income: number;
  expense: number;
}

interface IncomeExpenseChartProps {
  data: MonthlyComparison[];
  height?: number;
}

export default function IncomeExpenseChart({ data, height = 200 }: IncomeExpenseChartProps) {
  if (data.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary.DEFAULT }}>
          No data available
        </Text>
      </View>
    );
  }

  const PADDING_LEFT = 50;
  const PADDING_RIGHT = 16;
  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 36;
  const CHART_WIDTH = 340;
  const chartW = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartH = height - PADDING_TOP - PADDING_BOTTOM;

  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);

  const groupWidth = chartW / data.length;
  const barWidth = Math.min(groupWidth * 0.3, 20);
  const gap = 4;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    value: maxVal * frac,
    y: PADDING_TOP + chartH - frac * chartH,
  }));

  return (
    <View>
      <Svg width={CHART_WIDTH} height={height}>
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <SvgLine
            key={i}
            x1={PADDING_LEFT}
            y1={tick.y}
            x2={CHART_WIDTH - PADDING_RIGHT}
            y2={tick.y}
            stroke="#E2E8F0"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <SvgText
            key={`y-${i}`}
            x={PADDING_LEFT - 6}
            y={tick.y + 4}
            textAnchor="end"
            fill={colors.textSecondary.DEFAULT}
            fontSize={10}
            fontFamily="Inter_400Regular"
          >
            {formatCurrency(tick.value, true)}
          </SvgText>
        ))}

        {/* Bars */}
        {data.map((item, i) => {
          const groupCenter = PADDING_LEFT + groupWidth * i + groupWidth / 2;

          const incomeH = (item.income / maxVal) * chartH;
          const expenseH = (item.expense / maxVal) * chartH;

          return (
            <View key={i}>
              {/* Income bar */}
              <Rect
                x={groupCenter - barWidth - gap / 2}
                y={PADDING_TOP + chartH - incomeH}
                width={barWidth}
                height={Math.max(incomeH, 1)}
                rx={4}
                fill={colors.teal.DEFAULT}
              />
              {/* Expense bar */}
              <Rect
                x={groupCenter + gap / 2}
                y={PADDING_TOP + chartH - expenseH}
                width={barWidth}
                height={Math.max(expenseH, 1)}
                rx={4}
                fill={colors.danger.DEFAULT}
              />
              {/* X label */}
              <SvgText
                x={groupCenter}
                y={height - 8}
                textAnchor="middle"
                fill={colors.textSecondary.DEFAULT}
                fontSize={10}
                fontFamily="Inter_400Regular"
              >
                {item.label}
              </SvgText>
            </View>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.teal.DEFAULT }} />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary.DEFAULT }}>
            Income
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.danger.DEFAULT }} />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary.DEFAULT }}>
            Expense
          </Text>
        </View>
      </View>
    </View>
  );
}
